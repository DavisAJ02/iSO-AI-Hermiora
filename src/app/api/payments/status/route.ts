import { NextResponse } from "next/server";
import { lookupPaymentStatus } from "@/lib/payments/paymentStatusLookup";

export const runtime = "nodejs";

/**
 * Preferred status endpoint — `txRef` stays in the query string so slashes from MaishaPay never
 * appear in path segments (%2F issues on proxies / CDN).
 *
 * GET /api/payments/status?txRef=HERMIORA_...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw =
    url.searchParams.get("txRef")?.trim() ??
    url.searchParams.get("ref")?.trim() ??
    "";
  const result = await lookupPaymentStatus(req, raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json(result.body);
}
