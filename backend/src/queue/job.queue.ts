import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserSupabaseClient } from "../lib/supabase.js";

export type GenerationJob = {
  projectId: string;
  userId: string;
  accessToken: string;
};

const queue: GenerationJob[] = [];
let processing = false;

/**
 * Minimal in-process queue. Swap for BullMQ / Supabase Queues / Edge Functions later.
 */
export function enqueueGeneration(job: GenerationJob): void {
  queue.push(job);
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      await runPipelineStub(job);
    }
  } finally {
    processing = false;
  }
}

/** Stub: marks project generating → advances progress (replace with real pipeline). */
async function runPipelineStub(job: GenerationJob): Promise<void> {
  const supabase: SupabaseClient = createUserSupabaseClient(job.accessToken);

  const steps = ["hook", "script", "scenes", "voice", "render"] as const;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progress = Math.round(((i + 1) / steps.length) * 100);
    await supabase.from("generations").insert({
      project_id: job.projectId,
      step,
      status: "done",
      output: { stub: true, step },
    });
    await supabase
      .from("projects")
      .update({ progress, status: i === steps.length - 1 ? "ready" : "generating" })
      .eq("id", job.projectId);
  }
}
