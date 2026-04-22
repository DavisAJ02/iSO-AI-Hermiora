import type { SupabaseClient } from "@supabase/supabase-js";
import { PIPELINE_STEPS } from "@/lib/constants";
import type { PipelineJobStatus, PipelineStepId } from "@/lib/types";

const STEP_DURATION_MS = 2800;
const STARTING_PROGRESS = 8;

type ProjectProgressRow = {
  id: string;
  status: string | null;
  progress: number | null;
  created_at: string;
};

type StepUpdate = {
  step: PipelineStepId;
  status: PipelineJobStatus;
};

function getGenerationPosition(project: ProjectProgressRow) {
  const createdAt = new Date(project.created_at).getTime();
  const elapsedMs = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0;
  const totalSteps = PIPELINE_STEPS.length;
  const rawIndex = Math.floor(elapsedMs / STEP_DURATION_MS);
  const isReady = rawIndex >= totalSteps || Number(project.progress ?? 0) >= 100;
  const activeIndex = Math.min(totalSteps - 1, Math.max(0, rawIndex));
  const partialStep = (elapsedMs % STEP_DURATION_MS) / STEP_DURATION_MS;
  const computedProgress = isReady
    ? 100
    : Math.min(
        99,
        Math.round(
          STARTING_PROGRESS +
            ((activeIndex + partialStep) / totalSteps) * (100 - STARTING_PROGRESS),
        ),
      );

  return {
    activeIndex,
    progress: Math.max(Number(project.progress ?? 0), computedProgress),
    status: isReady ? "ready" : "generating",
  };
}

function getStepUpdates(project: ProjectProgressRow): StepUpdate[] {
  const position = getGenerationPosition(project);
  return PIPELINE_STEPS.map((step, index) => ({
    step: step.id,
    status:
      position.status === "ready"
        ? "done"
        : index < position.activeIndex
          ? "done"
          : index === position.activeIndex
            ? "processing"
            : "pending",
  }));
}

export async function syncProjectGeneration(
  admin: SupabaseClient,
  project: ProjectProgressRow,
) {
  if (project.status !== "generating") return;

  const position = getGenerationPosition(project);
  const timestamp = new Date().toISOString();

  const { error: projectError } = await admin
    .from("projects")
    .update({
      status: position.status,
      progress: position.progress,
      updated_at: timestamp,
    })
    .eq("id", project.id)
    .eq("status", "generating");

  if (projectError) throw projectError;

  const stepResults = await Promise.all(
    getStepUpdates(project).map(({ step, status }) =>
      admin
        .from("generations")
        .update({ status, updated_at: timestamp })
        .eq("project_id", project.id)
        .eq("step", step),
    ),
  );
  const stepError = stepResults.find((result) => result.error)?.error;
  if (stepError) throw stepError;
}

export async function syncUserGeneratingProjects(
  admin: SupabaseClient,
  userId: string,
) {
  const { data, error } = await admin
    .from("projects")
    .select("id,status,progress,created_at")
    .eq("user_id", userId)
    .eq("status", "generating")
    .limit(20);

  if (error) throw error;

  for (const project of data ?? []) {
    await syncProjectGeneration(admin, project as ProjectProgressRow);
  }
}
