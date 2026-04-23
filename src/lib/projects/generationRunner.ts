import type { SupabaseClient } from "@supabase/supabase-js";
import { PIPELINE_STEPS } from "@/lib/constants";
import type { PipelineJobStatus, PipelineStepId } from "@/lib/types";

const STEP_DURATION_MS = 2800;
const STARTING_PROGRESS = 8;

type ProjectProgressRow = {
  id: string;
  title?: string | null;
  idea?: string | null;
  status: string | null;
  progress: number | null;
  created_at: string;
};

type StepUpdate = {
  step: PipelineStepId;
  status: PipelineJobStatus;
};

type GenerationRow = {
  step: string | null;
  status: string | null;
  output: unknown;
};

function projectTopic(project: ProjectProgressRow) {
  const source = project.idea?.trim() || project.title?.trim() || "your video idea";
  return source.replace(/\s+/g, " ");
}

function projectTitle(project: ProjectProgressRow) {
  return project.title?.trim() || projectTopic(project).slice(0, 64);
}

function buildStepOutput(project: ProjectProgressRow, step: PipelineStepId) {
  const topic = projectTopic(project);
  const title = projectTitle(project);
  switch (step) {
    case "hook":
      return {
        hook: `What if ${topic} was the one story your audience needed today?`,
        title,
      };
    case "script":
      return {
        beats: [
          `Open with a sharp question about ${topic}.`,
          "Build tension with one concrete detail and one emotional consequence.",
          "Close with a short lesson viewers can repeat or share.",
        ],
      };
    case "scenes":
      return {
        scenes: [
          { label: "Opening", direction: "Fast visual reveal with bold caption." },
          { label: "Context", direction: "Two concise shots that explain the stakes." },
          { label: "Payoff", direction: "Final frame lands the lesson and call to action." },
        ],
      };
    case "image_prompts":
      return {
        prompts: [
          `Vertical cinematic image for ${topic}, dramatic lighting, clean focal point.`,
          `Close-up supporting visual for ${topic}, high contrast, social video style.`,
          `Final shareable frame about ${topic}, crisp composition, readable negative space.`,
        ],
      };
    case "voice":
      return {
        voice: "Dramatic Male",
        direction: "Measured pace, confident tone, short pauses before the payoff.",
      };
    case "captions":
      return {
        style: "Large centered captions with highlighted keywords.",
        keywords: topic.split(/\s+/).slice(0, 5),
      };
    case "render_prep":
      return {
        format: "9:16",
        checks: ["Hook fits first 3 seconds", "Captions enabled", "Export target set"],
      };
    case "render":
      return {
        preview: "Ready for review",
        export: "Vertical social video package prepared",
      };
  }
}

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

export async function ensureProjectGenerationOutputs(
  admin: SupabaseClient,
  project: ProjectProgressRow,
) {
  const { data, error } = await admin
    .from("generations")
    .select("step,status,output")
    .eq("project_id", project.id);

  if (error) throw error;

  const results = await Promise.all(
    ((data ?? []) as GenerationRow[])
      .filter((row) => {
        const status = row.status?.trim().toLowerCase();
        return !row.output && (project.status === "ready" || status === "processing" || status === "done");
      })
      .map((row) => {
        const step = PIPELINE_STEPS.find((item) => item.id === row.step)?.id;
        if (!step) return null;
        return admin
          .from("generations")
          .update({
            status: project.status === "ready" ? "done" : row.status,
            output: buildStepOutput(project, step),
          })
          .eq("project_id", project.id)
          .eq("step", step);
      })
      .filter(Boolean),
  );

  const outputError = results.find((result) => result?.error)?.error;
  if (outputError) throw outputError;
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

  const { data: generationRows, error: generationRowsError } = await admin
    .from("generations")
    .select("step,status,output")
    .eq("project_id", project.id);

  if (generationRowsError) throw generationRowsError;

  const rowsByStep = new Map(
    ((generationRows ?? []) as GenerationRow[])
      .filter((row): row is GenerationRow & { step: string } => typeof row.step === "string")
      .map((row) => [row.step, row]),
  );
  const hasSavedOutputs = Array.from(rowsByStep.values()).some((row) => Boolean(row.output));

  const stepResults = await Promise.all(
    getStepUpdates(project).map(({ step, status }) => {
      const currentRow = rowsByStep.get(step);
      const update: {
        status: PipelineJobStatus;
        updated_at: string;
        output?: unknown;
      } = {
        status,
        updated_at: timestamp,
      };

      if (!hasSavedOutputs && !currentRow?.output && status !== "pending") {
        update.output = buildStepOutput(project, step);
      }

      return admin
        .from("generations")
        .update(update)
        .eq("project_id", project.id)
        .eq("step", step);
    }),
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
    .select("id,title,idea,status,progress,created_at")
    .eq("user_id", userId)
    .eq("status", "generating")
    .limit(20);

  if (error) throw error;

  for (const project of data ?? []) {
    await syncProjectGeneration(admin, project as ProjectProgressRow);
  }
}
