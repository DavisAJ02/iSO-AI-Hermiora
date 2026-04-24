import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { aiConfig } from "@/lib/ai/config";
import {
  ensureProjectGenerationOutputs,
  syncProjectGeneration,
} from "@/lib/projects/generationRunner";
import { saveProjectImages } from "@/lib/ai/openAiImages";
import { saveProjectVoice } from "@/lib/ai/elevenLabsVoice";
import { runRealProjectGeneration } from "@/lib/ai/openAiGeneration";
import { PIPELINE_STEPS } from "@/lib/constants";
import { hydrateProjectMediaUrls } from "@/lib/projects/projectMedia";
import { titleFromIdea } from "@/lib/projects/projectMapping";
import { loadSeriesContinuityContext } from "@/lib/projects/seriesContinuity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const projectSelect =
  "id,title,idea,creative_controls,series_id,series(title),status,progress,video_url,created_at,generations(step,status,output,updated_at)";

function getAuthHeader(req: Request): string | null {
  return req.headers.get("Authorization") ?? req.headers.get("authorization");
}

async function getSignedInUser(req: Request) {
  const supabase = createClient(await cookies(), getAuthHeader(req));
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function getProjectId(ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  return decodeURIComponent(rawId ?? "").trim();
}

async function getOwnedProject(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  id: string,
  userId: string,
) {
  return admin
    .from("projects")
    .select("id,user_id,title,idea,creative_controls,series_id,status,progress,created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
}

async function getFreshProject(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  id: string,
  userId: string,
) {
  return admin
    .from("projects")
    .select(projectSelect)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getProjectId(ctx);
  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: project, error } = await getOwnedProject(admin, id, user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    await syncProjectGeneration(admin, project);
    await ensureProjectGenerationOutputs(admin, project);
  } catch {
    // The detail screen can still render the project row if output enrichment fails.
  }

  const { data: freshProject, error: freshErr } = await getFreshProject(
    admin,
    id,
    user.id,
  );

  if (freshErr || !freshProject) {
    return NextResponse.json(
      { error: freshErr?.message ?? "Project not found" },
      { status: freshErr ? 400 : 404 },
    );
  }

  const hydratedProject = await hydrateProjectMediaUrls(admin, freshProject);
  return NextResponse.json({ project: hydratedProject });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getProjectId(ctx);
  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: project, error } = await getOwnedProject(admin, id, user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const timestamp = new Date().toISOString();

  if (body.action === "publish") {
    if (project.status === "generating") {
      return NextResponse.json(
        { error: "Wait until generation is complete before publishing." },
        { status: 409 },
      );
    }
    if (project.status === "failed" || project.status === "draft") {
      return NextResponse.json(
        { error: "Only ready projects can be published." },
        { status: 409 },
      );
    }

    await ensureProjectGenerationOutputs(admin, {
      ...project,
      status: "ready",
      progress: 100,
    });
    const { error: updateErr } = await admin
      .from("projects")
      .update({ status: "published", progress: 100, updated_at: timestamp })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
  } else if (body.action === "unpublish") {
    if (project.status !== "published") {
      return NextResponse.json(
        { error: "Only published projects can be unpublished." },
        { status: 409 },
      );
    }
    const { error: updateErr } = await admin
      .from("projects")
      .update({ status: "ready", progress: 100, updated_at: timestamp })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
  } else if (body.action === "duplicate") {
    const idea = project.idea?.trim() || project.title?.trim() || "Untitled video";
    const title = `${project.title?.trim() || titleFromIdea(idea)} copy`;
    const { data: copy, error: copyErr } = await admin
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        idea,
        creative_controls: project.creative_controls ?? null,
        series_id: project.series_id ?? null,
        status: "draft",
        progress: 0,
      })
      .select("id")
      .single();

    if (copyErr || !copy) {
      return NextResponse.json(
        { error: copyErr?.message ?? "Project could not be duplicated." },
        { status: 400 },
      );
    }

    const { error: stepsErr } = await admin.from("generations").insert(
      PIPELINE_STEPS.map((step) => ({
        project_id: copy.id,
        step: step.id,
        status: "pending",
      })),
    );
    if (stepsErr) {
      return NextResponse.json({ error: stepsErr.message }, { status: 400 });
    }

    const { data: freshCopy, error: freshCopyErr } = await getFreshProject(
      admin,
      copy.id,
      user.id,
    );
    if (freshCopyErr || !freshCopy) {
      return NextResponse.json(
        { error: freshCopyErr?.message ?? "Project could not be duplicated." },
        { status: 400 },
      );
    }

    return NextResponse.json({ project: freshCopy, duplicated: true });
  } else if (body.action === "generate_ai") {
    if (!project.idea?.trim() && !project.title?.trim()) {
      return NextResponse.json(
        { error: "Project needs an idea or title before AI generation." },
        { status: 409 },
      );
    }
    if (!aiConfig.openai.apiKey && !aiConfig.huggingface.apiKey) {
      return NextResponse.json(
        { error: "No script generation provider is configured." },
        { status: 500 },
      );
    }
    try {
      const seriesContext = project.series_id
        ? await loadSeriesContinuityContext(admin, user.id, project.series_id, project.id)
        : null;
      await runRealProjectGeneration(admin, {
        ...project,
        series_context: seriesContext?.contextText ?? null,
      });
    } catch (generationErr) {
      return NextResponse.json(
        {
          error:
            generationErr instanceof Error
              ? generationErr.message
              : "AI generation failed.",
        },
        { status: 502 },
      );
    }
  } else if (body.action === "generate_images" || body.action === "generate_voice") {
    const { data: projectWithGenerations, error: projectWithGenerationsErr } = await admin
      .from("projects")
      .select(`user_id,${projectSelect}`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (projectWithGenerationsErr || !projectWithGenerations) {
      return NextResponse.json(
        { error: projectWithGenerationsErr?.message ?? "Project not found" },
        { status: projectWithGenerationsErr ? 400 : 404 },
      );
    }

    if (body.action === "generate_images") {
      try {
        await saveProjectImages(admin, projectWithGenerations);
      } catch (imageErr) {
        return NextResponse.json(
          {
            error:
              imageErr instanceof Error
                ? imageErr.message
                : "Image generation failed.",
          },
          { status: 502 },
        );
      }
    } else {
      try {
        await saveProjectVoice(admin, projectWithGenerations);
      } catch (voiceErr) {
        return NextResponse.json(
          {
            error:
              voiceErr instanceof Error
                ? voiceErr.message
                : "Voice generation failed.",
          },
          { status: 502 },
        );
      }
    }
  } else {
    return NextResponse.json({ error: "Unsupported project action." }, { status: 400 });
  }

  const { data: freshProject, error: freshErr } = await getFreshProject(
    admin,
    id,
    user.id,
  );

  if (freshErr || !freshProject) {
    return NextResponse.json(
      { error: freshErr?.message ?? "Project not found" },
      { status: freshErr ? 400 : 404 },
    );
  }

  const hydratedProject = await hydrateProjectMediaUrls(admin, freshProject);
  return NextResponse.json({ project: hydratedProject });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getProjectId(ctx);
  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
