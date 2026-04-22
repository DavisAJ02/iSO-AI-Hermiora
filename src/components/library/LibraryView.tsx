"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  Clock,
  Eye,
  Film,
  LineChart,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useApp } from "@/context/AppProvider";
import { cn, formatDuration } from "@/lib/utils";

export function LibraryView() {
  const { ui, projects } = useApp();
  const readyVideos = projects.items.filter((project) => project.status === "ready").length;
  const generatingVideos = projects.items.filter((project) => project.status === "generating").length;

  const topStats = [
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
    {
      label: "Ready",
      value: String(readyVideos),
      icon: LineChart,
      iconWrap: "bg-violet-100 text-violet-700",
    },
  ] as const;

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
              <div className="flex items-start gap-3 border-b border-slate-100 p-4">
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
                  </div>
                </div>
              </div>

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
    </div>
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
