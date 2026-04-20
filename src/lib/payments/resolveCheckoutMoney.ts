import { checkoutAmount } from "@/lib/pricing";
import type { BillingPeriod, PlanTier } from "@/lib/types";
import { getCdfPerUsd } from "./maishaEnv";

export type CheckoutCurrency = "USD" | "CDF";

export type ResolvedCheckoutMoney = {
  currency: CheckoutCurrency;
  /** Amount stored in DB (numeric) */
  amount: number;
  /** `montant` field for MaishaPay form */
  montant: string;
  devise: CheckoutCurrency;
};

/**
 * Server-side price only — never trust client-supplied amounts.
 * USD uses list from `checkoutAmount`; CDF = USD total × MAISHA_CDF_PER_USD (rounded integer).
 */
export function resolveCheckoutMoney(
  planTier: Exclude<PlanTier, "free">,
  billingPeriod: BillingPeriod,
  currency: CheckoutCurrency,
): ResolvedCheckoutMoney {
  const usd = checkoutAmount(planTier, billingPeriod);
  if (currency === "USD") {
    return {
      currency: "USD",
      amount: Math.round(usd * 100) / 100,
      montant: usd.toFixed(2),
      devise: "USD",
    };
  }
  const rate = getCdfPerUsd();
  const cdf = Math.max(1, Math.round(usd * rate));
  return {
    currency: "CDF",
    amount: cdf,
    montant: String(cdf),
    devise: "CDF",
  };
}
