"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useApp } from "@/context/AppProvider";
import { PIPELINE_STEPS } from "@/lib/constants";
import { getMaishaRequestAuthHeaders } from "@/lib/payments/maishaClientAuth";
import { mapProjectRow, type ProjectRow } from "@/lib/projects/projectMapping";
import type { PipelineJobStatus, Project } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

type DetailGenerationRow = {
  step: string | null;
  status: PipelineJobStatus | string | null;
  output?: unknown;
  updated_at?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function outputLines(output: unknown): string[] {
  if (!output) return ["Waiting for this step to finish."];
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) return output.flatMap(outputLines).slice(0, 6);
  if (!isRecord(output)) return [String(output)];

  return Object.entries(output).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.slice(0, 4).map((item) => {
        if (isRecord(item)) {
          return Object.values(item)
            .map((part) => String(part))
            .join(" - ");
        }
        return String(item);
      });
    }
    return `${key.replace(/_/g, " ")}: ${String(value)}`;
  });
}

function statusClass(status: string | null | undefined) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "processing") return "border-violet-200 bg-violet-50 text-violet-800";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { projects, ui } = useApp();
  const router = useRouter();
  const cachedProject = projects.items.find((project) => project.id === projectId);
  const [project, setProject] = useState<Project | null>(cachedProject ?? null);
  const [generations, setGenerations] = useState<DetailGenerationRow[]>([]);
  const [loading, setLoading] = useState(!cachedProject);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = await getMaishaRequestAuthHeaders();
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        credentials: "same-origin",
        headers: authHeaders,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Project could not be loaded.");
        return;
      }
      const data = (await res.json()) as { project?: ProjectRow };
      if (!data.project) {
        setError("Project could not be loaded.");
        return;
      }
      setProject(mapProjectRow(data.project));
      setGenerations((data.project.generations ?? []) as DetailGenerationRow[]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadProject();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadProject]);

  useEffect(() => {
    if (project?.status !== "generating") return;
    const id = window.setInterval(() => {
      void loadProject();
    }, 2500);
    return () => window.clearInterval(id);
  }, [loadProject, project?.status]);

  const generationByStep = useMemo(
    () =>
      new Map(
        generations.map((generation) => [generation.step, generation] as const),
      ),
    [generations],
  );

  const progress =
    project?.status === "ready" || project?.status === "published"
      ? 100
      : project?.thumbProgress ?? 0;

  const runProjectAction = useCallback(
    async (action: "publish" | "unpublish" | "duplicate" | "delete") => {
      if (action === "delete" && !window.confirm("Delete this project?")) return;

      setActionBusy(action);
      setActionMessage(null);
      setError(null);
      try {
        const authHeaders = await getMaishaRequestAuthHeaders();
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
          method: action === "delete" ? "DELETE" : "PATCH",
          credentials: "same-origin",
          headers:
            action === "delete"
              ? authHeaders
              : {
                  "Content-Type": "application/json",
                  ...authHeaders,
                },
          body: action === "delete" ? undefined : JSON.stringify({ action }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Project action failed.");
          return;
        }

        if (action === "delete") {
          await projects.refresh();
          router.replace("/projects");
          return;
        }

        const data = (await res.json()) as { project?: ProjectRow };
        if (!data.project) {
          setError("Project action failed.");
          return;
        }

        await projects.refresh();
        if (action === "duplicate") {
          router.push(`/projects/${data.project.id}`);
          return;
        }

        setProject(mapProjectRow(data.project));
        setGenerations((data.project.generations ?? []) as DetailGenerationRow[]);
        setActionMessage(action === "publish" ? "Project published." : "Project moved back to ready.");
      } finally {
        setActionBusy(null);
      }
    },
    [projectId, projects, router],
  );

  const isComplete = project?.status === "ready" || project?.status === "published";
  const publishAction = project?.status === "published" ? "unpublish" : "publish";

  return (
    <div className="flex flex-col gap-5 pb-4 pt-2 md:pt-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/projects"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Button type="button" className="px-4 py-2 text-xs" onClick={ui.openCreate}>
          <Sparkles className="h-4 w-4" />
          New video
        </Button>
      </header>

      {loading && !project ? (
        <Card className="p-4 text-sm text-slate-500">Loading project...</Card>
      ) : error ? (
        <Card className="border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </Card>
      ) : project ? (
        <>
          <section className="overflow-hidden rounded-[var(--hermi-radius-xl)] border border-slate-200/90 bg-white shadow-hermi-card">
            <div
              className={cn(
                "relative flex min-h-72 items-center justify-center bg-gradient-to-br p-5 text-white",
                project.gradient,
              )}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex flex-col items-center gap-4 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/30 shadow-xl backdrop-blur">
                  {project.status === "generating" ? (
                    <Loader2 className="h-9 w-9 animate-spin" />
                  ) : (
                    <Upload className="h-9 w-9" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                    {project.status}
                  </p>
                  <h1 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight md:text-4xl">
                    {project.title}
                  </h1>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{project.category}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {project.idea ?? "No source idea saved."}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(project.durationSec)}
                </span>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Generation progress</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            </div>
          </section>

          {actionMessage && (
            <Card className="border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              {actionMessage}
            </Card>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                Generated assets
              </h2>
              <button
                type="button"
                onClick={() => void loadProject()}
                className="text-xs font-semibold text-violet-700 hover:text-violet-900"
              >
                Refresh
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {PIPELINE_STEPS.map((step) => {
                const generation = generationByStep.get(step.id);
                const status = generation?.status ?? "pending";
                const done = status === "done";
                return (
                  <Card key={step.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{step.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{step.id.replace(/_/g, " ")}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
                          statusClass(String(status)),
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : status === "processing" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        {status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {outputLines(generation?.output).map((line, index) => (
                        <p
                          key={`${step.id}-${index}`}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            <Button
              type="button"
              className="py-3"
              disabled={!isComplete || actionBusy != null}
              onClick={() => void runProjectAction(publishAction)}
            >
              {actionBusy === publishAction ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {project.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <button
              type="button"
              disabled={actionBusy != null}
              onClick={() => void runProjectAction("duplicate")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
            >
              {actionBusy === "duplicate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Duplicate brief
            </button>
            <button
              type="button"
              disabled={actionBusy != null}
              onClick={() => void runProjectAction("delete")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-45"
            >
              {actionBusy === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
