import type { BillingPeriod, PlanTier } from "./types";

/** List price when billed monthly (USD — server + UI source of truth for Maisha checkout) */
export const CREATOR_MONTHLY = 16.99;
export const PRO_MONTHLY = 29.99;

/** Yearly plan: “Save 40%” → pay 60% of annual list, shown as effective monthly × 12 */
const YEARLY_PAY_FRACTION = 0.6;

function fmtMoney(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function yearlyEffectiveMonthly(listMonthly: number) {
  return Math.round(listMonthly * YEARLY_PAY_FRACTION * 100) / 100;
}

function yearlyBilledTotal(listMonthly: number) {
  const m = yearlyEffectiveMonthly(listMonthly);
  return Math.round(m * 12 * 100) / 100;
}

export function planPriceLabel(tier: PlanTier, period: BillingPeriod) {
  if (tier === "free") {
    return { headline: "$0", sub: "forever", cta: "Stay on Free" };
  }

  if (tier === "creator") {
    if (period === "yearly") {
      const eq = yearlyEffectiveMonthly(CREATOR_MONTHLY);
      const total = yearlyBilledTotal(CREATOR_MONTHLY);
      return {
        headline: `$${fmtMoney(eq)} / month`,
        sub: `$${fmtMoney(total)} billed yearly`,
        cta: `Start Creator — $${fmtMoney(eq)}/mo`,
      };
    }
    return {
      headline: `$${fmtMoney(CREATOR_MONTHLY)} / month`,
      sub: "Billed monthly",
      cta: `Start Creator — $${fmtMoney(CREATOR_MONTHLY)}/mo`,
    };
  }

  if (period === "yearly") {
    const eq = yearlyEffectiveMonthly(PRO_MONTHLY);
    const total = yearlyBilledTotal(PRO_MONTHLY);
    return {
      headline: `$${fmtMoney(eq)} / month`,
      sub: `$${fmtMoney(total)} billed yearly`,
      cta: `Start Pro — $${fmtMoney(eq)}/mo`,
    };
  }

  return {
    headline: `$${fmtMoney(PRO_MONTHLY)} / month`,
    sub: "Billed monthly",
    cta: `Start Pro — $${fmtMoney(PRO_MONTHLY)}/mo`,
  };
}

/** Amount due for checkout CTA (one month when monthly, full year when yearly) */
export function checkoutAmount(tier: PlanTier, period: BillingPeriod) {
  if (tier === "free") return 0;
  if (tier === "creator") {
    return period === "yearly"
      ? yearlyBilledTotal(CREATOR_MONTHLY)
      : CREATOR_MONTHLY;
  }
  return period === "yearly" ? yearlyBilledTotal(PRO_MONTHLY) : PRO_MONTHLY;
}
