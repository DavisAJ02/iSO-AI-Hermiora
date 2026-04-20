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
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div className="hermi-auth-orb-layer" aria-hidden>
        <div className="hermi-auth-orb hermi-auth-orb--a" />
        <div className="hermi-auth-orb hermi-auth-orb--b" />
        <div className="hermi-auth-orb hermi-auth-orb--c" />
      </div>

      <div
        className={cn(
          "relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-y-contain",
          "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
        )}
      >
        <header className="hermi-auth-enter-logo flex shrink-0 flex-col items-center pb-6 pt-4 text-center">
          <div
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] via-[#9333ea] to-[#c026d3]"
            style={{
              boxShadow:
                "0 12px 40px rgba(124, 58, 237, 0.45), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            <Sparkles className="h-10 w-10 text-white" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="hermi-auth-gradient-title mt-4 text-[1.65rem] font-bold tracking-tight">
            Hermiora
          </h1>
          <p className="mt-1.5 text-sm font-medium text-[var(--ha-text-2)]">
            AI-Powered Video Creation
          </p>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-center pb-2">
          <div className="hermi-auth-enter-card hermi-auth-card-shell">
            <div className="hermi-auth-card-inner p-5 sm:p-6">
              <h2 className="text-center text-lg font-semibold tracking-tight text-[var(--ha-text)]">
                {title}
              </h2>
              <div className="mt-5">{children}</div>
            </div>
          </div>
        </main>

        {footer ? (
          <footer className="relative z-[1] mt-6 shrink-0 space-y-3 pb-2 text-center text-[var(--ha-text-2)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
