import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

/**
 * Supabase client scoped to the caller's JWT (RLS applies).
 * Pass `Authorization: Bearer <access_token>` from the client.
 */
export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL", url), requireEnv("SUPABASE_ANON_KEY", anonKey), {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Service role — bypasses RLS. Use only for trusted server tasks. */
export function createServiceSupabaseClient(): SupabaseClient {
  return createClient(
    requireEnv("SUPABASE_URL", url),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function getUserIdFromJwt(accessToken: string): Promise<string | null> {
  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
