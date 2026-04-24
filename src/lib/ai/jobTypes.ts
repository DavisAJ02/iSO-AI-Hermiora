/**
 * Shared AI routing types. The router and each provider adapter speak this
 * normalized contract so we can swap vendors without rewriting call sites.
 */

export type AiJobType = "script" | "viral_score" | "image" | "video";

export type AiProviderName = "openai" | "replicate" | "runway" | "huggingface" | "pexels";

export type AiJobStatus = "pending" | "processing" | "done" | "failed";

export type AiErrorCode =
  | "quota_exceeded"
  | "rate_limit"
  | "timeout"
  | "invalid_api_key"
  | "provider_unavailable"
  | "unsupported_job"
  | "unknown";

export interface AiJobRequest {
  userId: string;
  jobType: AiJobType;
  prompt: string;
  text?: {
    systemPrompt?: string;
    jsonSchema?: Record<string, unknown>;
    schemaName?: string;
    parseJson?: boolean;
    model?: string;
  };
  image?: {
    aspectRatio?: string;
    negativePrompt?: string;
    size?: string;
    model?: string;
  };
  video?: {
    imageUrl?: string | null;
    durationSeconds?: number;
    aspectRatio?: string;
    model?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AiJobResult {
  success: true;
  providerUsed: AiProviderName;
  jobType: AiJobType;
  outputUrl: string | null;
  outputText: string | null;
  outputJson?: unknown;
  outputBuffer?: Buffer;
  mimeType?: string | null;
  costEstimate?: number | null;
}

export interface AiProviderRequest {
  jobType: AiJobType;
  prompt: string;
  timeoutMs: number;
  text?: AiJobRequest["text"];
  image?: AiJobRequest["image"];
  video?: AiJobRequest["video"];
  metadata?: Record<string, unknown>;
}

export interface AiProviderResult {
  provider: AiProviderName;
  outputUrl: string | null;
  outputText: string | null;
  outputJson?: unknown;
  outputBuffer?: Buffer;
  mimeType?: string | null;
  costEstimate?: number | null;
}

export interface AiProvider {
  readonly name: AiProviderName;
  supports(jobType: AiJobType): boolean;
  run(request: AiProviderRequest): Promise<AiProviderResult>;
}
