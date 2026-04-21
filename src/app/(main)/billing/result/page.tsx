"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  goHomeAfterBillingReturn,
  useResyncSessionAfterExternalReturn,
} from "@/lib/auth/resyncSessionAfterReturn";
import { normalizeIncomingTxRef } from "@/lib/payments/txRefCanonical";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { cn } from "@/lib/utils";
import type { PaymentStatusResponse } from "@/lib/payments/types-maishapay";

/**
 * Landing page after MaishaPay `callbackUrl` redirect. Never trust URL “status” params for
 * entitlement — we poll `/api/payments/status` until the webhook has updated the ledger.
 */
function BillingResultInner() {
  useResyncSessionAfterExternalReturn();
  const sp = useSearchParams();
  const router = useRouter();
  const raw =
    sp.get("txRef")?.trim() ||
    sp.get("ref")?.trim() ||
    "";
  const txRef = raw ? normalizeIncomingTxRef(raw) ?? "" : "";
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const [slowNotice, setSlowNotice] = useState(false);
  const [noWebhookHint, setNoWebhookHint] = useState(false);

  useEffect(() => {
    if (!txRef) return;
    pollCount.current = 0;
    setSlowNotice(false);
    setNoWebhookHint(false);
    const poll = async () => {
      pollCount.current += 1;
      if (pollCount.current === 20) setSlowNotice(true);
      if (pollCount.current === 45) setNoWebhookHint(true);

      const authHeaders = await getMaishaRequestAuthHeaders();
      /** Query-param route avoids slashes in path (%2F / proxy issues) */
      const res = await fetch(
        `/api/payments/status?txRef=${encodeURIComponent(txRef)}`,
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

  if (!raw) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Missing payment reference</h1>
        <p className="text-sm text-slate-600">Open this page from the checkout return link after paying.</p>
        <button
          type="button"
          onClick={() => void goHomeAfterBillingReturn()}
          className={cn(
            "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-slate-900 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]",
          )}
        >
          Back to Hermiora
        </button>
      </div>
    );
  }

  if (!txRef) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Invalid payment link</h1>
        <p className="text-sm text-slate-600">
          We couldn&apos;t read the transaction id from this URL. Use the link from checkout or open Billing from your profile.
        </p>
        <button
          type="button"
          onClick={() => void goHomeAfterBillingReturn()}
          className={cn(
            "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-slate-900 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]",
          )}
        >
          Back to Hermiora
        </button>
      </div>
    );
  }

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
        {slowNotice ? (
          <p className="mt-3 text-sm text-amber-800">
            Still confirming… PSP callbacks can take a minute.
          </p>
        ) : null}
        {noWebhookHint ? (
          <p className="mt-2 text-xs text-slate-500">
            {process.env.NODE_ENV === "development"
              ? "Local tip: MaishaPay must POST to your machine — use a tunnel (ngrok, etc.), set APP_BASE_URL to that HTTPS URL, or test on your deployed site."
              : "If this stays stuck, open Profile after a few minutes — your plan activates when our servers receive confirmation."}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void goHomeAfterBillingReturn()}
        className={cn(
          "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-slate-900 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]",
        )}
      >
        Back to Hermiora
      </button>
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
