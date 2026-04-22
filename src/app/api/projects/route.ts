import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { titleFromIdea } from "@/lib/projects/projectMapping";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

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

export async function GET(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("projects")
    .select("id,title,idea,status,progress,video_url,created_at")
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

  let body: { idea?: string };
  try {
    body = (await req.json()) as { idea?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idea = body.idea?.trim();
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
      status: "generating",
      progress: 8,
    })
    .select("id,title,idea,status,progress,video_url,created_at")
    .single();

  if (projectErr || !project) {
    return NextResponse.json(
      { error: projectErr?.message ?? "Failed to create project" },
      { status: 400 },
    );
  }

  await admin.from("generations").insert(
    pipelineSteps.map((step, index) => ({
      project_id: project.id,
      step,
      status: index === 0 ? "processing" : "pending",
    })),
  );

  await admin
    .from("profiles")
    .update({ monthly_usage_count: used + 1 })
    .eq("id", user.id);

  return NextResponse.json({ project }, { status: 201 });
}
