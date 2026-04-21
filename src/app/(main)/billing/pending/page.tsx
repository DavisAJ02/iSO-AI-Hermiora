"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import {
  goHomeAfterBillingReturn,
  useResyncSessionAfterExternalReturn,
} from "@/lib/auth/resyncSessionAfterReturn";
import { normalizeIncomingTxRef } from "@/lib/payments/txRefCanonical";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { cn } from "@/lib/utils";

function PendingInner() {
  useResyncSessionAfterExternalReturn();
  const sp = useSearchParams();
  const router = useRouter();
  const rawRef = sp.get("ref")?.trim() ?? "";
  const ref = rawRef ? normalizeIncomingTxRef(rawRef) ?? rawRef : "";
  const hint = "Confirm payment on your phone if you have not finished yet.";
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ref) return;
    const poll = async () => {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const usesNewLedger = ref.startsWith("HERMIORA_");
      const url = usesNewLedger
        ? `/api/payments/status?txRef=${encodeURIComponent(ref)}`
        : `/api/payments/maisha/status/${encodeURIComponent(ref)}`;
      const res = await fetch(url, {
        credentials: "same-origin",
        headers: authHeaders,
      });
      if (!res.ok) return;
      if (usesNewLedger) {
        const j = (await res.json()) as { status?: string };
        if (j.status === "success") {
          if (timer.current) clearInterval(timer.current);
          router.replace(`/billing/success?ref=${encodeURIComponent(ref)}`);
        } else if (j.status === "failed") {
          if (timer.current) clearInterval(timer.current);
          router.replace(`/billing/failed?ref=${encodeURIComponent(ref)}`);
        }
        return;
      }
      const j = (await res.json()) as { payment?: { status?: string } };
      const st = j.payment?.status;
      if (st === "SUCCESS") {
        if (timer.current) clearInterval(timer.current);
        router.replace(`/billing/success?ref=${encodeURIComponent(ref)}`);
      } else if (st === "FAILED" || st === "EXPIRED") {
        if (timer.current) clearInterval(timer.current);
        router.replace(`/billing/failed?ref=${encodeURIComponent(ref)}`);
      }
    };
    void poll();
    timer.current = setInterval(poll, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ref, router]);

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Loader2 className="h-8 w-8 animate-spin" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Payment pending</h1>
        <p className="mt-2 text-sm text-slate-600">{hint}</p>
        <p className="mt-2 text-xs text-slate-500">
          We&apos;ll keep checking automatically. You can leave this page open.
        </p>
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

export default function BillingPendingPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
    >
      <PendingInner />
    </Suspense>
  );
}
