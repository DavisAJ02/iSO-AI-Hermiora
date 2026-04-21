import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/payments/maishaEnv";
import {
  assertBillingPeriod,
  computeCheckoutMoney,
  normalizePaidPlan,
} from "@/lib/payments/plans";
import type { InitiatePaymentBody } from "@/lib/payments/types-maishapay";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: InitiatePaymentBody;
  try {
    body = (await req.json()) as InitiatePaymentBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const planTier = normalizePaidPlan(body.plan ?? "");
  if (!planTier) {
    return NextResponse.json({ ok: false, error: "Invalid plan (creator or pro)" }, { status: 400 });
  }

  try {
    assertBillingPeriod(body.billingCycle);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid billingCycle";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  if (body.currency !== "USD" && body.currency !== "CDF") {
    return NextResponse.json({ ok: false, error: "Invalid currency" }, { status: 400 });
  }

  if (body.payment_method !== "mobile_money" && body.payment_method !== "card") {
    return NextResponse.json({ ok: false, error: "Invalid payment_method" }, { status: 400 });
  }

  if (body.payment_method === "mobile_money") {
    if (!body.phoneNumber?.trim()) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber is required for mobile money" },
        { status: 400 },
      );
    }
    if (!body.operator?.trim()) {
      return NextResponse.json(
        { ok: false, error: "operator is required for mobile money" },
        { status: 400 },
      );
    }
  }

  if (body.payment_method === "card") {
    if (!body.email?.trim()) {
      return NextResponse.json({ ok: false, error: "email is required for card checkout" }, { status: 400 });
    }
    if (!body.fullName?.trim()) {
      return NextResponse.json({ ok: false, error: "fullName is required for card checkout" }, { status: 400 });
    }
  }

  const auth =
    req.headers.get("Authorization") ?? req.headers.get("authorization") ?? undefined;
  const supabase = createClient(await cookies(), auth);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sign in to continue checkout. If you already signed in, refresh the page and try again.",
      },
      { status: 401 },
    );
  }

  let money;
  try {
    money = computeCheckoutMoney(planTier, body.billingCycle, body.currency);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Pricing error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const txRef = `HERMIORA_${randomUUID().replace(/-/g, "")}`;
  const admin = createAdminSupabaseClient();
  const base = getAppBaseUrl();

  const hostedLaunchUrl = `${base}/api/payments/maishapay/go?txRef=${encodeURIComponent(txRef)}`;

  const { data: row, error: insErr } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      amount: money.amount,
      currency: money.devise,
      provider: "maishapay",
      method: body.payment_method,
      status: "INITIATED",
      reference: txRef,
      plan: planTier,
      billing_period: body.billingCycle,
      operator:
        body.payment_method === "mobile_money" ? body.operator!.trim().toLowerCase() : null,
      payer_phone: body.phoneNumber?.trim() || null,
      payer_email: body.email?.trim() || null,
      payer_name: body.fullName?.trim() || null,
      hosted_url: hostedLaunchUrl,
      gateway_response: {
        initiatedAt: new Date().toISOString(),
      },
    })
    .select("id, reference")
    .single();

  if (insErr || !row) {
    if (insErr?.code === "23505") {
      return NextResponse.json({ ok: false, error: "Duplicate reference — retry" }, { status: 409 });
    }
    return NextResponse.json(
      { ok: false, error: insErr?.message ?? "Failed to create payment" },
      { status: 400 },
    );
  }

  await admin.from("payments").update({ status: "PENDING" }).eq("id", row.id);

  const response: {
    ok: true;
    txRef: string;
    status: "pending";
    checkoutUrl?: string;
  } = {
    ok: true,
    txRef: row.reference as string,
    status: "pending",
  };

  if (body.payment_method === "card") {
    response.checkoutUrl = hostedLaunchUrl;
  }

  return NextResponse.json(response);
}
