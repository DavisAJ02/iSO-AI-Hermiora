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

export async function GET(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("series")
    .select("id,title,description,default_creative_controls,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ series: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getSignedInUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string | null;
    defaultCreativeControls?: unknown;
  };
  try {
    body = (await req.json()) as {
      title?: string;
      description?: string | null;
      defaultCreativeControls?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim().slice(0, 80);
  if (!title) {
    return NextResponse.json({ error: "Series title is required." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 280)
      : null;

  const defaultCreativeControls = normalizeCreativeControls(
    body.defaultCreativeControls,
    DEFAULT_CREATIVE_CONTROLS,
  );

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("series")
    .insert({
      user_id: user.id,
      title,
      description,
      default_creative_controls: defaultCreativeControls,
    })
    .select("id,title,description,default_creative_controls,created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Series could not be created." },
      { status: 400 },
    );
  }

  return NextResponse.json({ series: data }, { status: 201 });
}
