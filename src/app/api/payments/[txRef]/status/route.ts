import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { PaymentPublicStatus, PaymentStatusResponse } from "@/lib/payments/types-maishapay";

export const runtime = "nodejs";

function toPublicStatus(dbStatus: string | null | undefined): PaymentPublicStatus {
  const s = (dbStatus ?? "").toUpperCase();
  if (s === "SUCCESS") return "success";
  if (s === "FAILED") return "failed";
  return "pending";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ txRef: string }> },
) {
  const { txRef: rawTx } = await ctx.params;
  const txRef = decodeURIComponent(rawTx ?? "").trim();
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

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
