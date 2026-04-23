import { PIPELINE_STEPS } from "@/lib/constants";
import type {
  CreativeControls,
  GenerationStepState,
  PipelineJobStatus,
  PipelineStepId,
  Project,
  ProjectStatus,
} from "@/lib/types";

export type GenerationStepRow = {
  step: string | null;
  status: string | null;
  output?: unknown;
  updated_at?: string | null;
};

export type ProjectRow = {
  id: string;
  title: string | null;
  idea: string | null;
  creative_controls?: CreativeControls | null;
  status: string | null;
  progress: number | null;
  video_url?: string | null;
  created_at: string;
  generations?: GenerationStepRow[] | null;
};

const gradients = [
  "from-violet-500 via-fuchsia-500 to-pink-500",
  "from-sky-600 via-blue-700 to-indigo-900",
  "from-amber-500 via-orange-500 to-rose-600",
  "from-teal-500 via-cyan-600 to-blue-700",
  "from-emerald-600 via-lime-600 to-cyan-700",
  "from-slate-800 via-violet-900 to-fuchsia-800",
];

function normalizeProjectStatus(raw: string | null | undefined): ProjectStatus {
  const status = (raw ?? "").trim().toLowerCase();
  if (
    status === "generating" ||
    status === "ready" ||
    status === "draft" ||
    status === "published" ||
    status === "failed"
  ) {
    return status;
  }
  return "draft";
}

function normalizePipelineStep(raw: string | null | undefined): PipelineStepId | null {
  const step = (raw ?? "").trim().toLowerCase();
  return PIPELINE_STEPS.some((s) => s.id === step) ? (step as PipelineStepId) : null;
}

function normalizePipelineStatus(raw: string | null | undefined): PipelineJobStatus {
  const status = (raw ?? "").trim().toLowerCase();
  if (
    status === "pending" ||
    status === "processing" ||
    status === "done" ||
    status === "failed"
  ) {
    return status;
  }
  return "pending";
}

function mapGenerationSteps(rows: GenerationStepRow[] | null | undefined): GenerationStepState[] {
  const rowByStep = new Map(
    (rows ?? [])
      .map((row) => {
        const step = normalizePipelineStep(row.step);
        if (!step) return null;
        return [
          step,
          {
            step,
            status: normalizePipelineStatus(row.status),
            updatedAt: row.updated_at ?? null,
          },
        ] as const;
      })
      .filter(Boolean) as [PipelineStepId, GenerationStepState][],
  );

  return PIPELINE_STEPS.map((step) => ({
    step: step.id,
    status: rowByStep.get(step.id)?.status ?? "pending",
    updatedAt: rowByStep.get(step.id)?.updatedAt ?? null,
  }));
}

function currentStepFromRows(
  steps: GenerationStepState[],
  progress: number,
  status: ProjectStatus,
): PipelineStepId {
  if (status === "ready" || status === "published" || progress >= 100) return "render";
  const processing = steps.find((step) => step.status === "processing");
  if (processing) return processing.step;
  const firstPending = steps.find((step) => step.status === "pending");
  if (firstPending) return firstPending.step;
  return "render";
}

function categoryFromIdea(idea: string | null | undefined): string {
  const text = (idea ?? "").trim();
  const prefix = text.split(":")[0]?.trim();
  if (prefix && prefix.length <= 28 && prefix.length < text.length) return prefix;
  return "Video";
}

function gradientForId(id: string): string {
  const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[sum % gradients.length]!;
}

export function titleFromIdea(idea: string): string {
  const text = idea.trim().replace(/\s+/g, " ");
  if (!text) return "Untitled video";
  return text.length > 64 ? `${text.slice(0, 61).trim()}...` : text;
}

export function mapProjectRow(row: ProjectRow): Project {
  const status = normalizeProjectStatus(row.status);
  const generationSteps = mapGenerationSteps(row.generations);
  const progress = Number(row.progress ?? 0);
  return {
    id: row.id,
    title: row.title?.trim() || titleFromIdea(row.idea ?? ""),
    category: categoryFromIdea(row.idea),
    status,
    durationSec: 0,
    gradient: gradientForId(row.id),
    thumbProgress: status === "generating" ? progress : undefined,
    idea: row.idea,
    creativeControls: row.creative_controls ?? null,
    createdAt: row.created_at,
    currentStep: currentStepFromRows(generationSteps, progress, status),
    generationSteps,
  };
}
