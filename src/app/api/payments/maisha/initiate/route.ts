import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveCheckoutMoney } from "@/lib/payments/resolveCheckoutMoney";
import { getAppBaseUrl } from "@/lib/payments/maishaEnv";
import type { BillingPeriod } from "@/lib/types";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type InitiateBody = {
  plan: string;
  amount?: number;
  currency: "USD" | "CDF";
  method: "mobile_money" | "card";
  operator?: string;
  phoneNumber?: string;
  fullName?: string;
  email?: string;
  billingPeriod: BillingPeriod;
};

function normalizePaidPlan(plan: string): "creator" | "pro" | null {
  const p = plan.trim().toLowerCase();
  if (p === "creator") return "creator";
  if (p === "pro") return "pro";
  return null;
}

export async function POST(req: Request) {
  let body: InitiateBody;
  try {
    body = (await req.json()) as InitiateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    return await handleInitiate(body, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[maisha/initiate]", msg);
    return NextResponse.json(
      { error: msg.includes("Missing") ? msg : `Checkout failed: ${msg}` },
      { status: 500 },
    );
  }
}

async function handleInitiate(body: InitiateBody, req: Request): Promise<Response> {
  const planTier = normalizePaidPlan(body.plan ?? "");
  if (!planTier) {
    return NextResponse.json({ error: "Invalid plan (expected creator or pro)" }, { status: 400 });
  }

  if (body.billingPeriod !== "monthly" && body.billingPeriod !== "yearly") {
    return NextResponse.json({ error: "Invalid billingPeriod" }, { status: 400 });
  }

  if (body.currency !== "USD" && body.currency !== "CDF") {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  if (body.method !== "mobile_money" && body.method !== "card") {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  if (body.method === "mobile_money") {
    if (!body.phoneNumber?.trim()) {
      return NextResponse.json({ error: "phoneNumber is required for mobile money" }, { status: 400 });
    }
    if (!body.operator?.trim()) {
      return NextResponse.json({ error: "operator is required for mobile money" }, { status: 400 });
    }
  }

  if (body.method === "card") {
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "email is required for card checkout" }, { status: 400 });
    }
    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "fullName is required for card checkout" }, { status: 400 });
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
        error:
          "Sign in to continue checkout. If you already signed in, refresh the page and try again.",
      },
      { status: 401 },
    );
  }

  let money;
  try {
    money = resolveCheckoutMoney(planTier, body.billingPeriod, body.currency);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Pricing error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const reference = `hm_${randomUUID().replace(/-/g, "")}`;
  const admin = createAdminSupabaseClient();

  const { data: row, error: insErr } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      amount: money.amount,
      currency: money.devise,
      provider: "maisha",
      method: body.method,
      status: "PENDING",
      reference,
      plan: planTier,
      billing_period: body.billingPeriod,
      operator: body.method === "mobile_money" ? body.operator!.trim().toLowerCase() : null,
      payer_phone: body.phoneNumber?.trim() || null,
      payer_email: body.email?.trim() || null,
      payer_name: body.fullName?.trim() || null,
      gateway_response: {
        initiatedAt: new Date().toISOString(),
        clientIgnoredAmount: body.amount ?? null,
      },
    })
    .select("id, reference")
    .single();

  if (insErr || !row) {
    if (insErr?.code === "23505") {
      return NextResponse.json({ error: "Duplicate reference — retry" }, { status: 409 });
    }
    return NextResponse.json({ error: insErr?.message ?? "Failed to create payment" }, { status: 400 });
  }

  const base = getAppBaseUrl();
  const checkoutUrl = `${base}/api/payments/maisha/go?reference=${encodeURIComponent(reference)}`;

  return NextResponse.json({
    reference: row.reference,
    checkoutUrl,
    amount: money.amount,
    currency: money.devise,
  });
}
