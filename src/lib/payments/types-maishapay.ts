/** Public API status values (never expose DB enums directly). */
export type PaymentPublicStatus = "pending" | "success" | "failed";

export type PaidPlanSlug = "creator" | "pro";

export type BillingCycleSlug = "monthly" | "yearly";

export type PaymentMethodSlug = "mobile_money" | "card";

export type CheckoutCurrencyCode = "USD" | "CDF";

export type InitiatePaymentBody = {
  plan: string;
  billingCycle: BillingCycleSlug;
  currency: CheckoutCurrencyCode;
  payment_method: PaymentMethodSlug;
  operator?: string;
  phoneNumber?: string;
  fullName?: string;
  email?: string;
};

export type InitiatePaymentSuccess = {
  ok: true;
  txRef: string;
  status: "pending";
  /** Hosted checkout launcher (HTML auto-post). Card payments only per product contract. */
  checkoutUrl?: string;
};

export type InitiatePaymentError = {
  ok: false;
  error: string;
};

export type PaymentStatusResponse = {
  txRef: string;
  status: PaymentPublicStatus;
  /** Present when joined from DB — useful for success UI after polling */
  plan?: string | null;
};
