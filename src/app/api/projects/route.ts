import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { titleFromIdea } from "@/lib/projects/projectMapping";
import { runRealProjectGeneration } from "@/lib/ai/openAiGeneration";
import { syncUserGeneratingProjects } from "@/lib/projects/generationRunner";
import type { CreativeControls } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const projectSelect =
  "id,title,idea,creative_controls,status,progress,video_url,created_at,generations(step,status,output,updated_at)";

const pipelineSteps = [
  "hook",
  "script",
  "scenes",
  "image_prompts",
  "voice",
  "captions",
  "render_prep",
  "render",
] as const;

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

function normalizeCreativeControls(value: unknown): CreativeControls | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const controls = value as Record<string, unknown>;
  const stringValue = (key: string, fallback: string) => {
    const raw = controls[key];
    return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 120) : fallback;
  };

  const effects = Array.isArray(controls.effects)
    ? controls.effects
        .map((effect) => (typeof effect === "string" ? effect.trim().slice(0, 80) : ""))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const exampleScript =
    typeof controls.exampleScript === "string" && controls.exampleScript.trim()
      ? controls.exampleScript.trim().slice(0, 1000)
      : undefined;

  return {
    niche: stringValue("niche", "Storytelling"),
    language: stringValue("language", "English"),
    voiceStyle: stringValue("voiceStyle", "Narration"),
    artStyle: stringValue("artStyle", "Modern Cartoon"),
    captionStyle: stringValue("captionStyle", "Bold Stroke"),
    effects,
    exampleScript,
  };
}

export async function GET(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  try {
    await syncUserGeneratingProjects(admin, user.id);
  } catch {
    // The list should still load even if a progress sync attempt fails.
  }

  const { data, error } = await admin
    .from("projects")
    .select(projectSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { idea?: string; creativeControls?: unknown };
  try {
    body = (await req.json()) as { idea?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idea = body.idea?.trim();
  const creativeControls = normalizeCreativeControls(body.creativeControls);
  if (!idea) {
    return NextResponse.json({ error: "Describe your video idea first." }, { status: 400 });
  }
  if (idea.length > 500) {
    return NextResponse.json({ error: "Video idea must be 500 characters or less." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("monthly_usage_count,usage_limit")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: profileErr?.message ?? "Profile not found" },
      { status: 400 },
    );
  }

  const used = Number(profile.monthly_usage_count ?? 0);
  const limit = Number(profile.usage_limit ?? 5);
  if (used >= limit) {
    return NextResponse.json(
      { error: "Monthly video limit reached. Upgrade or wait for the next cycle." },
      { status: 402 },
    );
  }

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .insert({
      user_id: user.id,
      title: titleFromIdea(idea),
      idea,
      creative_controls: creativeControls,
      status: "generating",
      progress: 8,
    })
    .select("id,user_id,title,idea,creative_controls,status,progress,video_url,created_at")
    .single();

  if (projectErr || !project) {
    return NextResponse.json(
      { error: projectErr?.message ?? "Failed to create project" },
      { status: 400 },
    );
  }

  const { error: generationErr } = await admin.from("generations").insert(
    pipelineSteps.map((step, index) => ({
      project_id: project.id,
      step,
      status: index === 0 ? "processing" : "pending",
    })),
  );

  if (generationErr) {
    await admin
      .from("projects")
      .update({ status: "failed", progress: 1 })
      .eq("id", project.id);
    return NextResponse.json({ error: generationErr.message }, { status: 400 });
  }

  await admin
    .from("profiles")
    .update({ monthly_usage_count: used + 1 })
    .eq("id", user.id);

  if (process.env.OPENAI_API_KEY && process.env.HERMIORA_REAL_GENERATION !== "off") {
    try {
      await runRealProjectGeneration(admin, project);
    } catch {
      // The project row records the failed AI generation state for the UI.
    }
  }

  const { data: freshProject, error: freshErr } = await admin
    .from("projects")
    .select(projectSelect)
    .eq("id", project.id)
    .eq("user_id", user.id)
    .single();

  if (freshErr || !freshProject) {
    return NextResponse.json({ project }, { status: 201 });
  }

  return NextResponse.json({ project: freshProject }, { status: 201 });
}
