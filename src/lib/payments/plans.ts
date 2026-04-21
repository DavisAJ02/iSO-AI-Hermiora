import { checkoutAmount } from "@/lib/pricing";
import type { BillingPeriod, PlanTier } from "@/lib/types";
import { resolveCheckoutMoney } from "@/lib/payments/resolveCheckoutMoney";
import type { CheckoutCurrencyCode, PaidPlanSlug } from "@/lib/payments/types-maishapay";

export function normalizePaidPlan(plan: string): PaidPlanSlug | null {
  const p = plan.trim().toLowerCase();
  if (p === "creator") return "creator";
  if (p === "pro") return "pro";
  return null;
}

export function assertBillingPeriod(
  value: unknown,
): asserts value is BillingPeriod {
  if (value !== "monthly" && value !== "yearly") {
    throw new Error("billingCycle must be monthly or yearly");
  }
}

/**
 * Server-side pricing — amount is never taken from client trust.
 */
export function computeCheckoutMoney(
  plan: PaidPlanSlug,
  billingCycle: BillingPeriod,
  currency: CheckoutCurrencyCode,
) {
  const tier = plan as Exclude<PlanTier, "free">;
  return resolveCheckoutMoney(tier, billingCycle, currency);
}

export function listPriceUsd(plan: PaidPlanSlug, billingCycle: BillingPeriod): number {
  const tier = plan as Exclude<PlanTier, "free">;
  return checkoutAmount(tier, billingCycle);
}
