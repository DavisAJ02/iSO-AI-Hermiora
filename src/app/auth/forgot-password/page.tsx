import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--hermi-bg)] text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
