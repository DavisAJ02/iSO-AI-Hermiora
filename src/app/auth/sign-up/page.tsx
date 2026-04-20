import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--hermi-bg)] text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
