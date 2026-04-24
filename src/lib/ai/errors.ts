import type { AiErrorCode, AiProviderName } from "@/lib/ai/jobTypes";

/**
 * Normalized provider error used by the router for fallback decisions.
 */
export class AiProviderError extends Error {
  code: AiErrorCode;
  provider: AiProviderName;
  status?: number;
  retryable: boolean;

  constructor(options: {
    provider: AiProviderName;
    code: AiErrorCode;
    message: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(options.message);
    this.name = "AiProviderError";
    this.provider = options.provider;
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? options.code !== "invalid_api_key";
  }
}

export function compactErrorBody(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

export function timeoutError(provider: AiProviderName, timeoutMs: number) {
  return new AiProviderError({
    provider,
    code: "timeout",
    message: `${provider} timed out after ${Math.round(timeoutMs / 1000)}s.`,
    retryable: true,
  });
}

export function unknownProviderError(provider: AiProviderName, error: unknown) {
  if (error instanceof AiProviderError) return error;
  if (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /aborted|timed out|timeout/i.test(error.message))
  ) {
    return new AiProviderError({
      provider,
      code: "timeout",
      message: `${provider} timed out.`,
      retryable: true,
    });
  }
  return new AiProviderError({
    provider,
    code: "unknown",
    message: error instanceof Error ? error.message : `${provider} failed unexpectedly.`,
    retryable: true,
  });
}

export function inferErrorCode(status: number, bodyText: string): AiErrorCode {
  const compact = compactErrorBody(bodyText).toLowerCase();

  if (status === 401 || /invalid api key|incorrect api key|unauthorized|auth/i.test(compact)) {
    return "invalid_api_key";
  }
  if (
    status === 429 &&
    /quota|billing|insufficient_quota|limit reached|credit|spend limit|payment required/i.test(compact)
  ) {
    return "quota_exceeded";
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status >= 500 || /temporarily unavailable|overloaded|unavailable|try again/i.test(compact)) {
    return "provider_unavailable";
  }
  return "unknown";
}
