import type { SupabaseClient } from "@supabase/supabase-js";
import { activateSubscriptionForPayment } from "@/lib/payments/activateSubscriptionForPayment";
import { classifyMaishaDescription } from "@/lib/payments/maishaDescription";
import {
  extractMaishaMeta,
  extractTxRef,
  type MaishaHostedCheckoutFields,
} from "@/lib/payments/maishapay";

function mergeGatewayResponse(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...patch };
}

/**
 * Applies a MaishaPay notification (callback redirect query, POST JSON, or form body).
 * Idempotent for SUCCESS payments. Subscription activation runs only here (server-side).
 */
export async function applyMaishaPaymentNotification(
  admin: SupabaseClient,
  rawFields: Record<string, string>,
): Promise<{ ok: boolean; txRef: string | null; skipped?: string }> {
  const txRef = extractTxRef(rawFields);

  if (!txRef) {
    return { ok: false, txRef: null, skipped: "missing_tx_ref" };
  }

  const meta = extractMaishaMeta(rawFields);
  const outcome = classifyMaishaDescription(meta.descriptionRaw);

  const { data: payment, error: loadErr } = await admin
    .from("payments")
    .select(
      "id, user_id, reference, status, gateway_response, subscription_id, plan, billing_period, provider",
    )
    .eq("reference", txRef)
    .maybeSingle();

  if (loadErr || !payment) {
    return { ok: false, txRef, skipped: "payment_not_found" };
  }

  await admin.from("payment_events").insert({
    payment_id: payment.id,
    provider: payment.provider ?? "maisha",
    event_type: `maisha.${outcome}`,
    payload: rawFields as unknown as Record<string, unknown>,
  });

  const gatewayResponse = mergeGatewayResponse(payment.gateway_response, {
    maishaLastCallbackAt: new Date().toISOString(),
    maishaLastCallback: rawFields,
    maishaNormalizedStatus: meta.statusRaw,
    maishaNormalizedDescription: meta.descriptionRaw,
  });

  if (payment.status === "SUCCESS") {
    await admin.from("payments").update({ gateway_response: gatewayResponse }).eq("id", payment.id);
    try {
      await activateSubscriptionForPayment(admin, payment.id as string);
    } catch {
      /* duplicate callback */
    }
    return { ok: true, txRef };
  }

  if (outcome === "pending") {
    await admin
      .from("payments")
      .update({
        status: "PENDING",
        external_reference: meta.transactionRefId || null,
        operator_reference: meta.operatorRefId || null,
        gateway_response: gatewayResponse,
      })
      .eq("id", payment.id)
      .in("status", ["INITIATED", "PENDING"]);

    return { ok: true, txRef };
  }

  if (outcome === "success") {
    const { error: upErr } = await admin
      .from("payments")
      .update({
        status: "SUCCESS",
        external_reference: meta.transactionRefId || null,
        operator_reference: meta.operatorRefId || null,
        gateway_response: gatewayResponse,
      })
      .eq("id", payment.id)
      .in("status", ["INITIATED", "PENDING"]);

    if (upErr) {
      return { ok: false, txRef, skipped: upErr.message };
    }

    const { data: fresh } = await admin
      .from("payments")
      .select("status")
      .eq("id", payment.id)
      .maybeSingle();

    if (fresh?.status === "SUCCESS") {
      try {
        await activateSubscriptionForPayment(admin, payment.id as string);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, txRef, skipped: msg };
      }
    }

    return { ok: true, txRef };
  }

  await admin
    .from("payments")
    .update({
      status: "FAILED",
      external_reference: meta.transactionRefId || null,
      operator_reference: meta.operatorRefId || null,
      gateway_response: gatewayResponse,
    })
    .eq("id", payment.id)
    .in("status", ["INITIATED", "PENDING"]);

  return { ok: true, txRef };
}

/** Sample MaishaPay hosted-checkout field bag for logs / tests. */
export function exampleHostedCheckoutPayloadSample(): MaishaHostedCheckoutFields {
  return {
    gatewayMode: "0",
    publicApiKey: "MP-SBPK-xxxxxxxxxxxxxxxx",
    secretApiKey: "MP-SBSK-xxxxxxxxxxxxxxxx",
    montant: "29.99",
    devise: "USD",
    callbackUrl: "https://your-domain.com/api/payments/maishapay/webhook?ref=HERMIORA_abc",
  };
}
