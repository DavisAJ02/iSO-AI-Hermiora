import { aiConfig } from "@/lib/ai/config";
import { AiProviderError, compactErrorBody, inferErrorCode } from "@/lib/ai/errors";
import type { AiProvider, AiProviderRequest } from "@/lib/ai/providers/types";

/**
 * Runway adapter for primary video generation. We keep it narrow: video only.
 */

type RunwayTask = {
  id: string;
  status?: string;
  output?: Array<{ url?: string }>;
  failure?: string | null;
};

function runwayError(status: number, bodyText: string) {
  const code = inferErrorCode(status, bodyText);
  return new AiProviderError({
    provider: "runway",
    code,
    status,
    retryable: code !== "invalid_api_key",
    message: `Runway failed (${status}): ${compactErrorBody(bodyText)}`,
  });
}

async function getTask(apiKey: string, taskId: string, timeoutMs: number) {
  const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": aiConfig.runway.apiVersion,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(Math.min(timeoutMs, 20_000)),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw runwayError(response.status, bodyText);
  }

  return (await response.json()) as RunwayTask;
}

export const runwayProvider: AiProvider = {
  name: "runway",
  supports(jobType) {
    return jobType === "video";
  },
  async run(request: AiProviderRequest) {
    const apiKey = aiConfig.runway.apiKey;
    if (!apiKey) {
      throw new AiProviderError({
        provider: "runway",
        code: "invalid_api_key",
        message: "RUNWAY_API_KEY is not configured.",
        retryable: false,
      });
    }

    const endpoint = request.video?.imageUrl ? "image_to_video" : "text_to_video";
    const response = await fetch(`https://api.dev.runwayml.com/v1/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": aiConfig.runway.apiVersion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        request.video?.imageUrl
          ? {
              model: request.video?.model || aiConfig.runway.videoModel,
              promptImage: request.video.imageUrl,
              promptText: request.prompt,
              duration: request.video.durationSeconds || 5,
              ratio: request.video.aspectRatio || "1280:720",
            }
          : {
              model: request.video?.model || aiConfig.runway.videoModel,
              promptText: request.prompt,
              duration: request.video?.durationSeconds || 5,
              ratio: request.video?.aspectRatio || "1280:720",
            },
      ),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw runwayError(response.status, bodyText);
    }

    let task = (await response.json()) as RunwayTask;
    const startedAt = Date.now();

    while (task.status === "PENDING" || task.status === "RUNNING" || task.status === "THROTTLED") {
      if (Date.now() - startedAt > request.timeoutMs) {
        throw new AiProviderError({
          provider: "runway",
          code: "timeout",
          message: `Runway timed out after ${Math.round(request.timeoutMs / 1000)}s.`,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      task = await getTask(apiKey, task.id, request.timeoutMs);
    }

    if (task.status !== "SUCCEEDED") {
      throw new AiProviderError({
        provider: "runway",
        code: "provider_unavailable",
        message: task.failure || `Runway task ended with status "${task.status}".`,
      });
    }

    const outputUrl = task.output?.[0]?.url || null;
    if (!outputUrl) {
      throw new AiProviderError({
        provider: "runway",
        code: "provider_unavailable",
        message: "Runway returned no video URL.",
      });
    }

    return {
      provider: "runway",
      outputUrl,
      outputText: null,
      mimeType: "video/mp4",
      costEstimate: null,
    };
  },
};
