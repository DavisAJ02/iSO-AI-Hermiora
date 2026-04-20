"use client";

import { Sparkles } from "lucide-react";
import { useApp } from "@/context/AppProvider";

export function FloatingGenerate() {
  const { ui } = useApp();
  return (
    <button
      type="button"
      onClick={ui.openCreate}
      className="pointer-events-auto fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full hermi-gradient-fill text-white shadow-hermi-float ring-4 ring-white/80 transition hover:brightness-105 active:scale-95 md:right-[max(1.5rem,calc(50%-22rem))]"
      aria-label="Create video"
    >
      <Sparkles className="h-6 w-6" strokeWidth={1.6} />
      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950 shadow-sm ring-2 ring-white">
        5
      </span>
    </button>
  );
}
