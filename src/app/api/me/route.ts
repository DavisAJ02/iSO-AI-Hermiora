import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Consolidated signed-in snapshot: Supabase Auth user + `profiles` row + active subscription (if any).
 * Bearer or cookie session — same pattern as payment route handlers.
 */
export async function GET(req: Request) {
  const auth =
    req.headers.get("Authorization") ?? req.headers.get("authorization") ?? undefined;
  const supabase = createClient(await cookies(), auth);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id, name, avatar_url, plan, monthly_usage_count, usage_limit, onboarding_completed, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  const { data: subscriptionRows, error: subErr } = await supabase
    .from("subscriptions")
    .select("id, plan, status, provider, starts_at, expires_at, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 400 });
  }

  const subscription = subscriptionRows?.[0] ?? null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    subscription,
  });
}
