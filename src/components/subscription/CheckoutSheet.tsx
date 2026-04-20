"use client";

import {
  Apple,
  CheckCircle2,
  Circle,
  Info,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/context/AppProvider";
import { checkoutAmount, planPriceLabel } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { MobileOperator, PlanTier } from "@/lib/types";
import type { ReactNode } from "react";

const operatorMeta: {
  id: MobileOperator;
  label: string;
  short: string;
}[] = [
  { id: "mpesa", label: "M-Pesa", short: "M-Pesa" },
  { id: "orange", label: "Orange Money", short: "Orange" },
  { id: "airtel", label: "Airtel Money", short: "Airtel" },
  { id: "africel", label: "Africel", short: "Africel" },
  { id: "mtn", label: "MTN Mobile Money", short: "MTN" },
];

export function CheckoutSheet() {
  const { billing, checkout, ui } = useApp();
  const periodLabel = billing.period === "yearly" ? "Yearly" : "Monthly";
  if (!ui.checkoutOpen) return null;

  const tier: PlanTier =
    checkout.selectedTier === "free" ? "pro" : checkout.selectedTier;
  const summary = planPriceLabel(tier, billing.period);
  const amount = checkoutAmount(tier, billing.period);
  const operatorLabel =
    operatorMeta.find((o) => o.id === checkout.operator)?.short ?? "M-Pesa";

  const ctaLabel =
    checkout.paymentMethod === "apple"
      ? "Subscribe with Apple"
      : `Pay $${amount.toFixed(2)} via ${operatorLabel}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 px-0 pb-0 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={ui.closeCheckout}
    >
      <div
        className="flex max-h-[min(94dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-slate-200/90 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={ui.closeCheckout}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-violet-50 text-slate-800 shadow-sm transition hover:bg-violet-100"
            aria-label="Close checkout"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 id="checkout-title" className="text-sm font-semibold text-slate-900">
            Checkout
          </h2>
          <span className="w-9" />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <Card className="flex gap-3 border-violet-100/80 bg-gradient-to-br from-white to-violet-50/50 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/30">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {tier === "pro"
                  ? `Pro Plan — ${periodLabel}`
                  : `Creator Plan — ${periodLabel}`}
              </p>
              <p className="mt-1 text-xs font-medium text-violet-700">
                {summary.headline} · {summary.sub}
              </p>
            </div>
          </Card>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Choose payment method
            </p>
            <div className="mt-3 space-y-3">
              <PaymentCard
                title="Apple In-App Purchase"
                description="Fast · Secure · Managed by Apple"
                selected={checkout.paymentMethod === "apple"}
                onSelect={() => checkout.setPaymentMethod("apple")}
                icon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Apple className="h-5 w-5" />
                  </span>
                }
              />
              <PaymentCard
                title={
                  <span className="flex items-center gap-1">
                    Mobile Money <span aria-hidden>🇨🇩</span> RDC
                  </span>
                }
                description="M-Pesa · Orange · MTN · Airtel · Africell"
                selected={checkout.paymentMethod === "mobile_money"}
                onSelect={() => checkout.setPaymentMethod("mobile_money")}
                icon={
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Smartphone className="h-5 w-5" />
                  </span>
                }
              />
            </div>
          </div>

          {checkout.paymentMethod === "mobile_money" && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Payment details
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {operatorMeta.map((op) => {
                  const active = checkout.operator === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => checkout.setOperator(op.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        active
                          ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-200",
                      )}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Input
                  inputMode="tel"
                  placeholder="+243 8X XXX XXXX"
                  value={checkout.phone}
                  onChange={(e) => checkout.setPhone(e.target.value)}
                  aria-label="Phone number"
                />
                <Input
                  placeholder="Full name (optional)"
                  value={checkout.payerName}
                  onChange={(e) => checkout.setPayerName(e.target.value)}
                  aria-label="Full name"
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={checkout.email}
                  onChange={(e) => checkout.setEmail(e.target.value)}
                  aria-label="Email"
                />
              </div>
              <div className="flex gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-xs text-violet-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  A USSD prompt will be sent to your phone to confirm the payment.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <Button type="button" className="w-full py-3 text-base">
            {checkout.paymentMethod === "apple" ? (
              <>
                <Apple className="h-5 w-5" />
                {ctaLabel}
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                {ctaLabel}
              </>
            )}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-800"
          >
            Restore Previous Purchases
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({
  title,
  description,
  icon,
  selected,
  onSelect,
}: {
  title: ReactNode;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--hermi-radius-lg)] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        selected
          ? "border-violet-500 ring-2 ring-violet-100"
          : "border-slate-200/90",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {selected ? (
        <CheckCircle2 className="h-6 w-6 shrink-0 text-violet-600" />
      ) : (
        <Circle className="h-6 w-6 shrink-0 text-slate-300" />
      )}
    </button>
  );
}
