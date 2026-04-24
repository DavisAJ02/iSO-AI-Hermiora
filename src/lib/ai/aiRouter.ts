import type { SupabaseClient } from "@supabase/supabase-js";
import { unknownProviderError } from "@/lib/ai/errors";
import { createAiJob, markAiJobSuccess, updateAiJobStatus } from "@/lib/ai/jobStore";
import type {
  AiJobRequest,
  AiJobResult,
  AiProvider,
  AiProviderName,
} from "@/lib/ai/jobTypes";
import { openAiProvider } from "@/lib/ai/providers/openaiProvider";
import { replicateProvider } from "@/lib/ai/providers/replicateProvider";
import { runwayProvider } from "@/lib/ai/providers/runwayProvider";
import { huggingfaceProvider } from "@/lib/ai/providers/huggingfaceProvider";
import { pexelsProvider } from "@/lib/ai/providers/pexelsProvider";
import { getAiTimeoutMs } from "@/lib/ai/timeouts";

/**
 * Central AI router. It creates the ai_jobs record, tries providers in order,
 * logs the chosen provider, and returns one normalized result shape.
 */

const providers: Record<AiProviderName, AiProvider> = {
  openai: openAiProvider,
  replicate: replicateProvider,
  runway: runwayProvider,
  huggingface: huggingfaceProvider,
  pexels: pexelsProvider,
};

function getProviderChain(jobType: AiJobRequest["jobType"]): AiProviderName[] {
  switch (jobType) {
    case "script":
    case "viral_score":
      return ["openai", "huggingface"];
    case "image":
      return ["replicate", "huggingface", "pexels"];
    case "video":
      return ["runway", "replicate", "huggingface", "pexels"];
    default:
      return ["huggingface"];
  }
}

function getProviderTimeoutMs(
  jobType: AiJobRequest["jobType"],
  providerName: AiProviderName,
  baseTimeoutMs: number,
) {
  if (providerName === "huggingface" && (jobType === "script" || jobType === "viral_score")) {
    return Math.max(baseTimeoutMs, 45_000);
  }
  if (providerName === "pexels") {
    return Math.min(baseTimeoutMs, 15_000);
  }
  return baseTimeoutMs;
}

export async function runAiJob(
  admin: SupabaseClient,
  request: AiJobRequest,
): Promise<AiJobResult & { jobId: string }> {
  const jobId = await createAiJob(admin, request);
  const providerChain = getProviderChain(request.jobType);
  const baseTimeoutMs = getAiTimeoutMs(request.jobType);
  const errors: string[] = [];

  for (const providerName of providerChain) {
    const provider = providers[providerName];
    if (!provider.supports(request.jobType)) continue;

    await updateAiJobStatus(admin, jobId, {
      providerUsed: providerName,
      status: "processing",
      errorMessage: null,
    });

    try {
      const providerResult = await provider.run({
        jobType: request.jobType,
        prompt: request.prompt,
        timeoutMs: getProviderTimeoutMs(request.jobType, providerName, baseTimeoutMs),
        text: request.text,
        image: request.image,
        video: request.video,
        metadata: request.metadata,
      });

      const result: AiJobResult & { jobId: string } = {
        success: true,
        providerUsed: providerResult.provider,
        jobType: request.jobType,
        outputUrl: providerResult.outputUrl,
        outputText: providerResult.outputText,
        outputJson: providerResult.outputJson,
        outputBuffer: providerResult.outputBuffer,
        mimeType: providerResult.mimeType,
        costEstimate: providerResult.costEstimate,
        jobId,
      };

      await markAiJobSuccess(admin, jobId, result);
      return result;
    } catch (error) {
      const normalized = unknownProviderError(providerName, error);
      errors.push(`${providerName}: ${normalized.message}`);
      await updateAiJobStatus(admin, jobId, {
        providerUsed: providerName,
        status: "processing",
        errorMessage: normalized.message,
      });
    }
  }

  const finalMessage = errors.join(" | ") || "No AI provider was able to complete the job.";
  await updateAiJobStatus(admin, jobId, {
    status: "failed",
    errorMessage: finalMessage,
  });
  throw new Error(finalMessage);
}
