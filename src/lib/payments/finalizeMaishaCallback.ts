import { getAppBaseUrl } from "./maishaEnv";

/**
 * Legacy MaishaPay browser redirect (`/api/payments/maisha/callback`).
 * Browser redirects are not trusted payment evidence. They only return the
 * customer to the polling page; verified server-to-server POST notifications
 * are responsible for ledger mutations and subscription activation.
 */
export async function finalizeMaishaFromCallbackParams(
  params: URLSearchParams,
): Promise<{ redirectUrl: string }> {
  const base = getAppBaseUrl();
  const reference =
    params.get("ref") ??
    params.get("reference") ??
    params.get("txRef") ??
    "";

  const u = new URL("/billing/result", base);
  if (reference.trim()) {
    u.searchParams.set("txRef", reference.trim());
  }

  return { redirectUrl: u.toString() };
}
