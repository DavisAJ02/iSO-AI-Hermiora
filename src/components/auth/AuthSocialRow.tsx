"use client";

import { Apple, Globe } from "lucide-react";

export function AuthSocialRow({
  onGoogle,
  onApple,
  disabled,
  busy,
}: {
  onGoogle: () => void;
  onApple: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const d = disabled || busy;
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={d}
        onClick={onGoogle}
        className="hermi-auth-social-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(192,132,252,0.55)]"
      >
        <Globe className="h-4 w-4 text-[#c4b5fd]" aria-hidden />
        Google
      </button>
      <button
        type="button"
        disabled={d}
        onClick={onApple}
        className="hermi-auth-social-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(192,132,252,0.55)]"
      >
        <Apple className="h-4 w-4 text-[var(--ha-text)]" aria-hidden />
        Apple
      </button>
    </div>
  );
}

export function AuthOrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="hermi-auth-divider-line" aria-hidden />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ha-text-2)]">
        or
      </span>
      <div className="hermi-auth-divider-line" aria-hidden />
    </div>
  );
}
