"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Film,
  FolderKanban,
  LineChart,
  Music4,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useApp } from "@/context/AppProvider";
import { DEFAULT_CREATIVE_CONTROLS } from "@/lib/projects/creativeControls";
import type { CreativeControls, Series } from "@/lib/types";
import {
  ART_STYLE_OPTIONS,
  BACKGROUND_MUSIC_OPTIONS,
  CAPTION_STYLE_OPTIONS,
  EFFECT_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  VOICE_STYLE_OPTIONS,
} from "@/lib/constants";
import { cn, formatDuration } from "@/lib/utils";

type SeriesEditorState = {
  mode: "create" | "edit";
  seriesId: string | null;
  title: string;
  description: string;
  continuityMode: boolean;
  storyBible: string;
  controls: CreativeControls;
};

export function LibraryView() {
  const { ui, projects, series } = useApp();
  const generatingVideos = projects.items.filter((project) => project.status === "generating").length;
  const [editor, setEditor] = useState<SeriesEditorState | null>(null);
  const [savingSeries, setSavingSeries] = useState(false);

  const topStats = [
    {
      label: "Series",
      value: String(series.items.length),
      icon: FolderKanban,
      iconWrap: "bg-violet-100 text-violet-700",
    },
    {
      label: "Projects",
      value: String(projects.items.length),
      icon: Eye,
      iconWrap: "bg-violet-100 text-violet-700",
    },
    {
      label: "Generating",
      value: String(generatingVideos),
      icon: Film,
      iconWrap: "bg-violet-100 text-violet-700",
    },
  ] as const;

  const openCreateSeriesEditor = () => {
    setEditor({
      mode: "create",
      seriesId: null,
      title: "",
      description: "",
      continuityMode: false,
      storyBible: "",
      controls: DEFAULT_CREATIVE_CONTROLS,
    });
  };

  const openEditSeriesEditor = (item: Series) => {
    setEditor({
      mode: "edit",
      seriesId: item.id,
      title: item.title,
      description: item.description ?? "",
      continuityMode: item.continuityMode,
      storyBible: item.storyBible ?? "",
      controls: item.defaultCreativeControls,
    });
  };

  const updateEditorControls = (next: Partial<CreativeControls>) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            controls: {
              ...current.controls,
              ...next,
            },
          }
        : current,
    );
  };

  const saveSeries = async () => {
    if (!editor) return;
    if (!editor.title.trim()) return;

    setSavingSeries(true);
    try {
      let savedSeries: Series | null = null;
      if (editor.mode === "create") {
        savedSeries = await series.create({
          title: editor.title.trim(),
          description: editor.description.trim() || null,
          continuityMode: editor.continuityMode,
          storyBible: editor.storyBible.trim() || null,
          defaultCreativeControls: editor.controls,
        });
      } else if (editor.seriesId) {
        savedSeries = await series.update(editor.seriesId, {
          title: editor.title.trim(),
          description: editor.description.trim() || null,
          continuityMode: editor.continuityMode,
          storyBible: editor.storyBible.trim() || null,
          defaultCreativeControls: editor.controls,
        });
      }
      if (savedSeries) {
        setEditor(null);
      }
    } finally {
      setSavingSeries(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4 pt-2 md:pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Library
        </h1>
        <button
          type="button"
          onClick={ui.openCreate}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/90 bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-sm transition hover:brightness-105"
          aria-label="Create new video"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {topStats.map((k) => (
          <div
            key={k.label}
            className="rounded-[var(--hermi-radius-md)] border border-slate-200/90 bg-white p-3 text-center shadow-sm md:p-4"
          >
            <span
              className={cn(
                "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl",
                k.iconWrap,
              )}
            >
              <k.icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="text-lg font-bold leading-tight text-slate-900 md:text-xl">
              {k.value}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500 md:text-[11px]">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/30">
          <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Auto-generate daily videos
            </p>
            <Badge tone="pro" className="normal-case tracking-normal">
              PRO
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Set it up once - AI creates every day.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel className="text-slate-500">My series</SectionLabel>
          <button
            type="button"
            onClick={openCreateSeriesEditor}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            New Series +
          </button>
        </div>

        {series.loading ? (
          <Card className="p-4 text-sm text-slate-500">Loading your series...</Card>
        ) : series.error ? (
          <Card className="border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {series.error}
          </Card>
        ) : series.items.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm font-semibold text-slate-900">No series yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Create a series to save repeatable creative defaults, including music and style direction.
            </p>
            <Button type="button" className="mt-4 px-4 py-2 text-xs" onClick={openCreateSeriesEditor}>
              <FolderKanban className="h-4 w-4" strokeWidth={2} />
              Create first series
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {series.items.map((item) => {
              const defaults = item.defaultCreativeControls;
              return (
                <Card key={item.id} className="overflow-hidden p-0 shadow-md shadow-slate-900/5">
                  <div className="flex items-start gap-3 border-b border-slate-100 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-sky-500 text-white shadow-inner">
                      <FolderKanban className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900">{item.title}</h2>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-violet-700">
                              {item.description || defaults.niche}
                            </p>
                            {item.continuityMode ? (
                              <Badge tone="pro" className="normal-case tracking-normal">
                                Continuation
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete series "${item.title}"?`)) return;
                            void series.remove(item.id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Film className="h-3 w-3 text-slate-400" />
                          {item.projectCount} videos
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-slate-400" />
                          {item.generatingCount} generating
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-slate-400" />
                          {item.readyCount} ready
                        </span>
                        {item.continuityMode ? (
                          <span className="inline-flex items-center gap-1">
                            <Wand2 className="h-3 w-3 text-slate-400" />
                            serial story
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/80 px-2 py-3">
                    <Metric icon={LineChart} iconClass="text-violet-600" label="Niche" value={defaults.niche} />
                    <Metric icon={Music4} iconClass="text-pink-500" label="Music" value={defaults.backgroundMusic} />
                    <Metric icon={Clock} iconClass="text-emerald-600" label="Voice" value={defaults.voiceStyle} />
                  </div>

                  <div className="space-y-2 border-b border-slate-100 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        defaults.language,
                        defaults.artStyle,
                        defaults.captionStyle,
                        ...defaults.effects.slice(0, 2),
                      ].map((value) => (
                        <span
                          key={`${item.id}-${value}`}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="w-full gap-2 py-3 text-sm font-semibold"
                      onClick={() => series.applyToCreate(item.id)}
                    >
                      <Sparkles className="h-4 w-4" strokeWidth={2} />
                      Use series
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full gap-2 py-3 text-sm font-semibold"
                      onClick={() => openEditSeriesEditor(item)}
                    >
                      <FolderKanban className="h-4 w-4" strokeWidth={2} />
                      Edit series
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel className="text-slate-500">My library</SectionLabel>
          <button
            type="button"
            onClick={ui.openCreate}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            New Video +
          </button>
        </div>

        {projects.loading ? (
          <Card className="p-4 text-sm text-slate-500">Loading your library...</Card>
        ) : projects.error ? (
          <Card className="border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {projects.error}
          </Card>
        ) : projects.items.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-sm font-semibold text-slate-900">Your library is empty</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Create a project and it will appear here as part of your real content library.
            </p>
            <Button type="button" className="mt-4 px-4 py-2 text-xs" onClick={ui.openCreate}>
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              Create first video
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.items.map((project) => {
              const progress = project.status === "ready" ? 100 : project.thumbProgress ?? 0;
              const statusLabel =
                project.status === "generating"
                  ? "Generating"
                  : project.status === "ready"
                    ? "Ready"
                    : project.status === "failed"
                      ? "Failed"
                      : "Draft";
              return (
                <Card key={project.id} className="overflow-hidden p-0 shadow-md shadow-slate-900/5">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-start gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50"
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-inner",
                        project.gradient,
                      )}
                    >
                      <Film className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900">
                            {project.title}
                          </h2>
                          <p className="text-xs font-semibold text-violet-700">
                            {project.category}
                          </p>
                        </div>
                        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Film className="h-3 w-3 text-slate-400" />
                          {statusLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDuration(project.durationSec)}
                        </span>
                        {project.seriesTitle ? (
                          <span className="inline-flex items-center gap-1">
                            <FolderKanban className="h-3 w-3 text-slate-400" />
                            {project.seriesTitle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>

                  <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/80 px-2 py-3">
                    <Metric icon={Eye} iconClass="text-violet-600" label="Progress" value={`${progress}%`} />
                    <Metric
                      icon={Sparkles}
                      iconClass="text-pink-500"
                      label="Status"
                      value={statusLabel}
                    />
                    <Metric
                      icon={Clock}
                      iconClass="text-emerald-600"
                      label="Length"
                      value={formatDuration(project.durationSec)}
                    />
                  </div>

                  <div className="space-y-2 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
                        Generation Progress
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
                      <div
                        className="hermi-gradient-fill h-full rounded-full shadow-sm"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4">
                    <Button
                      type="button"
                      className="w-full gap-2 py-3 text-sm font-semibold"
                      onClick={ui.openCreate}
                    >
                      <Sparkles className="h-4 w-4" strokeWidth={2} />
                      Create another video
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {editor ? (
        <SeriesEditorModal
          editor={editor}
          saving={savingSeries}
          onClose={() => setEditor(null)}
          onChange={(next) => setEditor((current) => (current ? { ...current, ...next } : current))}
          onControlsChange={updateEditorControls}
          onSave={() => void saveSeries()}
        />
      ) : null}
    </div>
  );
}

function SeriesEditorModal({
  editor,
  saving,
  onClose,
  onChange,
  onControlsChange,
  onSave,
}: {
  editor: SeriesEditorState;
  saving: boolean;
  onClose: () => void;
  onChange: (next: Partial<SeriesEditorState>) => void;
  onControlsChange: (next: Partial<CreativeControls>) => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-editor-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Series Studio
            </p>
            <h2 id="series-editor-title" className="mt-1 text-xl font-bold text-slate-900">
              {editor.mode === "create" ? "Create Series" : "Edit Series"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shape the title, positioning, and full creative direction in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close series editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5 border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Series title
                </span>
                <input
                  value={editor.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                  placeholder="Name your series"
                  className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Description
                </span>
                <textarea
                  rows={4}
                  value={editor.description}
                  onChange={(event) => onChange({ description: event.target.value })}
                  placeholder="Describe the series angle, audience, and promise."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Continuation mode</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Turn this series into a serialized story so AI suggestions and episodes keep the plot moving forward.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ continuityMode: !editor.continuityMode })}
                  className={cn(
                    "relative inline-flex h-8 w-14 shrink-0 rounded-full transition",
                    editor.continuityMode ? "bg-violet-600" : "bg-slate-300",
                  )}
                  aria-pressed={editor.continuityMode}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                      editor.continuityMode ? "left-7" : "left-1",
                    )}
                  />
                </button>
              </div>

              <label className="mt-4 block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Story bible
                </span>
                <textarea
                  rows={5}
                  value={editor.storyBible}
                  onChange={(event) => onChange({ storyBible: event.target.value })}
                  placeholder="Describe the world, main character arc, what happened so far, and what must stay consistent across episodes."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Niche"
                value={editor.controls.niche}
                options={NICHE_OPTIONS}
                onChange={(value) => onControlsChange({ niche: value })}
              />
              <SelectField
                label="Language"
                value={editor.controls.language}
                options={LANGUAGE_OPTIONS}
                onChange={(value) => onControlsChange({ language: value })}
              />
              <SelectField
                label="Voice"
                value={editor.controls.voiceStyle}
                options={VOICE_STYLE_OPTIONS}
                onChange={(value) => onControlsChange({ voiceStyle: value })}
              />
              <SelectField
                label="Music"
                value={editor.controls.backgroundMusic}
                options={BACKGROUND_MUSIC_OPTIONS}
                onChange={(value) => onControlsChange({ backgroundMusic: value })}
              />
              <SelectField
                label="Art Style"
                value={editor.controls.artStyle}
                options={ART_STYLE_OPTIONS}
                onChange={(value) => onControlsChange({ artStyle: value })}
              />
              <SelectField
                label="Captions"
                value={editor.controls.captionStyle}
                options={CAPTION_STYLE_OPTIONS}
                onChange={(value) => onControlsChange({ captionStyle: value })}
              />
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(250,245,255,0.96),rgba(255,255,255,1))] p-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-violet-700" />
                <p className="text-sm font-semibold text-slate-900">Creative identity</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  editor.controls.niche,
                  editor.controls.language,
                  editor.controls.voiceStyle,
                  editor.controls.artStyle,
                  editor.controls.captionStyle,
                  editor.controls.backgroundMusic,
                  editor.continuityMode ? "Continuation On" : "Standalone Episodes",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Effects
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EFFECT_OPTIONS.map((effect) => {
                  const active = editor.controls.effects.includes(effect);
                  return (
                    <button
                      key={effect}
                      type="button"
                      onClick={() =>
                        onControlsChange({
                          effects: active
                            ? editor.controls.effects.filter((item) => item !== effect)
                            : [...editor.controls.effects, effect],
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

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Example script
              </span>
              <textarea
                rows={6}
                value={editor.controls.exampleScript ?? ""}
                onChange={(event) => onControlsChange({ exampleScript: event.target.value })}
                placeholder="Paste a reference script so future videos in this series can match tone and pacing."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Changes here update the series identity, not just a single default label.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving || !editor.title.trim()}>
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              {saving ? "Saving..." : editor.mode === "create" ? "Create series" : "Save series"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-1 text-center">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80",
          iconClass,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <p className="text-xs font-bold text-slate-900">{value}</p>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
