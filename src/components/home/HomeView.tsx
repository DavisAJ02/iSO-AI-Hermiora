"use client";

import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Bell,
  Clapperboard,
  Crown,
  Eye,
  FileText,
  CheckCircle2,
  Loader2,
  Mic,
  Paperclip,
  Play,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GenerationCard } from "./GenerationCard";
import { useApp } from "@/context/AppProvider";
import { sampleProjects } from "@/lib/sample-data";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

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
    published: {
      label: "Published",
      className: "bg-orange-50 text-orange-800 border-orange-200",
      icon: Eye,
    },
    draft: {
      label: "Draft",
      className: "bg-amber-50 text-amber-900 border-amber-200",
      icon: FileText,
    },
  };
  return map[status];
}

export function HomeView() {
  const { idea, setIdea, startGeneration, ui, plan } = useApp();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const showSun = hour < 17;

  return (
    <div className="flex flex-col gap-6 pb-4 pt-2 md:gap-8 md:pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Hermiora AI
          </h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
            {greeting}, Creator
            {showSun ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden />
            ) : (
              <span aria-hidden>👋</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
            <Crown className="h-3.5 w-3.5" aria-hidden />
            {plan.tier === "free"
              ? "Free"
              : plan.tier === "creator"
                ? "Creator"
                : "Pro"}
          </span>
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-violet-50 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          What do you want to create?
        </h2>
        <div className="relative rounded-[var(--hermi-radius-xl)] border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-900/5 ring-1 ring-violet-100/60 transition focus-within:ring-2 focus-within:ring-violet-200">
          <label htmlFor="idea" className="sr-only">
            Video idea
          </label>
          <textarea
            id="idea"
            rows={4}
            maxLength={500}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="A motivational story about resilience…"
            className="w-full resize-none bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-100"
            >
              <Mic className="h-3.5 w-3.5 text-violet-600" />
              Voice
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-100"
            >
              <Paperclip className="h-3.5 w-3.5 text-violet-600" />
              Attach
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-violet-200 hover:bg-violet-100"
            >
              <Wand2 className="h-3.5 w-3.5 text-violet-600" />
              Suggest
            </button>
            <Button
              type="button"
              className="ml-auto min-w-[8.5rem] gap-2 py-2 text-sm"
              onClick={() => startGeneration()}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              Generate
            </Button>
          </div>
        </div>
      </section>

      <GenerationCard />

      <section className="space-y-3">
        <SectionLabel>Quick actions</SectionLabel>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            {
              label: "Hook",
              tone: "from-violet-600 to-fuchsia-500",
              icon: Anchor,
            },
            {
              label: "Script",
              tone: "from-sky-500 to-blue-600",
              icon: FileText,
            },
            {
              label: "Video",
              tone: "from-rose-500 to-orange-500",
              icon: Clapperboard,
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="group flex flex-col items-center gap-2 rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-inner",
                  item.tone,
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Recent projects</SectionLabel>
          <Link
            href="/projects"
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            See all
          </Link>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {sampleProjects.slice(0, 3).map((p) => {
            const pill = statusPill(p.status);
            const PillIcon = pill.icon;
            return (
              <article
                key={p.id}
                className="min-w-[220px] shrink-0 overflow-hidden rounded-[var(--hermi-radius-lg)] border border-slate-200/90 bg-white shadow-sm md:min-w-0"
              >
                <div
                  className={cn(
                    "relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br",
                    p.gradient,
                  )}
                >
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/40"
                    aria-label={`Play ${p.title}`}
                  >
                    <Play className="ml-0.5 h-5 w-5 fill-white" />
                  </button>
                  <span
                    className={cn(
                      "absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
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
                  {p.status === "generating" && p.thumbProgress != null && (
                    <div className="absolute inset-x-3 bottom-11 h-1 overflow-hidden rounded-full bg-black/25">
                      <div
                        className="hermi-gradient-fill h-full rounded-full transition-all"
                        style={{ width: `${p.thumbProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-500">{p.category}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="rounded-[var(--hermi-radius-xl)] border border-violet-100/90 bg-gradient-to-r from-violet-50 via-fuchsia-50/80 to-violet-50/40 p-4 shadow-sm md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <Crown className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Hermiora Pro</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Unlimited videos · 4K export · All AI voices
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-3 w-full shrink-0 md:mt-0 md:w-auto"
          onClick={ui.openGoPro}
        >
          Upgrade →
        </Button>
      </div>
    </div>
  );
}
