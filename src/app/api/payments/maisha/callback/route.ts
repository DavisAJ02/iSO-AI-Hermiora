import { NextResponse } from "next/server";
import { finalizeMaishaFromCallbackParams } from "@/lib/payments/finalizeMaishaCallback";

export const runtime = "nodejs";

async function collectParams(req: Request): Promise<URLSearchParams> {
  const method = req.method.toUpperCase();
  if (method === "GET") {
    return new URL(req.url).searchParams;
  }
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return new URLSearchParams(text);
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const p = new URLSearchParams();
    fd.forEach((v, k) => p.append(k, String(v)));
    return p;
  }
  if (ct.includes("application/json")) {
    const j = (await req.json()) as Record<string, unknown>;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(j)) {
      if (v != null) p.append(k, String(v));
    }
    return p;
  }
  return new URLSearchParams();
}

export async function GET(req: Request) {
  const params = await collectParams(req);
  const { redirectUrl } = await finalizeMaishaFromCallbackParams(params);
  return NextResponse.redirect(redirectUrl, 302);
}

export async function POST(req: Request) {
  const params = await collectParams(req);
  const { redirectUrl } = await finalizeMaishaFromCallbackParams(params);
  return NextResponse.redirect(redirectUrl, 302);
}
