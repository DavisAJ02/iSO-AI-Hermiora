import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureProjectGenerationOutputs,
  syncProjectGeneration,
} from "@/lib/projects/generationRunner";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const projectSelect =
  "id,title,idea,status,progress,video_url,created_at,generations(step,status,output,updated_at)";

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: project, error } = await admin
    .from("projects")
    .select("id,title,idea,status,progress,created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

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

  const { data: freshProject, error: freshErr } = await admin
    .from("projects")
    .select(projectSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (freshErr || !freshProject) {
    return NextResponse.json(
      { error: freshErr?.message ?? "Project not found" },
      { status: freshErr ? 400 : 404 },
    );
  }

  return NextResponse.json({ project: freshProject });
}
