"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { FloatingGenerate } from "./FloatingGenerate";
import { CreateVideoSheet } from "@/components/create/CreateVideoSheet";
import { GoProSheet } from "@/components/subscription/GoProSheet";
import { CheckoutSheet } from "@/components/subscription/CheckoutSheet";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-[var(--hermi-bg)] pb-[calc(6.25rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 pt-[env(safe-area-inset-top)] md:px-8">
        {children}
      </div>
      <BottomNav />
      <FloatingGenerate />
      <CreateVideoSheet />
      <GoProSheet />
      <CheckoutSheet />
    </div>
  );
}
