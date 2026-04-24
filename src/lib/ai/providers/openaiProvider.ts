import { aiConfig } from "@/lib/ai/config";
import { AiProviderError, compactErrorBody, inferErrorCode } from "@/lib/ai/errors";
import type { AiProvider, AiProviderRequest } from "@/lib/ai/providers/types";

/**
 * OpenAI adapter for intelligence-heavy text jobs only. We keep it off image
 * and video so Hermiora does not burn OpenAI credits on media generation.
 */

function extractOutputText(response: unknown): string {
  if (
    response &&
    typeof response === "object" &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  const output = (response as { output?: { content?: { text?: string }[] }[] })?.output;
  return (
    output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string")
      .join("\n") ?? ""
  );
}

function openAiError(status: number, bodyText: string) {
  const code = inferErrorCode(status, bodyText);
  const compact = compactErrorBody(bodyText);
  return new AiProviderError({
    provider: "openai",
    code,
    status,
    retryable: code !== "invalid_api_key",
    message:
      code === "quota_exceeded"
        ? "OpenAI quota is exhausted for this API account or project."
        : code === "rate_limit"
          ? "OpenAI rate limited this request."
          : code === "invalid_api_key"
            ? "OpenAI rejected the API key."
            : `OpenAI failed (${status}): ${compact}`,
  });
}

export const openAiProvider: AiProvider = {
  name: "openai",
  supports(jobType) {
    return jobType === "script" || jobType === "viral_score";
  },
  async run(request: AiProviderRequest) {
    const apiKey = aiConfig.openai.apiKey;
    if (!apiKey) {
      throw new AiProviderError({
        provider: "openai",
        code: "invalid_api_key",
        message: "OPENAI_API_KEY is not configured.",
        retryable: false,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.text?.model || aiConfig.openai.model,
        input: [
          request.text?.systemPrompt
            ? { role: "system", content: request.text.systemPrompt }
            : null,
          { role: "user", content: request.prompt },
        ].filter(Boolean),
        text: request.text?.jsonSchema
          ? {
              format: {
                type: "json_schema",
                name: request.text.schemaName || `${request.jobType}_output`,
                strict: true,
                schema: request.text.jsonSchema,
              },
            }
          : undefined,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(request.timeoutMs),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw openAiError(response.status, bodyText);
    }

    const json = await response.json();
    const outputText = extractOutputText(json);
    const outputJson =
      request.text?.parseJson || request.text?.jsonSchema ? JSON.parse(outputText) : undefined;

    return {
      provider: "openai",
      outputUrl: null,
      outputText,
      outputJson,
      mimeType: "application/json",
      costEstimate: null,
    };
  },
};
