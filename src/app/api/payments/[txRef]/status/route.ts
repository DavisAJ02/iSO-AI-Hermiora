import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseCanonicalTxRef } from "@/lib/payments/txRefCanonical";
import { createClient } from "@/utils/supabase/server";
import type { PaymentPublicStatus, PaymentStatusResponse } from "@/lib/payments/types-maishapay";

export const runtime = "nodejs";

function toPublicStatus(dbStatus: string | null | undefined): PaymentPublicStatus {
  const s = (dbStatus ?? "").toUpperCase();
  if (s === "SUCCESS") return "success";
  if (s === "FAILED") return "failed";
  return "pending";
}

/** Tx refs we issue — high entropy; safe enough for status-only reveal after PSP redirect */
function allowsPublicStatusLookup(txRef: string): boolean {
  return txRef.startsWith("HERMIORA_") || txRef.startsWith("hm_");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ txRef: string }> },
) {
  const { txRef: rawTx } = await ctx.params;
  const decoded = decodeURIComponent(rawTx ?? "").trim();
  const txRef = parseCanonicalTxRef(decoded) ?? decoded;
  if (!txRef) {
    return NextResponse.json({ error: "Missing txRef" }, { status: 400 });
  }

  const auth =
    req.headers.get("Authorization") ?? req.headers.get("authorization") ?? undefined;
  const supabase = createClient(await cookies(), auth);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (!authErr && user) {
    const { data: pay, error } = await supabase
      .from("payments")
      .select("reference, status, plan")
      .eq("reference", txRef)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!pay) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: PaymentStatusResponse = {
      txRef: pay.reference as string,
      status: toPublicStatus(pay.status as string),
      plan: (pay.plan as string | null) ?? null,
    };

    return NextResponse.json(body);
  }

  /** Post-payment browser return: session cookie may not be present yet after MaishaPay redirect */
  if (!allowsPublicStatusLookup(txRef)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: pay, error } = await admin
    .from("payments")
    .select("reference, status, plan")
    .eq("reference", txRef)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!pay) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body: PaymentStatusResponse = {
    txRef: pay.reference as string,
    status: toPublicStatus(pay.status as string),
    plan: (pay.plan as string | null) ?? null,
  };

  return NextResponse.json(body);
}
