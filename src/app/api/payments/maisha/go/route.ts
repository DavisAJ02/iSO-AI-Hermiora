import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMaishaAutoSubmitPage } from "@/lib/payments/maishaAutoSubmitHtml";
import { getAppBaseUrl, getMaishaGatewayConfig } from "@/lib/payments/maishaEnv";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) {
    return new NextResponse("Missing reference", { status: 400 });
  }

  const supabase = createClient(await cookies());
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return new NextResponse("Sign in required to continue checkout.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { data: pay, error } = await supabase
    .from("payments")
    .select(
      "id, user_id, reference, status, amount, currency, plan, method, payer_phone, payer_email, payer_name, operator",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (error || !pay) {
    return new NextResponse("Payment not found", { status: 404 });
  }

  if (pay.user_id !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (pay.status !== "PENDING") {
    return new NextResponse("This checkout session is no longer pending.", {
      status: 409,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let cfg;
  try {
    cfg = getMaishaGatewayConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MaishaPay is not configured";
    return new NextResponse(msg, { status: 500 });
  }

  const devise = String(pay.currency).toUpperCase();
  const montant =
    devise === "USD" ? Number(pay.amount).toFixed(2) : String(Math.round(Number(pay.amount)));

  const callbackUrl = `${getAppBaseUrl()}/api/payments/maisha/callback?ref=${encodeURIComponent(pay.reference as string)}`;

  const fields: Record<string, string> = {
    gatewayMode: cfg.gatewayMode,
    publicApiKey: cfg.publicApiKey,
    secretApiKey: cfg.secretApiKey,
    montant,
    devise,
    callbackUrl,
  };

  if (pay.payer_phone) fields.phoneNumber = pay.payer_phone as string;
  if (pay.payer_name) fields.fullName = pay.payer_name as string;
  if (pay.payer_email) fields.email = pay.payer_email as string;
  if (pay.operator) fields.operator = pay.operator as string;

  const html = buildMaishaAutoSubmitPage({ action: cfg.checkoutUrl, fields });

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
