import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMaishaAutoSubmitPage } from "@/lib/payments/maishaAutoSubmitHtml";
import { getAppBaseUrl } from "@/lib/payments/maishaEnv";
import { getMaishaPayGatewayConfig } from "@/lib/payments/maishapay";
import { createClient, type CookieStore } from "@/utils/supabase/server";

export const runtime = "nodejs";

type ErrorFormat = "plain" | "json";

function errResponse(format: ErrorFormat, status: number, message: string): Response {
  if (format === "json") {
    return NextResponse.json({ error: message }, { status });
  }
  return new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function getAuthHeader(req: Request): string | null {
  return req.headers.get("Authorization") ?? req.headers.get("authorization");
}

async function renderMaishaGoPage(
  cookieStore: CookieStore,
  req: Request,
  txRef: string,
  errorFormat: ErrorFormat,
): Promise<Response> {
  const supabase = createClient(cookieStore, getAuthHeader(req));
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    if (errorFormat === "json") {
      return NextResponse.json(
        {
          error:
            "Sign in to continue checkout. If you already signed in, refresh the page and try again.",
        },
        { status: 401 },
      );
    }
    return errResponse(errorFormat, 401, "Sign in required to continue checkout.");
  }

  const { data: pay, error } = await supabase
    .from("payments")
    .select(
      "id, user_id, reference, status, amount, currency, plan, method, payer_phone, payer_email, payer_name, operator, provider",
    )
    .eq("reference", txRef)
    .maybeSingle();

  if (error || !pay) {
    return errResponse(errorFormat, 404, "Payment not found");
  }

  if (pay.user_id !== user.id) {
    return errResponse(errorFormat, 403, "Forbidden");
  }

  if (pay.status !== "PENDING" && pay.status !== "INITIATED") {
    return errResponse(
      errorFormat,
      409,
      "This checkout session is no longer pending.",
    );
  }

  let cfg;
  try {
    cfg = getMaishaPayGatewayConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MaishaPay is not configured";
    return errResponse(errorFormat, 500, msg);
  }

  const devise = String(pay.currency).toUpperCase();
  const montant =
    devise === "USD" ? Number(pay.amount).toFixed(2) : String(Math.round(Number(pay.amount)));

  const callbackUrl = `${getAppBaseUrl()}/api/payments/maishapay/webhook?ref=${encodeURIComponent(pay.reference as string)}`;

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const txRef =
    url.searchParams.get("txRef")?.trim() || url.searchParams.get("reference")?.trim();
  if (!txRef) {
    return errResponse("plain", 400, "Missing txRef");
  }

  return renderMaishaGoPage(await cookies(), req, txRef, "plain");
}

export async function POST(req: Request) {
  let txRef: string | undefined;
  try {
    const body = (await req.json()) as { txRef?: string; reference?: string };
    txRef = body.txRef?.trim() || body.reference?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!txRef) {
    return NextResponse.json({ error: "Missing txRef" }, { status: 400 });
  }

  return renderMaishaGoPage(await cookies(), req, txRef, "json");
}
