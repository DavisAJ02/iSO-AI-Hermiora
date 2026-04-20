"use client";

import { Mic, Paperclip, Sparkles, Wand2 } from "lucide-react";
import { useApp } from "@/context/AppProvider";
import { QUICK_TEMPLATES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

export function CreateVideoSheet() {
  const { createIdea, setCreateIdea, ui, startGeneration, generation } = useApp();
  if (!ui.createOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 px-0 pb-0 pt-16 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-title"
      onClick={ui.closeCreate}
    >
      <div
        className="flex max-h-[min(92dvh,840px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-slate-200/80 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={ui.closeCreate}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
          <h2 id="create-title" className="text-sm font-semibold text-slate-900">
            Create Video
          </h2>
          <span className="w-14" aria-hidden />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {generation.active && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-violet-900">
                <span>AI pipeline running</span>
                <span>{Math.round(generation.progress)}%</span>
              </div>
              <ProgressBar value={generation.progress} className="mt-2" />
              <p className="mt-1 text-[11px] text-violet-800/80">
                {generation.statusText}
              </p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              💡 Your idea
            </p>
            <div className="mt-2 rounded-[var(--hermi-radius-xl)] border border-violet-200/80 bg-white p-3 shadow-sm ring-2 ring-violet-100/70">
              <label htmlFor="create-idea" className="sr-only">
                Describe your video idea
              </label>
              <textarea
                id="create-idea"
                rows={5}
                maxLength={500}
                value={createIdea}
                onChange={(e) => setCreateIdea(e.target.value)}
                placeholder="Describe your video idea… e.g. '5 dark facts about ancient Egypt'"
                className="w-full resize-none bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Voice
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  AI Suggest
                </button>
                <span className="ml-auto text-[11px] text-slate-400">
                  {createIdea.length}/500
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              ⚡ Quick templates
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() =>
                    setCreateIdea(`${t.label}: ${createIdea}`.trim())
                  }
                  className={cn(
                    "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50",
                  )}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <Button
            type="button"
            className="w-full py-3 text-base"
            onClick={() => {
              startGeneration(createIdea || undefined);
              ui.closeCreate();
            }}
          >
            <Sparkles className="h-5 w-5" />
            Generate Video
          </Button>
        </div>
      </div>
    </div>
  );
}
