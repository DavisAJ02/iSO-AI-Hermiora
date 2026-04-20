import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After a Maisha payment reaches SUCCESS, link subscription + profile.
 * Idempotent: safe if `subscription_id` already set (duplicate callbacks / retries).
 */
export async function activateSubscriptionForPayment(
  admin: SupabaseClient,
  paymentId: string,
): Promise<{ subscriptionId: string | null; skipped: boolean }> {
  const { data: pay, error: readErr } = await admin
    .from("payments")
    .select("id, user_id, plan, billing_period, status, subscription_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (readErr || !pay) {
    throw new Error(readErr?.message ?? "Payment not found for activation");
  }
  if (pay.status !== "SUCCESS") {
    return { subscriptionId: null, skipped: true };
  }
  if (pay.subscription_id) {
    return { subscriptionId: pay.subscription_id as string, skipped: true };
  }
  if (pay.plan !== "creator" && pay.plan !== "pro") {
    return { subscriptionId: null, skipped: true };
  }

  const now = new Date();
  const expires = new Date(now);
  if (pay.billing_period === "yearly") {
    expires.setUTCDate(expires.getUTCDate() + 365);
  } else {
    expires.setUTCDate(expires.getUTCDate() + 30);
  }

  await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", pay.user_id)
    .eq("status", "active")
    .eq("provider", "maisha");

  const { data: sub, error: insErr } = await admin
    .from("subscriptions")
    .insert({
      user_id: pay.user_id,
      plan: pay.plan,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      provider: "maisha",
    })
    .select("id")
    .single();

  if (insErr || !sub) {
    throw new Error(insErr?.message ?? "Failed to create subscription");
  }

  const { data: claimed, error: claimErr } = await admin
    .from("payments")
    .update({ subscription_id: sub.id as string })
    .eq("id", paymentId)
    .is("subscription_id", null)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    await admin.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id as string);
    throw new Error(claimErr.message);
  }

  if (!claimed) {
    await admin.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id as string);
    return { subscriptionId: null, skipped: true };
  }

  const usageLimit = pay.plan === "pro" ? 200 : 50;
  const { error: profErr } = await admin
    .from("profiles")
    .update({ plan: pay.plan, usage_limit: usageLimit })
    .eq("id", pay.user_id);

  if (profErr) {
    throw new Error(`Profile update failed: ${profErr.message}`);
  }

  return { subscriptionId: sub.id as string, skipped: false };
}
