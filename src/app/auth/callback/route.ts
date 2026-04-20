import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function redirectToSignIn(origin: string, errorCode: string, next: string) {
  const u = new URL("/auth/sign-in", origin);
  u.searchParams.set("error", errorCode);
  u.searchParams.set("next", safeNextPath(next));
  return NextResponse.redirect(u);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  const providerError = url.searchParams.get("error");
  const providerDesc = url.searchParams.get("error_description");
  if (providerError || providerDesc) {
    return redirectToSignIn(url.origin, "oauth", next);
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return redirectToSignIn(url.origin, "session", next);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
