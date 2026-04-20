import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const { reference } = await ctx.params;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const auth =
    req.headers.get("Authorization") ?? req.headers.get("authorization") ?? undefined;
  const supabase = createClient(await cookies(), auth);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pay, error } = await supabase
    .from("payments")
    .select(
      "id, reference, status, plan, amount, currency, method, provider, subscription_id, external_reference, operator_reference, updated_at, created_at",
    )
    .eq("reference", reference)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!pay) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ payment: pay });
}
