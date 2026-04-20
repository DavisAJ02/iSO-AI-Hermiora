"use client";

import type { ReactNode } from "react";
import { Check, Crown, Star, X, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/context/AppProvider";
import { planPriceLabel } from "@/lib/pricing";
import { testimonials } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/types";

const rows: {
  feature: string;
  free: string;
  creator: string;
  pro: string;
  creatorViolet?: boolean;
  proViolet?: boolean;
}[] = [
  {
    feature: "AI Videos / Month",
    free: "5",
    creator: "50",
    pro: "∞",
    creatorViolet: true,
    proViolet: true,
  },
  {
    feature: "Video Length",
    free: "60s",
    creator: "5 min",
    pro: "No limit",
    creatorViolet: true,
    proViolet: true,
  },
  { feature: "4K Export", free: "No", creator: "Yes", pro: "Yes" },
  { feature: "Custom Voice Clone", free: "No", creator: "No", pro: "Yes" },
  { feature: "Auto-Post Scheduling", free: "No", creator: "Yes", pro: "Yes" },
  { feature: "Priority Rendering", free: "No", creator: "No", pro: "Yes" },
  { feature: "Watermark-Free", free: "No", creator: "Yes", pro: "Yes" },
  { feature: "Analytics Dashboard", free: "No", creator: "No", pro: "Yes" },
  { feature: "Dedicated Support", free: "No", creator: "No", pro: "Yes" },
];

export function GoProSheet() {
  const { billing, checkout, ui } = useApp();
  if (!ui.goProOpen) return null;

  const startCheckout = () => {
    const tier: PlanTier =
      checkout.selectedTier === "free" ? "pro" : checkout.selectedTier;
    checkout.setSelectedTier(tier);
    ui.closeGoPro();
    ui.openCheckout();
  };

  const effectiveTier: PlanTier =
    checkout.selectedTier === "free" ? "pro" : checkout.selectedTier;
  const ctaMeta = planPriceLabel(effectiveTier, billing.period);
  const ctaIcon =
    effectiveTier === "creator" ? (
      <Zap className="h-5 w-5" />
    ) : (
      <Crown className="h-5 w-5" />
    );

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gopro-title"
    >
      <div className="mx-auto max-w-lg px-4 pb-32 pt-[env(safe-area-inset-top)] md:max-w-3xl md:pb-24">
        <div className="flex items-start py-3">
          <button
            type="button"
            onClick={ui.closeGoPro}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <h1
          id="gopro-title"
          className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
        >
          Go Pro
        </h1>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 text-white shadow-[0_20px_60px_rgba(124,58,237,0.45)]">
            <Crown className="relative z-[1] h-10 w-10" strokeWidth={1.5} />
            <div className="pointer-events-none absolute inset-[-30%] rounded-full bg-violet-400/35 blur-3xl" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-violet-950 md:text-2xl">
            Unlock Your Full Potential
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Join 50,000+ creators making viral content with AI
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-md rounded-full border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner">
          {(["monthly", "yearly"] as const).map((p) => {
            const active = billing.period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => billing.setPeriod(p)}
                className={cn(
                  "relative flex-1 rounded-full py-2.5 text-xs font-semibold capitalize transition",
                  active
                    ? "hermi-gradient-fill text-white shadow-md shadow-violet-500/30"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {p === "yearly" && (
                  <span className="absolute -right-1 -top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm ring-2 ring-white">
                    Save 40%
                  </span>
                )}
                {p}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-3 gap-2 md:gap-4">
          <PlanCard
            title="Free"
            selected={checkout.selectedTier === "free"}
            onSelect={() => checkout.setSelectedTier("free")}
            iconSlot={
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/80">
                <Star className="h-5 w-5" strokeWidth={1.6} />
              </span>
            }
            priceSlot={
              <>
                <p className="mt-1 text-2xl font-bold text-slate-900">$0</p>
                <p className="text-[11px] font-medium text-slate-500">forever</p>
              </>
            }
          />
          <PlanCard
            title="Creator"
            selected={checkout.selectedTier === "creator"}
            onSelect={() => checkout.setSelectedTier("creator")}
            iconSlot={
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80">
                <Zap className="h-5 w-5" fill="currentColor" />
              </span>
            }
            priceSlot={<CreatorPrice period={billing.period} />}
          />
          <div className="relative pt-5">
            <Badge
              tone="pro"
              className="absolute left-1/2 top-0 z-[1] -translate-x-1/2 whitespace-nowrap px-3 py-1 text-[10px] font-bold normal-case tracking-wide shadow-md"
            >
              MOST POPULAR
            </Badge>
            <PlanCard
              title="Pro"
              selected={checkout.selectedTier === "pro"}
              onSelect={() => checkout.setSelectedTier("pro")}
              popular
              iconSlot={
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-md ring-2 ring-amber-200/80">
                  <Crown className="h-5 w-5" strokeWidth={2} />
                </span>
              }
              priceSlot={<ProPrice period={billing.period} />}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Feature Comparison</h2>
          <div className="mt-3 overflow-hidden rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white shadow-sm">
            <div className="grid grid-cols-4 bg-violet-50/90 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:px-3">
              <span className="pl-1">Feature</span>
              <span className="text-center">Free</span>
              <span className="text-center text-violet-700">Creator</span>
              <span className="text-center text-violet-800">Pro</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-4 items-center gap-0.5 px-2 py-2.5 text-[11px] md:px-3"
                >
                  <span className="pr-1 text-left text-slate-700">{row.feature}</span>
                  <CompareCell value={row.free} />
                  <CompareCell
                    value={row.creator}
                    tint={row.creatorViolet ? "creator" : undefined}
                  />
                  <CompareCell
                    value={row.pro}
                    tint={row.proViolet ? "pro" : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Loved by Creators</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {testimonials.map((t) => (
              <Card
                key={t.id}
                className="min-w-[240px] max-w-xs shrink-0 border-slate-200/90 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-800">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {t.handle}
                    </p>
                    <p className="text-[11px] text-amber-500">★★★★★</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  “{t.quote}”
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[71] bg-gradient-to-t from-white via-white/98 to-transparent pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 md:static md:pointer-events-auto md:bg-transparent md:pb-0 md:pt-10">
          <div className="pointer-events-auto mx-auto max-w-lg px-1 md:px-0">
            <Button
              type="button"
              className="w-full py-3.5 text-base shadow-lg shadow-violet-500/25"
              onClick={startCheckout}
            >
              {ctaIcon}
              {ctaMeta.cta}
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Cancel anytime · No hidden fees · Secure payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  selected,
  onSelect,
  iconSlot,
  priceSlot,
  popular,
}: {
  title: string;
  selected: boolean;
  onSelect: () => void;
  iconSlot: ReactNode;
  priceSlot: ReactNode;
  popular?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[9.5rem] flex-col rounded-[var(--hermi-radius-lg)] border bg-white p-3 text-left shadow-sm transition md:p-4",
        selected && !popular && "border-violet-500 ring-2 ring-violet-200 shadow-md",
        selected &&
          popular &&
          "scale-[1.02] border-2 border-violet-500 shadow-xl shadow-violet-500/20 ring-2 ring-fuchsia-200/60",
        !selected && "border-slate-200/90 hover:-translate-y-0.5 hover:shadow-md",
        popular && !selected && "border-violet-200/90 ring-1 ring-violet-100",
      )}
    >
      <div className="mb-2">{iconSlot}</div>
      <p className="text-xs font-bold text-slate-900 md:text-sm">{title}</p>
      <div className="mt-1 flex-1">{priceSlot}</div>
    </button>
  );
}

function CreatorPrice({ period }: { period: "monthly" | "yearly" }) {
  const meta = planPriceLabel("creator", period);
  return (
    <>
      <p className="mt-1 text-lg font-bold leading-tight text-violet-700 md:text-xl">
        {meta.headline}
      </p>
      <p className="text-[11px] font-medium text-slate-500">{meta.sub}</p>
    </>
  );
}

function ProPrice({ period }: { period: "monthly" | "yearly" }) {
  const meta = planPriceLabel("pro", period);
  const match = meta.headline.match(/^\$(\d+)(\.\d+)?/);
  const head = match ? match[1] : "19";
  const tail = match && match[2] ? match[2] : ".99";
  const rest = meta.headline.replace(/^\$\d+(\.\d+)?/, "");
  return (
    <>
      <p className="mt-1 flex flex-wrap items-baseline gap-0.5 text-slate-900">
        <span className="text-lg font-bold md:text-xl">$</span>
        <span className="text-3xl font-extrabold tracking-tight text-amber-500 md:text-4xl">
          {head}
        </span>
        <span className="text-lg font-bold text-slate-900 md:text-xl">
          {tail}
          {rest}
        </span>
      </p>
      <p className="text-[11px] font-medium text-slate-500">{meta.sub}</p>
    </>
  );
}

function CompareCell({
  value,
  tint,
}: {
  value: string;
  tint?: "creator" | "pro";
}) {
  const isBool = value === "Yes" || value === "No";
  const positive = value === "Yes" || value === "∞" || value === "No limit";
  return (
    <div
      className={cn(
        "flex items-center justify-center text-center text-[11px] font-semibold",
        tint === "creator" && !isBool && "text-violet-700",
        tint === "pro" && !isBool && "text-violet-800",
        !tint && "text-slate-700",
      )}
    >
      {isBool ? (
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
            positive
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-slate-200 text-slate-600",
          )}
        >
          {positive ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : "✕"}
        </span>
      ) : (
        value
      )}
    </div>
  );
}
