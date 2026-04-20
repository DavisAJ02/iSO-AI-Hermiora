import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { activateSubscriptionForPayment } from "@/lib/payments/activateSubscriptionForPayment";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { reference?: string };
  try {
    body = (await req.json()) as { reference?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = body.reference?.trim();
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: pay, error } = await admin
    .from("payments")
    .select("id, user_id, status, subscription_id")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !pay) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (pay.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pay.status !== "SUCCESS") {
    return NextResponse.json({
      ok: true,
      repaired: false,
      reason: `Payment status is ${pay.status}, no subscription repair applied`,
    });
  }

  try {
    const result = await activateSubscriptionForPayment(admin, pay.id as string);
    return NextResponse.json({
      ok: true,
      repaired: !result.skipped,
      subscriptionId: result.subscriptionId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
