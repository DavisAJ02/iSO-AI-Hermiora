"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[var(--hermi-bg)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:opacity-80"
      >
        <div className="absolute -left-1/4 top-0 h-[min(420px,55vh)] w-[min(420px,90vw)] rounded-full bg-violet-300/25 blur-3xl motion-reduce:animate-none" />
        <div className="absolute -right-1/4 top-1/3 h-[min(380px,50vh)] w-[min(380px,85vw)] rounded-full bg-fuchsia-300/20 blur-3xl motion-reduce:animate-none" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl motion-reduce:animate-none" />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex shrink-0 flex-col items-center pt-4 pb-6 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 shadow-[0_12px_40px_rgba(124,58,237,0.35)]">
            <Sparkles className="h-9 w-9 text-white" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="hermi-gradient-text mt-4 text-2xl font-bold tracking-tight">
            Hermiora
          </h1>
          <p className="mt-1 text-sm font-medium text-violet-900/70">AI-Powered Video Creation</p>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-center">
          <div
            className={cn(
              "rounded-[var(--hermi-radius-xl)] border border-white/80 bg-white/85 p-5 shadow-[var(--hermi-shadow-card)] backdrop-blur-xl",
              "sm:p-6",
            )}
          >
            <h2 className="text-center text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            <div className="mt-5">{children}</div>
          </div>
        </main>

        {footer ? (
          <footer className="relative z-[1] mt-6 shrink-0 space-y-3 pb-2 text-center">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
