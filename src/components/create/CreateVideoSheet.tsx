"use client";

import { Mic, Paperclip, Sparkles, Wand2 } from "lucide-react";
import { useApp } from "@/context/AppProvider";
import { ART_STYLE_PRESETS, getArtStylePreset } from "@/lib/ai/artStylePresets";
import {
  CAPTION_STYLE_OPTIONS,
  EFFECT_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  QUICK_TEMPLATES,
  VOICE_STYLE_OPTIONS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

export function CreateVideoSheet() {
  const {
    createIdea,
    setCreateIdea,
    createControls,
    setCreateControls,
    ui,
    startGeneration,
    generation,
  } = useApp();
  const selectedArtStyle = getArtStylePreset(createControls.artStyle);

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
              <p className="mt-1 text-[11px] text-violet-800/80">{generation.statusText}</p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Idea
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
                placeholder="Describe your video idea... e.g. '5 dark facts about ancient Egypt'"
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
                <span className="ml-auto text-[11px] text-slate-400">{createIdea.length}/500</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Quick templates
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => setCreateIdea(`${template.label}: ${createIdea}`.trim())}
                  className={cn(
                    "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50",
                  )}
                >
                  {template.emoji} {template.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Creative controls
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Niche
                </span>
                <select
                  value={createControls.niche}
                  onChange={(e) => setCreateControls({ niche: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  {NICHE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Language
                </span>
                <select
                  value={createControls.language}
                  onChange={(e) => setCreateControls({ language: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Voice style
                </span>
                <select
                  value={createControls.voiceStyle}
                  onChange={(e) => setCreateControls({ voiceStyle: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  {VOICE_STYLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Art style
                </span>
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-3 text-sm text-violet-900">
                  {selectedArtStyle?.label ?? createControls.artStyle}
                </div>
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Caption style
                </span>
                <select
                  value={createControls.captionStyle}
                  onChange={(e) => setCreateControls({ captionStyle: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  {CAPTION_STYLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Visual art style picker
                </p>
                {selectedArtStyle ? (
                  <span className="text-[11px] font-medium text-violet-700">
                    {selectedArtStyle.summary}
                  </span>
                ) : null}
              </div>

              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {ART_STYLE_PRESETS.map((preset) => {
                  const active = preset.label === createControls.artStyle;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCreateControls({ artStyle: preset.label })}
                      className={cn(
                        "group shrink-0 text-left",
                        "w-[168px]",
                      )}
                    >
                      <div
                        className={cn(
                          "overflow-hidden rounded-[22px] border bg-white shadow-sm transition",
                          active
                            ? "border-violet-300 ring-2 ring-violet-200"
                            : "border-slate-200 hover:border-violet-200 hover:shadow-md",
                        )}
                      >
                        <div
                          className={cn(
                            "relative aspect-[3/5] bg-gradient-to-br",
                            preset.previewClass,
                          )}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.35),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.18))]" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="rounded-2xl bg-white/86 px-3 py-2 backdrop-blur">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {preset.tags.join(" • ")}
                              </p>
                              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700">
                                {preset.summary}
                              </p>
                            </div>
                          </div>
                          {active ? (
                            <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-lg">
                              ✓
                            </div>
                          ) : null}
                        </div>
                        <div className="px-3 py-3">
                          <p className="text-lg font-semibold text-slate-900">{preset.label}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Image effects
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EFFECT_OPTIONS.map((effect) => {
                  const active = createControls.effects.includes(effect);
                  return (
                    <button
                      key={effect}
                      type="button"
                      onClick={() =>
                        setCreateControls({
                          effects: active
                            ? createControls.effects.filter((item) => item !== effect)
                            : [...createControls.effects, effect],
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "border-violet-300 bg-violet-100 text-violet-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50",
                      )}
                    >
                      {effect}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Example script to match tone
              </span>
              <textarea
                rows={4}
                maxLength={1000}
                value={createControls.exampleScript ?? ""}
                onChange={(e) => setCreateControls({ exampleScript: e.target.value })}
                placeholder="Paste a short sample script so AI can mirror the pacing, tone, and structure."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <Button
            type="button"
            className="w-full py-3 text-base"
            onClick={() => {
              void startGeneration(createIdea || undefined);
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
