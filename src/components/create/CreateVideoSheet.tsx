"use client";

import { Check, FolderKanban, Mic, Music4, Paperclip, Pin, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { ART_STYLE_PRESETS, getArtStylePreset } from "@/lib/ai/artStylePresets";
import {
  BACKGROUND_MUSIC_OPTIONS,
  EFFECT_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  QUICK_TEMPLATES,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

const VOICE_STYLE_PRESETS = [
  {
    label: "Narration",
    summary: "Balanced storyteller tone with a clean pace.",
    accentClass: "from-sky-100 via-slate-100 to-slate-200",
  },
  {
    label: "High Energy",
    summary: "Fast, punchy, conversion-focused creator delivery.",
    accentClass: "from-fuchsia-100 via-rose-100 to-orange-100",
  },
  {
    label: "Calm Explainer",
    summary: "Confident and reassuring for educational content.",
    accentClass: "from-emerald-100 via-teal-100 to-sky-100",
  },
  {
    label: "Dark Dramatic",
    summary: "Heavy pauses and gravity for suspense or mythic topics.",
    accentClass: "from-slate-400 via-slate-600 to-slate-800",
  },
  {
    label: "Storyteller",
    summary: "Emotional, immersive pacing for narrative hooks.",
    accentClass: "from-amber-100 via-rose-100 to-violet-100",
  },
] as const;

const CAPTION_STYLE_PRESETS = [
  {
    label: "Bold Stroke",
    summary: "Big punchy words with thick readable contrast.",
    accentClass: "from-slate-900 via-slate-700 to-slate-500",
  },
  {
    label: "Red Highlight",
    summary: "Key power words pop with urgency and emphasis.",
    accentClass: "from-rose-500 via-red-500 to-orange-400",
  },
  {
    label: "Sleek",
    summary: "Minimal modern captions for polished premium edits.",
    accentClass: "from-slate-100 via-slate-200 to-slate-300",
  },
  {
    label: "Karaoke",
    summary: "Word-by-word timing for strong retention and rhythm.",
    accentClass: "from-violet-300 via-fuchsia-300 to-pink-300",
  },
  {
    label: "Creator Pop",
    summary: "Social-native caption blocks with creator flair.",
    accentClass: "from-amber-200 via-orange-200 to-fuchsia-200",
  },
] as const;

const PINNED_ART_STYLES_KEY = "hermiora:pinned-art-styles";

const TEMPLATE_STARTERS: Record<string, string> = {
  "Scary Story": "A chilling story hook with a twist ending people will replay.",
  Motivation: "A short high-retention pep talk that feels urgent and cinematic.",
  History: "A surprising historical fact sequence with a dramatic reveal.",
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function loadPinnedArtStyles() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PINNED_ART_STYLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 6);
  } catch {
    return [];
  }
}

