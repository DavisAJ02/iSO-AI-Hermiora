import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  collectStringFields,
  extractTxRef,
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

/**
 * MaishaPay notification entrypoint. Configure `callbackUrl` in the hosted checkout form to hit this route.
 * MaishaPay may notify via browser redirect with query parameters and/or POST bodies — we normalize and persist.
 */
export async function GET(req: Request) {
  const fields = await parseMergedFields(req);
  const admin = createAdminSupabaseClient();
  const result = await applyMaishaPaymentNotification(admin, fields);

  const txRef =
    result.txRef ?? extractTxRef(fields) ?? fields.ref ?? fields.reference ?? null;

  const base = getAppBaseUrl();
  const redirect = new URL("/billing/result", base);
  if (txRef) redirect.searchParams.set("txRef", txRef);

  return NextResponse.redirect(redirect.toString(), 302);
}

export async function POST(req: Request) {
  const fields = await parseMergedFields(req);
  const admin = createAdminSupabaseClient();
  await applyMaishaPaymentNotification(admin, fields);
  return NextResponse.json({ received: true });
}
