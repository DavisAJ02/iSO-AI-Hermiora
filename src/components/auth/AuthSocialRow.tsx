"use client";

import { Apple, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

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
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-[var(--hermi-radius-md)] border border-slate-200/90 bg-white text-sm font-semibold text-slate-800 shadow-sm transition",
          "hover:border-violet-200 hover:bg-violet-50/40 active:scale-[0.98]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
          "disabled:pointer-events-none disabled:opacity-45",
        )}
      >
        <Globe className="h-4 w-4 text-violet-600" aria-hidden />
        Google
      </button>
      <button
        type="button"
        disabled={d}
        onClick={onApple}
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-[var(--hermi-radius-md)] border border-slate-200/90 bg-white text-sm font-semibold text-slate-800 shadow-sm transition",
          "hover:border-violet-200 hover:bg-violet-50/40 active:scale-[0.98]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
          "disabled:pointer-events-none disabled:opacity-45",
        )}
      >
        <Apple className="h-4 w-4 text-slate-900" aria-hidden />
        Apple
      </button>
    </div>
  );
}

export function AuthOrDivider() {
  return (
    <div className="relative my-5 flex items-center justify-center">
      <div className="absolute inset-x-0 h-px bg-slate-200" aria-hidden />
      <span className="relative bg-white/90 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
        or
      </span>
    </div>
  );
}
