"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function FailedInner() {
  const sp = useSearchParams();
  const ref = sp.get("ref");

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <XCircle className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Payment didn&apos;t go through</h1>
        <p className="mt-2 text-sm text-slate-600">
          {ref
            ? "You can try again from checkout. If money left your wallet, contact support with your reference."
            : "You can try again from checkout."}
        </p>
      </div>
      <Link
        href="/"
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-base font-semibold text-white shadow-hermi-glow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
          "hermi-gradient-fill hover:brightness-105 active:scale-[0.98]",
        )}
      >
        Try again from app
      </Link>
    </div>
  );
}

export default function BillingFailedPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}
    >
      <FailedInner />
    </Suspense>
  );
}
