import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--hermi-bg)] text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
