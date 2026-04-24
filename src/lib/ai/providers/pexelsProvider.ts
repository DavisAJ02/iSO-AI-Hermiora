import { aiConfig } from "@/lib/ai/config";
import { AiProviderError, compactErrorBody, inferErrorCode } from "@/lib/ai/errors";
import type { AiProvider, AiProviderRequest } from "@/lib/ai/providers/types";

type PexelsPhotoSearch = {
  photos?: Array<{
    src?: {
      original?: string;
      large2x?: string;
      large?: string;
    } | null;
  }>;
};

type PexelsVideoSearch = {
  videos?: Array<{
    video_files?: Array<{
      link?: string;
      quality?: string;
      width?: number;
      height?: number;
    }>;
  }>;
};

function pexelsError(status: number, bodyText: string) {
  const code = inferErrorCode(status, bodyText);
  return new AiProviderError({
    provider: "pexels",
    code,
    status,
    retryable: code !== "invalid_api_key",
    message: `Pexels failed (${status}): ${compactErrorBody(bodyText)}`,
  });
}

function buildSearchQuery(prompt: string) {
  return prompt
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join(" ")
    .trim() || "creative studio";
}

export const pexelsProvider: AiProvider = {
  name: "pexels",
  supports(jobType) {
    return jobType === "image" || jobType === "video";
  },
  async run(request: AiProviderRequest) {
    const apiKey = aiConfig.pexels.apiKey;
    if (!apiKey) {
      throw new AiProviderError({
        provider: "pexels",
        code: "invalid_api_key",
        message: "PEXELS_API_KEY is not configured.",
        retryable: false,
      });
    }

    const query = encodeURIComponent(buildSearchQuery(request.prompt));
    if (request.jobType === "image") {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=portrait`, {
        headers: { Authorization: apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(request.timeoutMs, 15_000)),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw pexelsError(response.status, bodyText);
      }

      const json = (await response.json()) as PexelsPhotoSearch;
      const photo = json.photos?.[0];
      const outputUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original || null;
      if (!outputUrl) {
        throw new AiProviderError({
          provider: "pexels",
          code: "provider_unavailable",
          message: "Pexels returned no matching image.",
        });
      }

      return {
        provider: "pexels",
        outputUrl,
        outputText: null,
        mimeType: "image/jpeg",
        costEstimate: 0,
      };
    }

    const response = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=1&orientation=portrait`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(Math.min(request.timeoutMs, 15_000)),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw pexelsError(response.status, bodyText);
    }

    const json = (await response.json()) as PexelsVideoSearch;
    const video = json.videos?.[0];
    const file =
      video?.video_files
        ?.slice()
        .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))
        .find((item) => item.link) || null;

    if (!file?.link) {
      throw new AiProviderError({
        provider: "pexels",
        code: "provider_unavailable",
        message: "Pexels returned no matching video.",
      });
    }

    return {
      provider: "pexels",
      outputUrl: file.link,
      outputText: null,
      mimeType: "video/mp4",
      costEstimate: 0,
    };
  },
};