export function CreateVideoSheet() {
  const {
    createIdea,
    setCreateIdea,
    createSeriesId,
    setCreateSeriesId,
    createControls,
    setCreateControls,
    ui,
    startGeneration,
    generation,
    series,
  } = useApp();

  const [pinnedArtStyles, setPinnedArtStyles] = useState<string[]>(loadPinnedArtStyles);
  const [isListening, setIsListening] = useState(false);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [suggestAlternatives, setSuggestAlternatives] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<{
    stop: () => void;
  } | null>(null);
  const selectedArtStyle = getArtStylePreset(createControls.artStyle);
  const selectedVoiceStyle = VOICE_STYLE_PRESETS.find(
    (preset) => preset.label === createControls.voiceStyle,
  );
  const selectedCaptionStyle = CAPTION_STYLE_PRESETS.find(
    (preset) => preset.label === createControls.captionStyle,
  );
  const selectedSeries = series.items.find((item) => item.id === createSeriesId) ?? null;
  const directionPills = [
    createControls.niche,
    createControls.language,
    createControls.voiceStyle,
    createControls.captionStyle,
    createControls.artStyle,
    createControls.backgroundMusic,
    ...createControls.effects.slice(0, 2),
  ].filter(Boolean);

  const orderedArtStylePresets = useMemo(() => {
    const pinned = ART_STYLE_PRESETS.filter((preset) => pinnedArtStyles.includes(preset.label));
    const rest = ART_STYLE_PRESETS.filter((preset) => !pinnedArtStyles.includes(preset.label));
    return [...pinned, ...rest];
  }, [pinnedArtStyles]);

  const togglePinnedArtStyle = (label: string) => {
    setPinnedArtStyles((current) => {
      const next = current.includes(label)
        ? current.filter((item) => item !== label)
        : [label, ...current].slice(0, 6);
      try {
        window.localStorage.setItem(PINNED_ART_STYLES_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failures and still update in-memory state.
      }
      return next;
    });
  };

  const applyTemplate = (label: string) => {
    const starter = TEMPLATE_STARTERS[label];
    const trimmed = createIdea.trim();
    if (!trimmed) {
      setCreateIdea(starter ?? label);
      return;
    }

    if (trimmed.toLowerCase().startsWith(`${label.toLowerCase()}:`)) {
      return;
    }

    setCreateIdea(`${label}: ${trimmed}`);
  };

  const saveCurrentControlsAsSeries = async () => {
    const title =
      createIdea.trim().split(":")[0]?.trim() ||
      selectedSeries?.title ||
      "New Series";
    const createdSeries = await series.create({
      title: title.slice(0, 80),
      description: createIdea.trim() ? createIdea.trim().slice(0, 280) : null,
      continuityMode: false,
      storyBible: null,
      defaultCreativeControls: createControls,
    });
    if (!createdSeries) return;
    setCreateSeriesId(createdSeries.id);
    setToolMessage(`Series "${createdSeries.title}" saved. You can refine it in Library.`);
  };

  const toggleVoiceCapture = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognitionCtor = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;

    if (!recognitionCtor) {
      setToolMessage("Voice dictation is not available in this browser.");
      return;
    }

    const baseIdea = createIdea;
    const recognition = new recognitionCtor();
    recognition.lang = createControls.language === "French" ? "fr-FR" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setCreateIdea(`${baseIdea ? `${baseIdea} ` : ""}${transcript}`.trim());
      setToolMessage("Voice idea captured.");
    };
    recognition.onerror = (event) => {
      setToolMessage(`Voice capture failed: ${event.error}`);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setToolMessage("Listening...");
  };

  const attachReferenceFile = async (file: File) => {
    try {
      const text = await file.text();
      const trimmed = text.trim().slice(0, 3000);
      if (!trimmed) {
        setToolMessage("That file did not contain readable text.");
        return;
      }

      setCreateControls({
        exampleScript: [createControls.exampleScript?.trim(), trimmed].filter(Boolean).join("\n\n"),
      });
      setToolMessage(`Attached ${file.name} as reference text.`);
    } catch {
      setToolMessage("That file could not be read.");
    }
  };

  const requestAiSuggestion = async () => {
    setSuggestBusy(true);
    setToolMessage(null);
    setSuggestAlternatives([]);
    try {
      const res = await fetch("/api/ideas/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentIdea: createIdea,
          seriesId: createSeriesId,
          creativeControls: createControls,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        suggestion?: { primaryIdea?: string; alternatives?: string[]; reasoning?: string };
      };

      if (!res.ok || !data.suggestion?.primaryIdea) {
        setToolMessage(data.error ?? "AI could not suggest an idea right now.");
        return;
      }

      setCreateIdea(data.suggestion.primaryIdea);
      setSuggestAlternatives((data.suggestion.alternatives ?? []).slice(0, 3));
      setToolMessage(data.suggestion.reasoning ?? "AI suggestion ready.");
    } finally {
      setSuggestBusy(false);
    }
  };

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
        className="flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200/80 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-[28px]"
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

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-5">
          {generation.active ? (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-violet-900">
                <span>AI pipeline running</span>
                <span>{Math.round(generation.progress)}%</span>
              </div>
              <ProgressBar value={generation.progress} className="mt-2" />
              <p className="mt-1 text-[11px] text-violet-800/80">{generation.statusText}</p>
            </div>
          ) : null}

          <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(250,245,255,0.96),rgba(255,255,255,1))] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Creative Direction
                </p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                  Dial in the niche, voice, captions, and visual treatment before we generate.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-violet-700">
                  {selectedArtStyle?.label ?? createControls.artStyle} look
                </div>
                <button
                  type="button"
                  onClick={() => void saveCurrentControlsAsSeries()}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
                >
                  Save as series
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {directionPills.map((pill, index) => (
                <span
                  key={`${pill}-${index}`}
                  className="rounded-full border border-white bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
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
                    rows={6}
                    maxLength={500}
                    value={createIdea}
                    onChange={(e) => setCreateIdea(e.target.value)}
                    placeholder="Describe your video idea... e.g. '5 dark facts about ancient Egypt'"
                    className="w-full resize-none bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={toggleVoiceCapture}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      {isListening ? "Stop" : "Voice"}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestAiSuggestion()}
                      disabled={suggestBusy}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {suggestBusy ? "Thinking..." : "AI Suggest"}
                    </button>
                    <span className="ml-auto text-[11px] text-slate-400">{createIdea.length}/500</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.json,.csv,text/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void attachReferenceFile(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  {toolMessage ? (
                    <p className="mt-3 text-[11px] font-medium text-violet-700">{toolMessage}</p>
                  ) : null}
                  {suggestAlternatives.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestAlternatives.map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() => setCreateIdea(idea)}
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
                      onClick={() => applyTemplate(template.label)}
                      className={cn(
                        "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50",
                      )}
                    >
                      {template.emoji} {template.label}
                    </button>
                  ))}
                </div>
              </div>

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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Series
                  </p>
                  {selectedSeries ? (
                    <span className="text-[11px] font-medium text-violet-700">
                      {selectedSeries.projectCount} videos
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCreateSeriesId(null)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition",
                      !selectedSeries
                        ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Standalone project</p>
                      {!selectedSeries ? <Check className="h-4 w-4 text-violet-700" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Build this video without linking it to a series.
                    </p>
                  </button>
                  {series.items.map((item) => {
                    const active = item.id === createSeriesId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCreateSeriesId(item.id);
                          setCreateControls(item.defaultCreativeControls);
                        }}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          active
                            ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          {active ? <Check className="h-4 w-4 text-violet-700" /> : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {item.continuityMode
                            ? item.storyBible || "Serialized story continuation is enabled for this series."
                            : item.description || `${item.projectCount} videos in this series.`}
                        </p>
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

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Background music
                  </p>
                  <span className="text-[11px] font-medium text-violet-700">
                    {createControls.backgroundMusic}
                  </span>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {BACKGROUND_MUSIC_OPTIONS.map((option) => {
                    const active = option === createControls.backgroundMusic;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCreateControls({ backgroundMusic: option })}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          active
                            ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                              <Music4 className="h-4 w-4" />
                            </span>
                            <p className="text-sm font-semibold text-slate-900">{option}</p>
                          </div>
                          {active ? <Check className="h-4 w-4 text-violet-700" /> : null}
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          {option === "No Music"
                            ? "Leave the soundtrack empty for voice-only edits."
                            : "Save this soundtrack direction with the project and render prep."}
                        </p>
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
                  rows={5}
                  maxLength={1000}
                  value={createControls.exampleScript ?? ""}
                  onChange={(e) => setCreateControls({ exampleScript: e.target.value })}
                  placeholder="Paste a short sample script so AI can mirror the pacing, tone, and structure."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Voice direction
                  </p>
                  {selectedVoiceStyle ? (
                    <span className="text-[11px] font-medium text-violet-700">
                      {selectedVoiceStyle.summary}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  {selectedVoiceStyle ? (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                        Selected voice
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {selectedVoiceStyle.label}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {selectedVoiceStyle.summary}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-10 w-10 rounded-2xl bg-gradient-to-br",
                            selectedVoiceStyle.accentClass,
                          )}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {VOICE_STYLE_PRESETS.map((preset) => {
                    const active = preset.label === createControls.voiceStyle;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCreateControls({ voiceStyle: preset.label })}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          active
                            ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                        )}
                      >
                        <div className={cn("h-2 rounded-full bg-gradient-to-r", preset.accentClass)} />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{preset.label}</p>
                          {active ? <Check className="h-4 w-4 text-violet-700" /> : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{preset.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Caption treatment
                  </p>
                  {selectedCaptionStyle ? (
                    <span className="text-[11px] font-medium text-violet-700">
                      {selectedCaptionStyle.summary}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  {selectedCaptionStyle ? (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                        Selected captions
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {selectedCaptionStyle.label}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {selectedCaptionStyle.summary}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-10 w-10 rounded-2xl bg-gradient-to-br",
                            selectedCaptionStyle.accentClass,
                          )}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CAPTION_STYLE_PRESETS.map((preset) => {
                    const active = preset.label === createControls.captionStyle;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCreateControls({ captionStyle: preset.label })}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition",
                          active
                            ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                        )}
                      >
                        <div className={cn("h-2 rounded-full bg-gradient-to-r", preset.accentClass)} />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{preset.label}</p>
                          {active ? <Check className="h-4 w-4 text-violet-700" /> : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{preset.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSeries ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-violet-700" />
                      <p className="text-sm font-semibold text-slate-900">{selectedSeries.title}</p>
                    </div>
                    <span className="rounded-full border border-violet-200 bg-white px-2 py-1 text-[11px] font-semibold text-violet-700">
                      Series linked
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    New videos in this series inherit its default direction, including music and style presets.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Visual art style picker
              </p>
              <div className="flex items-center gap-2">
                {pinnedArtStyles.length > 0 ? (
                  <span className="text-[11px] font-medium text-slate-500">
                    {pinnedArtStyles.length} pinned
                  </span>
                ) : null}
                {selectedArtStyle ? (
                  <span className="text-[11px] font-medium text-violet-700">
                    {selectedArtStyle.summary}
                  </span>
                ) : null}
              </div>
            </div>

            {selectedArtStyle ? (
              <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div
                  className={cn(
                    "relative h-32 bg-gradient-to-br",
                    selectedArtStyle.previewClass,
                  )}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.48),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.34),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.2))]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur">
                      <Check className="h-3.5 w-3.5 text-violet-700" />
                      Selected look
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{selectedArtStyle.label}</p>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                        {selectedArtStyle.summary}
                      </p>
                    </div>
                    <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
                      {pinnedArtStyles.includes(selectedArtStyle.label) ? "Pinned" : "Ready to use"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtStyle.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {orderedArtStylePresets.map((preset) => {
                const active = preset.label === createControls.artStyle;
                const pinned = pinnedArtStyles.includes(preset.label);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCreateControls({ artStyle: preset.label })}
                    className="group w-[198px] shrink-0 text-left"
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
                        <button
                          type="button"
                          aria-label={pinned ? `Unpin ${preset.label}` : `Pin ${preset.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            togglePinnedArtStyle(preset.label);
                          }}
                          className={cn(
                            "absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition",
                            pinned
                              ? "border-violet-200 bg-violet-600 text-white"
                              : "border-white/50 bg-white/65 text-slate-700 hover:bg-white",
                          )}
                        >
                          <Pin className="h-4 w-4" />
                        </button>
                        {active ? (
                          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                            <Check className="h-4 w-4" />
                          </div>
                        ) : null}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="rounded-2xl bg-white/86 px-3 py-2 backdrop-blur">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {preset.tags.join(" | ")}
                            </p>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-700">
                              {preset.summary}
                            </p>
                          </div>
                        </div>
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
