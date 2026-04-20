import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { activateSubscriptionForPayment } from "./activateSubscriptionForPayment";
import { classifyMaishaDescription } from "./maishaDescription";
import { getAppBaseUrl } from "./maishaEnv";

function mergeGatewayResponse(existing: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...patch };
}

function billingRedirect(path: string, reference: string | null): string {
  const base = getAppBaseUrl();
  const u = new URL(path, base);
  if (reference) u.searchParams.set("ref", reference);
  return u.toString();
}

/**
 * Applies MaishaPay redirect/callback params to `payments`, activates subscription on success.
 * Service role — does not rely on Supabase Auth session (Maisha browser redirect).
 */
export async function finalizeMaishaFromCallbackParams(
  params: URLSearchParams,
): Promise<{ redirectUrl: string }> {
  const admin = createAdminSupabaseClient();

  const reference = params.get("ref") ?? params.get("reference");
  if (!reference) {
    return { redirectUrl: billingRedirect("/billing/failed", null) };
  }

  const { data: payment, error: loadErr } = await admin
    .from("payments")
    .select("id, status, gateway_response")
    .eq("reference", reference)
    .maybeSingle();

  if (loadErr || !payment) {
    return { redirectUrl: billingRedirect("/billing/failed", reference) };
  }

  const rawCallback: Record<string, string> = {};
  params.forEach((v, k) => {
    rawCallback[k] = v;
  });

  const description = params.get("description") ?? params.get("Description") ?? "";
  const status = params.get("status") ?? params.get("Status") ?? "";
  const transactionRefId =
    params.get("transactionRefId") ?? params.get("transaction_ref_id") ?? params.get("TransactionRefId") ?? "";
  const operatorRefId =
    params.get("operatorRefId") ?? params.get("operator_ref_id") ?? params.get("OperatorRefId") ?? "";

  const gatewayResponse = mergeGatewayResponse(payment.gateway_response, {
    maishaLastCallbackAt: new Date().toISOString(),
    maishaLastCallback: rawCallback,
    maishaNormalizedStatus: status,
    maishaNormalizedDescription: description,
  });

  const outcome = classifyMaishaDescription(description);

  if (payment.status === "SUCCESS") {
    await admin.from("payments").update({ gateway_response: gatewayResponse }).eq("id", payment.id);
    try {
      await activateSubscriptionForPayment(admin, payment.id as string);
    } catch {
      /* idempotent repair — still show success if payment already succeeded */
    }
    return { redirectUrl: billingRedirect("/billing/success", reference) };
  }

  if (outcome === "pending") {
    await admin
      .from("payments")
      .update({
        status: "PENDING",
        external_reference: transactionRefId || null,
        operator_reference: operatorRefId || null,
        gateway_response: gatewayResponse,
      })
      .eq("id", payment.id)
      .in("status", ["PENDING"]);
    return { redirectUrl: billingRedirect("/billing/pending", reference) };
  }

  if (outcome === "success") {
    const { error: upErr } = await admin
      .from("payments")
      .update({
        status: "SUCCESS",
        external_reference: transactionRefId || null,
        operator_reference: operatorRefId || null,
        gateway_response: gatewayResponse,
      })
      .eq("id", payment.id)
      .eq("status", "PENDING");

    if (upErr) {
      return { redirectUrl: billingRedirect("/billing/failed", reference) };
    }

    const { data: fresh } = await admin.from("payments").select("status").eq("id", payment.id).maybeSingle();
    if (fresh?.status === "SUCCESS") {
      try {
        await activateSubscriptionForPayment(admin, payment.id as string);
      } catch {
        return { redirectUrl: billingRedirect("/billing/failed", reference) };
      }
      return { redirectUrl: billingRedirect("/billing/success", reference) };
    }

    return { redirectUrl: billingRedirect("/billing/pending", reference) };
  }

  await admin
    .from("payments")
    .update({
      status: "FAILED",
      external_reference: transactionRefId || null,
      operator_reference: operatorRefId || null,
      gateway_response: gatewayResponse,
    })
    .eq("id", payment.id)
    .in("status", ["PENDING"]);

  return { redirectUrl: billingRedirect("/billing/failed", reference) };
}
