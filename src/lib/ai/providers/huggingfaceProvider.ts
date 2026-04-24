import { aiConfig } from "@/lib/ai/config";
import { AiProviderError, compactErrorBody, inferErrorCode } from "@/lib/ai/errors";
import type { AiProvider, AiProviderRequest } from "@/lib/ai/providers/types";

/**
 * Hugging Face fallback adapter. Text jobs use the router chat-completions API,
 * while media jobs use the inference router model endpoint.
 */

function huggingFaceError(status: number, bodyText: string) {
  const code = inferErrorCode(status, bodyText);
  return new AiProviderError({
    provider: "huggingface",
    code,
    status,
    retryable: code !== "invalid_api_key",
    message: `Hugging Face failed (${status}): ${compactErrorBody(bodyText)}`,
  });
}

function parseJsonText(value: string) {
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

async function readResponseBuffer(response: Response) {
  return Buffer.from(await response.arrayBuffer());
}

export const huggingfaceProvider: AiProvider = {
  name: "huggingface",
  supports() {
    return true;
  },
  async run(request: AiProviderRequest) {
    const apiKey = aiConfig.huggingface.apiKey;
    if (!apiKey) {
      throw new AiProviderError({
        provider: "huggingface",
        code: "invalid_api_key",
        message: "HUGGINGFACE_API_KEY is not configured.",
        retryable: false,
      });
    }

    if (request.jobType === "script" || request.jobType === "viral_score") {
      const jsonInstruction = request.text?.parseJson || request.text?.jsonSchema
        ? "Return valid JSON only. Do not wrap it in markdown."
        : "Return plain text only.";
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Never inherit an OpenAI model name into the Hugging Face fallback path.
          model: aiConfig.huggingface.chatModel,
          messages: [
            request.text?.systemPrompt
              ? { role: "system", content: request.text.systemPrompt }
              : null,
            {
              role: "user",
              content: `${request.prompt}\n\n${jsonInstruction}`,
            },
          ].filter(Boolean),
          temperature: 0.4,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(request.timeoutMs),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw huggingFaceError(response.status, bodyText);
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const outputText = json.choices?.[0]?.message?.content?.trim() || "";
      if (!outputText) {
        throw new AiProviderError({
          provider: "huggingface",
          code: "provider_unavailable",
          message: "Hugging Face returned an empty text response.",
        });
      }

      return {
        provider: "huggingface",
        outputUrl: null,
        outputText,
        outputJson: request.text?.parseJson || request.text?.jsonSchema ? parseJsonText(outputText) : undefined,
        mimeType: "application/json",
        costEstimate: null,
      };
    }

    const model =
      request.jobType === "image"
        ? request.image?.model || aiConfig.huggingface.imageModel
        : request.video?.model || aiConfig.huggingface.videoModel;

    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        request.jobType === "image"
          ? {
              inputs: request.prompt,
              parameters: {
                negative_prompt: request.image?.negativePrompt,
              },
            }
          : {
              inputs: request.prompt,
            },
      ),
      cache: "no-store",
      signal: AbortSignal.timeout(request.timeoutMs),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw huggingFaceError(response.status, bodyText);
    }

    const buffer = await readResponseBuffer(response);
    return {
      provider: "huggingface",
      outputUrl: null,
      outputText: null,
      outputBuffer: buffer,
      mimeType: response.headers.get("content-type"),
      costEstimate: null,
    };
  },
};
