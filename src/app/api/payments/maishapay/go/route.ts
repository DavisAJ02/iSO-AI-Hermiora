import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkoutGateErrorPageHtml } from "@/lib/payments/checkoutGateHtml";
import { buildMaishaAutoSubmitPage } from "@/lib/payments/maishaAutoSubmitHtml";
import { getAppBaseUrl } from "@/lib/payments/maishaEnv";
import { getMaishaPayGatewayConfig } from "@/lib/payments/maishapay";
import { createClient, type CookieStore } from "@/utils/supabase/server";

export const runtime = "nodejs";

type ErrorFormat = "plain" | "json" | "html";

function errResponse(
  format: ErrorFormat,
  status: number,
  message: string,
  opts?: { req?: Request; txRef?: string | null },
): Response {
  if (format === "json") {
    return NextResponse.json({ error: message }, { status });
  }
  if (format === "html" && opts?.req) {
    const url = new URL(opts.req.url);
    const basePath = `/api/payments/maishapay/go${opts.txRef ? `?txRef=${encodeURIComponent(opts.txRef)}` : ""}`;
    const signInHref = `${url.origin}/auth/sign-in?next=${encodeURIComponent(basePath)}`;
    const secondary =
      status === 401
        ? "Opening this link in another browser or without logging in here first will fail. Start checkout from the app while signed in, or sign in below and we will send you back."
        : undefined;
    const html = checkoutGateErrorPageHtml({
      title: status === 401 ? "Sign in to continue" : "Checkout unavailable",
      message,
      primaryHref: signInHref,
      primaryLabel: "Sign in and continue",
      secondaryHint: secondary,
    });
    return new NextResponse(html, {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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
    return errResponse(errorFormat, 401, "Sign in required to continue checkout.", {
      req,
      txRef,
    });
  }

  const { data: pay, error } = await supabase
    .from("payments")
    .select(
      "id, user_id, reference, status, amount, currency, plan, method, payer_phone, payer_email, payer_name, operator, provider",
    )
    .eq("reference", txRef)
    .maybeSingle();

  if (error || !pay) {
    return errResponse(errorFormat, 404, "Payment not found.", { req, txRef });
  }

  if (pay.user_id !== user.id) {
    return errResponse(errorFormat, 403, "This payment belongs to another account.", { req, txRef });
  }

  if (pay.status !== "PENDING" && pay.status !== "INITIATED") {
    return errResponse(
      errorFormat,
      409,
      "This checkout session is no longer pending.",
      { req, txRef },
    );
  }

  let cfg;
  try {
    cfg = getMaishaPayGatewayConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MaishaPay is not configured";
    return errResponse(errorFormat, 500, msg, { req, txRef });
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
    return errResponse("html", 400, "Missing payment reference (txRef).", { req, txRef: null });
  }

  return renderMaishaGoPage(await cookies(), req, txRef, "html");
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
