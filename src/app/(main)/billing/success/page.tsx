"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  goHomeAfterBillingReturn,
  useResyncSessionAfterExternalReturn,
} from "@/lib/auth/resyncSessionAfterReturn";
import { normalizeIncomingTxRef } from "@/lib/payments/txRefCanonical";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { cn } from "@/lib/utils";

function SuccessInner() {
  useResyncSessionAfterExternalReturn();
  const sp = useSearchParams();
  const rawRef = sp.get("ref")?.trim() ?? "";
  const ref = rawRef ? normalizeIncomingTxRef(rawRef) ?? rawRef : "";
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    (async () => {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const usesNewLedger = ref.startsWith("HERMIORA_");
      const url = usesNewLedger
        ? `/api/payments/status?txRef=${encodeURIComponent(ref)}`
        : `/api/payments/maisha/status/${encodeURIComponent(ref)}`;
      const res = await fetch(url, {
        credentials: "same-origin",
        headers: authHeaders,
      });
      if (!res.ok || cancelled) return;
      if (usesNewLedger) {
        const j = (await res.json()) as { plan?: string | null };
        if (j.plan) setPlan(j.plan);
      } else {
        const j = (await res.json()) as { payment?: { plan?: string } };
        if (j.payment?.plan) setPlan(j.payment.plan);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Payment confirmed</h1>
        <p className="mt-2 text-sm text-slate-600">
          {plan
            ? `Your ${plan === "pro" ? "Pro" : "Creator"} plan is active.`
            : "Your subscription is active."}
        </p>
        <p className="mt-1 text-xs text-slate-500">Instant activation after confirmation.</p>
      </div>
      <button
        type="button"
        onClick={() => void goHomeAfterBillingReturn()}
        className={cn(
          "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 py-3 text-base font-semibold text-white shadow-hermi-glow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
          "hermi-gradient-fill hover:brightness-105 active:scale-[0.98]",
        )}
      >
        Back to Hermiora
      </button>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
    >
      <SuccessInner />
    </Suspense>
  );
}
