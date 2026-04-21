"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * After redirects from MaishaPay (cross-site), the JWT can be stale or cookie chunks out of sync.
 * Refresh Supabase cookies on the billing shell so navigating to gated routes sees a valid session.
 */
export function useResyncSessionAfterExternalReturn() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
}

/** Full reload so middleware sees cookies written by `refreshSession` (client navigations can race). */
export async function goHomeAfterBillingReturn() {
  const supabase = createClient();
  await supabase.auth.refreshSession();
  window.location.assign("/");
}
