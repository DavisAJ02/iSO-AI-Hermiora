"use client";

import { Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { signInWithApple, signInWithGoogle, signUpWithEmail } from "@/lib/auth/authService";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import {
  AUTH_PASSWORD_MIN,
  isValidEmail,
  isValidPassword,
  passwordsMatch,
} from "@/lib/validation/auth";
import { createClient } from "@/utils/supabase/client";
import { AuthOrDivider, AuthSocialRow } from "./AuthSocialRow";
import { AuthShell } from "./AuthShell";
import { AuthTextField } from "./AuthTextField";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailOk = isValidEmail(email);
  const pwOk = isValidPassword(password);
  const matchOk = passwordsMatch(password, confirm) && confirm.length > 0;
  const nameOk = fullName.trim().length >= 2;
  const canSubmit = nameOk && emailOk && pwOk && matchOk && !busy;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setError(null);
      setBusy(true);
      try {
        const { data, error: err } = await signUpWithEmail(
          fullName.trim(),
          email,
          password,
        );
        if (err) {
          setError(err.message);
          return;
        }
        if (!data.session) {
          setNotice(
            "Check your inbox to confirm your email. After confirming, you can sign in.",
          );
          return;
        }
        const supabase = createClient();
        await supabase.from("profiles").update({ name: fullName.trim() }).eq("id", data.user!.id);
        router.replace(next);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [canSubmit, email, fullName, next, password, router],
  );

  const onGoogle = async () => {
    setError(null);
    setNotice(null);
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
    setNotice(null);
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
      title="Create your account"
      footer={
        <>
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
              className="font-semibold text-violet-700 underline-offset-4 hover:underline"
            >
              Sign In
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
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User className="h-4 w-4" aria-hidden />}
        />
        {fullName.length > 0 && !nameOk ? (
          <p className="text-xs font-medium text-rose-600">Use at least 2 characters.</p>
        ) : null}

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

        <AuthTextField
          type={showPw ? "text" : "password"}
          name="password"
          autoComplete="new-password"
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
        {password.length > 0 && !pwOk ? (
          <p className="text-xs font-medium text-rose-600">
            Password must be at least {AUTH_PASSWORD_MIN} characters.
          </p>
        ) : null}

        <AuthTextField
          type={showPw2 ? "text" : "password"}
          name="confirm"
          autoComplete="new-password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          icon={<Lock className="h-4 w-4" aria-hidden />}
          trailing={
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setShowPw2((v) => !v)}
              aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
            >
              {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        {confirm.length > 0 && !matchOk ? (
          <p className="text-xs font-medium text-rose-600">Passwords do not match.</p>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900" role="status">
            {notice}
          </p>
        ) : null}

        <Button type="submit" className="mt-1 w-full py-3 text-base" disabled={!canSubmit}>
          {busy ? "Creating account…" : "Create Account"}
          {!busy ? <Sparkles className="h-4 w-4" aria-hidden /> : null}
        </Button>
      </form>
    </AuthShell>
  );
}
