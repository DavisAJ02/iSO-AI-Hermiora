import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  collectStringFields,
  extractTxRef,
  verifyMaishaWebhookRequest,
} from "@/lib/payments/maishapay";
import { applyMaishaPaymentNotification } from "@/lib/payments/processMaishaPaymentNotification";
import { getAppBaseUrl } from "@/lib/payments/maishaEnv";

export const runtime = "nodejs";

async function parseMergedFields(req: Request): Promise<Record<string, string>> {
  const url = new URL(req.url);
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    out[k] = v;
  });

  const method = req.method.toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "PATCH") {
    return out;
  }

  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      Object.assign(out, collectStringFields(j));
      return out;
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const sp = new URLSearchParams(text);
      sp.forEach((v, k) => {
        out[k] = v;
      });
      return out;
    }
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      fd.forEach((v, k) => {
        out[k] = typeof v === "string" ? v : "";
      });
      return out;
    }
  } catch {
    /* body optional */
  }
  return out;
}

function hasHostedCheckoutResult(fields: Record<string, string>): boolean {
  const names = new Set(Object.keys(fields).map((key) => key.trim().toLowerCase()));
  const hasOutcome = names.has("status") || names.has("description");
  const hasProviderReference =
    names.has("transactionrefid") ||
    names.has("transaction_ref_id") ||
    names.has("transactionid") ||
    names.has("transaction_id") ||
    names.has("operatorrefid") ||
    names.has("operator_ref_id");

  return hasOutcome && hasProviderReference;
}

function billingResultRedirect(txRef: string | null): string {
  const base = getAppBaseUrl();
  const redirect = new URL("/billing/result", base);
  if (txRef) redirect.searchParams.set("txRef", txRef);
  return redirect.toString();
}

/**
 * MaishaPay notification entrypoint. Configure `callbackUrl` in the hosted checkout form to hit this route.
 * MaishaPay may notify via browser redirect with query parameters and/or POST bodies — we normalize and persist.
 */
export async function GET(req: Request) {
  const fields = await parseMergedFields(req);
  const txRef = extractTxRef(fields) ?? null;

  if (txRef && hasHostedCheckoutResult(fields)) {
    const admin = createAdminSupabaseClient();
    await applyMaishaPaymentNotification(admin, fields);
  }

  return NextResponse.redirect(billingResultRedirect(txRef), 302);
}

export async function POST(req: Request) {
  const fields = await parseMergedFields(req);
  const verification = verifyMaishaWebhookRequest(req);
  if (!verification.ok && !hasHostedCheckoutResult(fields)) {
    return NextResponse.json(
      { received: false, error: verification.error },
      { status: verification.status },
    );
  }

  const admin = createAdminSupabaseClient();
  await applyMaishaPaymentNotification(admin, fields);

  if (!verification.ok) {
    return NextResponse.redirect(billingResultRedirect(extractTxRef(fields) ?? null), 302);
  }

  return NextResponse.json({ received: true });
}
