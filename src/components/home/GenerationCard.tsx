"use client";

import {
  Check,
  Clapperboard,
  Mic2,
  Sparkles,
  TextQuote,
  Video,
} from "lucide-react";
import { useApp, usePipelineStepState } from "@/context/AppProvider";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import type { PipelineStepId } from "@/lib/types";

const icons: Record<PipelineStepId, typeof Sparkles> = {
  hook: TextQuote,
  script: Clapperboard,
  scenes: Video,
  voice: Mic2,
  rendering: Sparkles,
};

export function GenerationCard() {
  const { generation } = useApp();
  const steps = usePipelineStepState(generation.currentStep);

  if (!generation.active && generation.progress === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-[var(--hermi-radius-xl)] border border-slate-200/80 bg-white p-4 shadow-hermi-card md:p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-violet-600" strokeWidth={2} />
            {generation.active ? "AI is creating your video" : "Generation update"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{generation.statusText}</p>
        </div>
        <span className="text-sm font-bold text-violet-600">
          {Math.round(generation.progress)}%
        </span>
      </div>
      <div className="relative mt-5 flex justify-between gap-0.5 px-0.5">
        {steps.map((step) => {
          const Icon = icons[step.id];
          const done = step.done;
          const active = step.active && generation.active;
          const large = active && !done;
          return (
            <div
              key={step.id}
              className="flex flex-1 flex-col items-center gap-2 text-center"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-2xl border transition",
                  large ? "h-12 w-12 border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/35 hermi-step-active" : "h-10 w-10",
                  done &&
                    !large &&
                    "border-violet-500 bg-violet-600 text-white shadow-sm shadow-violet-500/30",
                  !done &&
                    !active &&
                    "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className={cn(large ? "h-5 w-5" : "h-4 w-4")} strokeWidth={1.75} />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-semibold sm:block",
                  active || done ? "text-slate-800" : "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-5">
        <ProgressBar value={generation.progress} size="hero" />
        <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
          {generation.active ? "Processing…" : "Pipeline complete"}
        </p>
      </div>
    </section>
  );
}
