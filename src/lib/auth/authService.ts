import type { User, Session, AuthError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

function getBrowserOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function authCallbackUrl(nextPath = "/"): string {
  const origin = getBrowserOrigin();
  const n = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  return `${origin}/auth/callback?next=${encodeURIComponent(n)}`;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string,
): Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }> {
  const supabase = createClient();
  const trimmed = fullName.trim();
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: trimmed,
        full_name: trimmed,
      },
      emailRedirectTo: authCallbackUrl("/"),
    },
  });
}

export async function sendPasswordReset(email: string): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${getBrowserOrigin()}/auth/callback?next=${encodeURIComponent("/profile")}`,
  });
}

export async function signInWithGoogle(nextPath = "/"): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallbackUrl(nextPath) },
  });
  if (error) return { error };
  if (typeof window !== "undefined" && data.url) {
    window.location.assign(data.url);
  }
  return { error: null };
}

export async function signInWithApple(nextPath = "/"): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: authCallbackUrl(nextPath) },
  });
  if (error) return { error };
  if (typeof window !== "undefined" && data.url) {
    window.location.assign(data.url);
  }
  return { error: null };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function getCurrentSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, user: null };
  return { session: data.session, user: data.session?.user ?? null };
}
