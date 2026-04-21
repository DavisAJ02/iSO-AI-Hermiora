"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { cn } from "@/lib/utils";
import type { PaymentStatusResponse } from "@/lib/payments/types-maishapay";

/**
 * Landing page after MaishaPay `callbackUrl` redirect. Never trust URL “status” params for
 * entitlement — we poll `/api/payments/[txRef]/status` until the webhook has updated the ledger.
 */
function BillingResultInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const txRef = sp.get("txRef")?.trim() || sp.get("ref")?.trim() || "";
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!txRef) return;
    const poll = async () => {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch(
        `/api/payments/${encodeURIComponent(txRef)}/status`,
        {
          credentials: "same-origin",
          headers: authHeaders,
        },
      );
      if (!res.ok) return;
      const j = (await res.json()) as PaymentStatusResponse;
      if (j.status === "success") {
        if (timer.current) clearInterval(timer.current);
        router.replace(`/billing/success?ref=${encodeURIComponent(txRef)}`);
      } else if (j.status === "failed") {
        if (timer.current) clearInterval(timer.current);
        router.replace(`/billing/failed?ref=${encodeURIComponent(txRef)}`);
      }
    };
    void poll();
    timer.current = setInterval(poll, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [txRef, router]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Loader2 className="h-8 w-8 animate-spin" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Checking payment…</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confirm on your phone if prompted. We&apos;ll verify your payment securely from our servers —
          please keep this tab open for a moment.
        </p>
      </div>
      <Link
        href="/"
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]",
        )}
      >
        Back to Hermiora
      </Link>
    </div>
  );
}

export default function BillingResultPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
    >
      <BillingResultInner />
    </Suspense>
  );
}
