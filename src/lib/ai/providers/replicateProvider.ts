import { aiConfig } from "@/lib/ai/config";
import { AiProviderError, compactErrorBody, inferErrorCode } from "@/lib/ai/errors";
import type { AiProvider, AiProviderRequest } from "@/lib/ai/providers/types";

/**
 * Replicate media adapter. Images go here first, and video can use Replicate
 * as a backup path when the primary video provider is unavailable.
 */

type ReplicatePrediction = {
  id: string;
  status: string;
  output?: string | string[] | null;
  error?: string | null;
};

function toReplicateError(status: number, bodyText: string) {
  const code = inferErrorCode(status, bodyText);
  return new AiProviderError({
    provider: "replicate",
    code,
    status,
    retryable: code !== "invalid_api_key",
    message: `Replicate failed (${status}): ${compactErrorBody(bodyText)}`,
  });
}

function aspectRatioFromSize(size?: string) {
  if (size?.includes("1536x1024")) return "3:2";
  return "9:16";
}

async function createPrediction(
  apiToken: string,
  model: string,
  input: Record<string, unknown>,
  timeoutMs: number,
) {
  const [owner, name] = model.split("/", 2);
  const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input }),
    cache: "no-store",
    signal: AbortSignal.timeout(Math.min(timeoutMs, 60_000)),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw toReplicateError(response.status, bodyText);
  }

  return (await response.json()) as ReplicatePrediction;
}

async function getPrediction(apiToken: string, predictionId: string, timeoutMs: number) {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(Math.min(timeoutMs, 20_000)),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw toReplicateError(response.status, bodyText);
  }

  return (await response.json()) as ReplicatePrediction;
}

async function waitForPrediction(apiToken: string, prediction: ReplicatePrediction, timeoutMs: number) {
  const startedAt = Date.now();
  let current = prediction;

  while (current.status === "starting" || current.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new AiProviderError({
        provider: "replicate",
        code: "timeout",
        message: `Replicate timed out after ${Math.round(timeoutMs / 1000)}s.`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    current = await getPrediction(apiToken, current.id, timeoutMs);
  }

  if (current.status !== "succeeded") {
    throw new AiProviderError({
      provider: "replicate",
      code: "provider_unavailable",
      message: current.error || `Replicate prediction ended with status "${current.status}".`,
    });
  }

  return current;
}

function firstOutputUrl(output: string | string[] | null | undefined) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.find((item): item is string => typeof item === "string" && item.length > 0) || null;
  }
  return null;
}

export const replicateProvider: AiProvider = {
  name: "replicate",
  supports(jobType) {
    return jobType === "image" || jobType === "video";
  },
  async run(request: AiProviderRequest) {
    const apiToken = aiConfig.replicate.apiToken;
    if (!apiToken) {
      throw new AiProviderError({
        provider: "replicate",
        code: "invalid_api_key",
        message: "REPLICATE_API_TOKEN is not configured.",
        retryable: false,
      });
    }

    if (request.jobType === "image") {
      const model = request.image?.model || aiConfig.replicate.imageModel;
      const prediction = await createPrediction(
        apiToken,
        model,
        {
          prompt: request.prompt,
          go_fast: true,
          megapixels: "1",
          num_outputs: 1,
          aspect_ratio: request.image?.aspectRatio || aspectRatioFromSize(request.image?.size),
          output_format: "png",
          output_quality: 100,
        },
        request.timeoutMs,
      );
      const settled = await waitForPrediction(apiToken, prediction, request.timeoutMs);
      const outputUrl = firstOutputUrl(settled.output);
      if (!outputUrl) {
        throw new AiProviderError({
          provider: "replicate",
          code: "provider_unavailable",
          message: "Replicate returned no image URL.",
        });
      }

      return {
        provider: "replicate",
        outputUrl,
        outputText: null,
        mimeType: "image/png",
        costEstimate: null,
      };
    }

    const model = request.video?.model || aiConfig.replicate.videoModel;
    const prediction = await createPrediction(
      apiToken,
      model,
      {
        prompt: request.prompt,
        prompt_image: request.video?.imageUrl || undefined,
      },
      request.timeoutMs,
    );
    const settled = await waitForPrediction(apiToken, prediction, request.timeoutMs);
    const outputUrl = firstOutputUrl(settled.output);
    if (!outputUrl) {
      throw new AiProviderError({
        provider: "replicate",
        code: "provider_unavailable",
        message: "Replicate returned no video URL.",
      });
    }

    return {
      provider: "replicate",
      outputUrl,
      outputText: null,
      mimeType: "video/mp4",
      costEstimate: null,
    };
  },
};
