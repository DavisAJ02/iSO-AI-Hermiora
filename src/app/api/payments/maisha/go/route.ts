import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMaishaAutoSubmitPage } from "@/lib/payments/maishaAutoSubmitHtml";
import { getAppBaseUrl, getMaishaGatewayConfig } from "@/lib/payments/maishaEnv";
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
  reference: string,
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
      "id, user_id, reference, status, amount, currency, plan, method, payer_phone, payer_email, payer_name, operator",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (error || !pay) {
    return errResponse(errorFormat, 404, "Payment not found");
  }

  if (pay.user_id !== user.id) {
    return errResponse(errorFormat, 403, "Forbidden");
  }

  if (pay.status !== "PENDING") {
    return errResponse(
      errorFormat,
      409,
      "This checkout session is no longer pending.",
    );
  }

  let cfg;
  try {
    cfg = getMaishaGatewayConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MaishaPay is not configured";
    return errResponse(errorFormat, 500, msg);
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) {
    return errResponse("plain", 400, "Missing reference");
  }

  return renderMaishaGoPage(await cookies(), req, reference, "plain");
}

export async function POST(req: Request) {
  let reference: string | undefined;
  try {
    const body = (await req.json()) as { reference?: string };
    reference = body.reference?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  return renderMaishaGoPage(await cookies(), req, reference, "json");
}
