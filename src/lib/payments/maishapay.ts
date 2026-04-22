/**
 * MaishaPay integration helpers — secrets stay server-side only.
 * Supports MAISHAPAY_* env names from deployment docs with MAISHA_* fallback.
 */

import { timingSafeEqual } from "node:crypto";
import type { MaishaGatewayConfig } from "@/lib/payments/maishaEnv";
import { parseCanonicalTxRef } from "@/lib/payments/txRefCanonical";

export type MaishaPaySecrets = MaishaGatewayConfig;

export { parseCanonicalTxRef };

export function getMaishaPayGatewayConfig(): MaishaPaySecrets {
  const checkoutUrl =
    process.env.MAISHAPAY_BASE_URL?.trim() ||
    process.env.MAISHA_BASE_URL?.trim() ||
    "https://marchand.maishapay.online/payment/vers1.0/merchant/checkout";

  const gatewayMode =
    process.env.MAISHAPAY_GATEWAY_MODE?.trim() ||
    process.env.MAISHA_GATEWAY_MODE?.trim();

  const publicApiKey =
    process.env.MAISHAPAY_PUBLIC_KEY?.trim() || process.env.MAISHA_PUBLIC_KEY?.trim();

  const secretApiKey =
    process.env.MAISHAPAY_SECRET_KEY?.trim() || process.env.MAISHA_SECRET_KEY?.trim();

  if (!gatewayMode) throw new Error("MAISHAPAY_GATEWAY_MODE or MAISHA_GATEWAY_MODE is not set");
  if (!publicApiKey) throw new Error("MAISHAPAY_PUBLIC_KEY or MAISHA_PUBLIC_KEY is not set");
  if (!secretApiKey) throw new Error("MAISHAPAY_SECRET_KEY or MAISHA_SECRET_KEY is not set");

  return { checkoutUrl, gatewayMode, publicApiKey, secretApiKey };
}

/** Example POST fields for hosted checkout HTML form (MaishaPay Checkout v1). */
export type MaishaHostedCheckoutFields = Record<string, string>;

export function buildHostedCheckoutFields(input: {
  montant: string;
  devise: string;
  callbackUrl: string;
  /** Optional MSISDN / operator fields when applicable */
  phoneNumber?: string;
  fullName?: string;
  email?: string;
  operator?: string;
}): MaishaHostedCheckoutFields {
  const cfg = getMaishaPayGatewayConfig();
  const fields: MaishaHostedCheckoutFields = {
    gatewayMode: cfg.gatewayMode,
    publicApiKey: cfg.publicApiKey,
    montant: input.montant,
    devise: input.devise,
    callbackUrl: input.callbackUrl,
  };
  if (input.phoneNumber) fields.phoneNumber = input.phoneNumber;
  if (input.fullName) fields.fullName = input.fullName;
  if (input.email) fields.email = input.email;
  if (input.operator) fields.operator = input.operator;
  return fields;
}

/** Normalize webhook / callback payloads (JSON or redirect query). */
export function collectStringFields(record: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v == null) continue;
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

export function extractTxRef(fields: Record<string, string>): string | null {
  const raw =
    fields.tx_ref ??
    fields.txRef ??
    fields.reference ??
    fields.ref ??
    fields.payment_ref ??
    "";
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  return parseCanonicalTxRef(v);
}

export function extractMaishaMeta(fields: Record<string, string>): {
  statusRaw: string;
  descriptionRaw: string;
  transactionRefId: string;
  operatorRefId: string;
} {
  const lower = (s: string) => s.trim().toLowerCase();
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.entries(fields).find(([name]) => lower(name) === lower(k));
      if (hit?.[1]) return hit[1];
    }
    return "";
  };
  return {
    statusRaw: pick("status", "Status"),
    descriptionRaw: pick("description", "Description"),
    transactionRefId: pick(
      "transactionRefId",
      "transaction_ref_id",
      "transaction_id",
      "transactionId",
    ),
    operatorRefId: pick("operatorRefId", "operator_ref_id", "OperatorRefId"),
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyMaishaWebhookRequest(req: Request):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const expected =
    process.env.MAISHAPAY_WEBHOOK_SECRET?.trim() ||
    process.env.MAISHA_WEBHOOK_SECRET?.trim();

  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "MaishaPay webhook verification is not configured",
    };
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const presented =
    req.headers.get("x-maishapay-webhook-secret")?.trim() ||
    req.headers.get("x-webhook-secret")?.trim() ||
    bearer ||
    "";

  if (!presented || !constantTimeEqual(presented, expected)) {
    return { ok: false, status: 401, error: "Invalid MaishaPay webhook secret" };
  }

  return { ok: true };
}
