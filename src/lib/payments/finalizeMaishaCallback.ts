import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "./maishaEnv";
import { applyMaishaPaymentNotification } from "@/lib/payments/processMaishaPaymentNotification";

/**
 * Legacy MaishaPay browser redirect (`/api/payments/maisha/callback`).
 * Applies the same ledger rules as `/api/payments/maishapay/webhook`, then sends the customer to the polling page.
 * Success for subscriptions is determined server-side here or via webhook — never from client-side URL tampering alone.
 */
export async function finalizeMaishaFromCallbackParams(
  params: URLSearchParams,
): Promise<{ redirectUrl: string }> {
  const raw: Record<string, string> = {};
  params.forEach((v, k) => {
    raw[k] = v;
  });

  try {
    const admin = createAdminSupabaseClient();
    await applyMaishaPaymentNotification(admin, raw);
  } catch (e) {
    console.error("[finalizeMaishaFromCallbackParams]", e);
  }

  const base = getAppBaseUrl();
  const reference =
    raw.ref ??
    raw.reference ??
    params.get("ref") ??
    params.get("reference") ??
    "";

  const u = new URL("/billing/result", base);
  if (reference.trim()) {
    u.searchParams.set("txRef", reference.trim());
  }

  return { redirectUrl: u.toString() };
}
