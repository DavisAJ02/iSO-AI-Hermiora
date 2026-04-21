import { NextResponse } from "next/server";
import { lookupPaymentStatus } from "@/lib/payments/paymentStatusLookup";

export const runtime = "nodejs";

/** Legacy path shape — prefer `/api/payments/status?txRef=` to avoid `%2F` in paths */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ txRef: string }> },
) {
  const { txRef: rawTx } = await ctx.params;
  const decoded = decodeURIComponent(rawTx ?? "").trim();
  const result = await lookupPaymentStatus(req, decoded);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json(result.body);
}
