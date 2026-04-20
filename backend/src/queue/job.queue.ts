import { generateVideoPipeline } from "../pipeline/generateVideoPipeline.js";

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
      try {
        await generateVideoPipeline({
          projectId: job.projectId,
          accessToken: job.accessToken,
        });
      } catch (err) {
        console.error("[generateVideoPipeline]", job.projectId, err);
      }
    }
  } finally {
    processing = false;
  }
}
