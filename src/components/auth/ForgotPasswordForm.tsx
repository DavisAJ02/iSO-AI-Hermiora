"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { sendPasswordReset } from "@/lib/auth/authService";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { isValidEmail } from "@/lib/validation/auth";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { AuthShell } from "./AuthShell";
import { AuthSubmitButton } from "./AuthSubmitButton";
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
        <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`} className="hermi-auth-link text-sm">
          Back to sign in
        </Link>
      }
    >
      {!sent ? (
        <>
          <p className="mb-4 text-center text-sm leading-relaxed text-[var(--ha-text-2)]">
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
              invalid={email.length > 0 && !emailOk}
              icon={<Mail className="h-4 w-4" aria-hidden />}
            />
            {email.length > 0 && !emailOk ? (
              <p className="hermi-auth-field-hint">Enter a valid email address.</p>
            ) : null}
            {error ? <AuthErrorBanner message={error} /> : null}
            <AuthSubmitButton busy={busy} disabled={!canSubmit}>
              {busy ? "Sending…" : "Send Reset Link"}
            </AuthSubmitButton>
          </form>
        </>
      ) : (
        <div className="space-y-4 text-center">
          <div className="hermi-auth-notice-banner text-left text-sm" role="status">
            If an account exists for <span className="font-semibold text-[#d1fae5]">{email.trim()}</span>
            , you will receive an email with reset instructions shortly.
          </div>
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
            className="hermi-auth-btn-outline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(192,132,252,0.55)]"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
