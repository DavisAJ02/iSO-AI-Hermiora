"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { signInWithApple, signInWithEmail, signInWithGoogle } from "@/lib/auth/authService";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { isValidEmail } from "@/lib/validation/auth";
import { AuthOrDivider, AuthSocialRow } from "./AuthSocialRow";
import { AuthTextField } from "./AuthTextField";
import { AuthShell } from "./AuthShell";

export function SignInForm({
  initialNext,
  oauthBanner,
}: {
  initialNext: string;
  oauthBanner?: string | null;
}) {
  const router = useRouter();
  const next = safeNextPath(initialNext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => oauthBanner ?? null);

  const emailOk = isValidEmail(email);
  const canSubmit = emailOk && password.length > 0 && !busy;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setError(null);
      setBusy(true);
      try {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          setError(err.message);
          return;
        }
        router.replace(next);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [canSubmit, email, password, next, router],
  );

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await signInWithGoogle(next);
      if (err) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onApple = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await signInWithApple(next);
      if (err) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      footer={
        <>
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href={`/auth/sign-up?next=${encodeURIComponent(next)}`}
              className="font-semibold text-violet-700 underline-offset-4 hover:underline"
            >
              Sign Up
            </Link>
          </p>
          <p className="mx-auto max-w-xs text-[11px] leading-relaxed text-slate-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </>
      }
    >
      <AuthSocialRow onGoogle={onGoogle} onApple={onApple} busy={busy} />

      <AuthOrDivider />

      <form className="space-y-3" onSubmit={onSubmit} noValidate>
        <AuthTextField
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={email.length > 0 && !emailOk}
          aria-describedby={email.length > 0 && !emailOk ? "signin-email-err" : undefined}
          icon={<Mail className="h-4 w-4" aria-hidden />}
        />
        {email.length > 0 && !emailOk ? (
          <p id="signin-email-err" className="text-xs font-medium text-rose-600">
            Enter a valid email address.
          </p>
        ) : null}

        <AuthTextField
          type={showPw ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" aria-hidden />}
          trailing={
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex justify-end pt-0.5">
          <Link
            href={`/auth/forgot-password?next=${encodeURIComponent(next)}`}
            className="text-sm font-semibold text-violet-700 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-1 w-full py-3 text-base" disabled={!canSubmit}>
          {busy ? "Signing in…" : "Sign In"}
          {!busy ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
        </Button>
      </form>
    </AuthShell>
  );
}
