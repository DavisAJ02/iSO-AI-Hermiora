import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DEFAULT_CREATIVE_CONTROLS,
  normalizeCreativeControls,
} from "@/lib/projects/creativeControls";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

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

async function getSeriesId(ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  return decodeURIComponent(rawId ?? "").trim();
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getSeriesId(ctx);
  if (!id) {
    return NextResponse.json({ error: "Series id is required." }, { status: 400 });
  }

  let body: {
    title?: string;
    description?: string | null;
    continuityMode?: boolean;
    storyBible?: string | null;
    defaultCreativeControls?: unknown;
  };
  try {
    body = (await req.json()) as {
      title?: string;
      description?: string | null;
      continuityMode?: boolean;
      storyBible?: string | null;
      defaultCreativeControls?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, 80);
    if (!title) {
      return NextResponse.json({ error: "Series title is required." }, { status: 400 });
    }
    updates.title = title;
  }

  if (body.description !== undefined) {
    updates.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 280)
        : null;
  }

  if (body.continuityMode !== undefined) {
    updates.continuity_mode = body.continuityMode === true;
  }

  if (body.storyBible !== undefined) {
    updates.story_bible =
      typeof body.storyBible === "string" && body.storyBible.trim()
        ? body.storyBible.trim().slice(0, 2000)
        : null;
  }

  if (body.defaultCreativeControls !== undefined) {
    updates.default_creative_controls = normalizeCreativeControls(
      body.defaultCreativeControls,
      DEFAULT_CREATIVE_CONTROLS,
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No series updates were provided." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("series")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,title,description,continuity_mode,story_bible,default_creative_controls,created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Series could not be updated." },
      { status: 400 },
    );
  }

  return NextResponse.json({ series: data });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await getSeriesId(ctx);
  if (!id) {
    return NextResponse.json({ error: "Series id is required." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("series")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
