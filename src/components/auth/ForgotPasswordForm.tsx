"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { sendPasswordReset } from "@/lib/auth/authService";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { isValidEmail } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import { AuthShell } from "./AuthShell";
import { AuthTextField } from "./AuthTextField";

export function ForgotPasswordForm({ initialNext }: { initialNext: string }) {
  const next = safeNextPath(initialNext);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailOk = isValidEmail(email);
  const canSubmit = emailOk && !busy && !sent;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setError(null);
      setBusy(true);
      try {
        const { error: err } = await sendPasswordReset(email);
        if (err) {
          setError(err.message);
          return;
        }
        setSent(true);
      } finally {
        setBusy(false);
      }
    },
    [canSubmit, email],
  );

  return (
    <AuthShell
      title="Reset your password"
      footer={
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
          className="text-sm font-semibold text-violet-700 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {!sent ? (
        <>
          <p className="mb-4 text-center text-sm leading-relaxed text-slate-600">
            Enter the email associated with your account. We&apos;ll send you a link to choose a
            new password.
          </p>
          <form className="space-y-3" onSubmit={onSubmit} noValidate>
            <AuthTextField
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" aria-hidden />}
            />
            {email.length > 0 && !emailOk ? (
              <p className="text-xs font-medium text-rose-600">Enter a valid email address.</p>
            ) : null}
            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full py-3 text-base" disabled={!canSubmit}>
              {busy ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        </>
      ) : (
        <div className="space-y-4 text-center">
          <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900" role="status">
            If an account exists for <span className="font-semibold">{email.trim()}</span>, you
            will receive an email with reset instructions shortly.
          </p>
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full border border-violet-300 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition",
              "hover:border-violet-400 hover:bg-violet-50/60 active:scale-[0.98]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
            )}
          >
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
