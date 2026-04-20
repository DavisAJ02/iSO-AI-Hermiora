import { createClient } from "@/utils/supabase/client";

/** Headers for Maisha Route Handlers when the session is bearer-only (no SSR cookies). */
export async function getMaishaRequestAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
