"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function PendingInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const ref = sp.get("ref");
  const hint = "Confirm payment on your phone if you have not finished yet.";
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ref) return;
    const poll = async () => {
      const res = await fetch(`/api/payments/maisha/status/${encodeURIComponent(ref)}`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
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

export default function BillingPendingPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
    >
      <PendingInner />
    </Suspense>
  );
}
