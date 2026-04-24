import type { AiJobType } from "@/lib/ai/jobTypes";

/**
 * Central timeout policy so every provider follows the same fallback budget.
 */
export function getAiTimeoutMs(jobType: AiJobType) {
  switch (jobType) {
    case "script":
    case "viral_score":
      return 20_000;
    case "image":
      return 60_000;
    case "video":
      return 180_000;
    default:
      return 20_000;
  }
}
