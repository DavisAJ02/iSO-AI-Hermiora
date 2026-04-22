"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  CheckCircle2,
  Circle,
  CircleDashed,
  Eye,
  Film,
  LayoutGrid,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { formatDuration, cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

const filters: { id: "all" | ProjectStatus; label: string; icon: typeof LayoutGrid }[] =
  [
    { id: "all", label: "All", icon: LayoutGrid },
    { id: "generating", label: "Generating", icon: Sparkles },
    { id: "ready", label: "Ready", icon: CheckCircle2 },
    { id: "draft", label: "Draft", icon: CircleDashed },
  ];

function statusPill(status: ProjectStatus) {
  const map: Record<
    ProjectStatus,
    { label: string; className: string; icon: LucideIcon }
  > = {
    generating: {
      label: "Generating",
      className: "bg-violet-100 text-violet-800 border-violet-200",
      icon: Loader2,
    },
    ready: {
      label: "Ready",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: CheckCircle2,
    },
    draft: {
      label: "Draft",
      className: "bg-amber-50 text-amber-900 border-amber-200",
      icon: Circle,
    },
    published: {
      label: "Published",
      className: "bg-slate-800 text-white border-slate-700",
      icon: Eye,
    },
    failed: {
      label: "Failed",
      className: "bg-rose-50 text-rose-800 border-rose-200",
      icon: CircleDashed,
    },
  };
  return map[status];
}

export function ProjectsView() {
  const { projects, ui } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const stats = useMemo(() => {
    const total = projects.items.length;
    const generating = projects.items.filter((p) => p.status === "generating").length;
    const ready = projects.items.filter((p) => p.status === "ready").length;
    return { total, generating, ready };
  }, [projects.items]);

  const list = useMemo(
    () =>
      filter === "all"
        ? projects.items
        : projects.items.filter((p) => p.status === filter),
    [filter, projects.items],
  );

  return (
    <div className="flex flex-col gap-6 pb-4 pt-2 md:pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Projects
        </h1>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-sky-500 text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 active:scale-95"
          aria-label="Sort or filter"
        >
          <ArrowUpDown className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: Film,
            wrap: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/25",
          },
          {
            label: "Generating",
            value: stats.generating,
            icon: Sparkles,
            wrap: "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80",
          },
          {
            label: "Ready",
            value: stats.ready,
            icon: CheckCircle2,
            wrap: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-[var(--hermi-radius-md)] border border-slate-200/90 bg-white p-3 text-center shadow-sm md:p-4"
          >
            <span
              className={cn(
                "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl",
                c.wrap,
              )}
            >
              <c.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-xl font-bold text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "hermi-gradient-fill border-transparent text-white shadow-md shadow-violet-500/25"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </button>
          );
        })}
      </div>

      {projects.loading ? (
        <div className="rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading your projects...
        </div>
      ) : projects.error ? (
        <div className="rounded-[var(--hermi-radius-lg)] border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {projects.error}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No projects found</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Create your first video and it will be tracked here with its generation status.
          </p>
          <button
            type="button"
            onClick={ui.openCreate}
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => {
          const pill = statusPill(p.status);
          const PillIcon = pill.icon;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex flex-col overflow-hidden rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  "relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br",
                  p.gradient,
                )}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-sm transition group-hover:bg-black/45"
                  aria-hidden
                >
                  <Play className="ml-0.5 h-5 w-5 fill-white" />
                </span>
                <span
                  className={cn(
                    "absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                    pill.className,
                  )}
                >
                  <PillIcon
                    className={cn(
                      "h-3 w-3",
                      p.status === "generating" && "animate-spin",
                      p.status === "draft" && "fill-amber-400 text-amber-600",
                    )}
                  />
                  {pill.label}
                </span>
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                  {formatDuration(p.durationSec)}
                </span>
                {p.status === "generating" && (
                  <div className="absolute inset-x-3 top-3 h-1 overflow-hidden rounded-full bg-white/30">
                    <div className="hermi-gradient-fill h-full w-2/3 animate-pulse rounded-full" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <h2 className="line-clamp-2 text-sm font-bold text-slate-900">
                    {p.title}
                  </h2>
                  <p className="text-xs text-slate-500">{p.category}</p>
                  {p.status === "generating" && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="hermi-gradient-fill h-full rounded-full"
                        style={{ width: `${p.thumbProgress ?? 55}%` }}
                      />
                    </div>
                  )}
                </div>
                <span
                  className="mt-auto w-full rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
                >
                  Open project
                </span>
              </div>
            </Link>
          );
          })}
        </div>
      )}
    </div>
  );
}
