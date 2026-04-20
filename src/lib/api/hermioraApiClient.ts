import { createClient } from "@/utils/supabase/client";

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "Set NEXT_PUBLIC_API_URL (e.g. http://localhost:4000) to call the Hermiora Fastify API.",
    );
  }
  return raw.replace(/\/$/, "");
}

/**
 * Calls the Fastify backend with `Authorization: Bearer <Supabase access_token>`.
 * Same JWT Google/email sign-in issues — must match `SUPABASE_*` on the API server.
 */
export async function hermioraApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = apiBase();
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Sign in required to call the Hermiora API.");
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers, credentials: "omit" });
}

export function isHermioraApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}
