import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = createClient(await cookies());
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
