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
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { sampleSeries } from "@/lib/sample-data";
import { useApp } from "@/context/AppProvider";
import { cn } from "@/lib/utils";

export function LibraryView() {
  const { ui } = useApp();

  const topStats = [
    {
      label: "Total Views",
      value: "284K",
      icon: Eye,
      iconWrap: "bg-violet-100 text-violet-700",
    },
    {
      label: "Videos",
      value: "25",
      icon: Film,
      iconWrap: "bg-violet-100 text-violet-700",
    },
    {
      label: "Avg. ER",
      value: "73%",
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/90 bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-sm transition hover:brightness-105"
          aria-label="New series"
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
            Set it up once — AI creates every day.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel className="text-slate-500">My series</SectionLabel>
          <button
            type="button"
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            New Series +
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {sampleSeries.map((s) => (
            <Card key={s.id} className="overflow-hidden p-0 shadow-md shadow-slate-900/5">
              <div className="flex items-start gap-3 border-b border-slate-100 p-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-inner",
                    s.thumbClass,
                  )}
                >
                  <Film className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900">
                        {s.title}
                      </h2>
                      <p className="text-xs font-semibold text-violet-700">
                        {s.category}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Film className="h-3 w-3 text-slate-400" />
                      {s.videoCount} videos
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {s.durationLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/80 px-2 py-3">
                <Metric icon={Eye} iconClass="text-violet-600" label="Views" value={s.viewsLabel} />
                <Metric
                  icon={ThumbsUp}
                  iconClass="text-pink-500"
                  label="Likes"
                  value={s.likesLabel}
                />
                <Metric
                  icon={Clock}
                  iconClass="text-emerald-600"
                  label="Avg Watch"
                  value={s.avgWatchLabel}
                />
              </div>

              <div className="space-y-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
                    Engagement Rate
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {s.engagementPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r shadow-sm",
                      s.engagementBarClass,
                    )}
                    style={{ width: `${s.engagementPct}%` }}
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
                  Create video from this series
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
