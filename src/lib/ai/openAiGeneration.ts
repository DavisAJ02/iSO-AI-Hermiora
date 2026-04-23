import type { SupabaseClient } from "@supabase/supabase-js";
import { getTikTokTrendContext } from "@/lib/ai/providerHealth";
import { PIPELINE_STEPS } from "@/lib/constants";
import type { PipelineStepId } from "@/lib/types";

type ProjectGenerationRow = {
  id: string;
  title: string | null;
  idea: string | null;
};

type ViralGeneration = {
  metadata: {
    niche: string;
    platform: string;
    titles: string[];
    hashtags: string[];
  };
  hook: {
    primary: string;
    variants: string[];
  };
  script: {
    voiceover: string;
    beats: string[];
  };
  scenes: {
    items: {
      label: string;
      direction: string;
      on_screen_text: string;
    }[];
  };
  image_prompts: {
    prompts: string[];
  };
  voice: {
    voice_style: string;
    direction: string;
  };
  captions: {
    style: string;
    keywords: string[];
  };
  render_prep: {
    format: string;
    checks: string[];
  };
  render: {
    preview: string;
    export: string;
  };
};

const generationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "metadata",
    "hook",
    "script",
    "scenes",
    "image_prompts",
    "voice",
    "captions",
    "render_prep",
    "render",
  ],
  properties: {
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["niche", "platform", "titles", "hashtags"],
      properties: {
        niche: { type: "string" },
        platform: { type: "string" },
        titles: { type: "array", items: { type: "string" } },
        hashtags: { type: "array", items: { type: "string" } },
      },
    },
    hook: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "variants"],
      properties: {
        primary: { type: "string" },
        variants: { type: "array", items: { type: "string" } },
      },
    },
    script: {
      type: "object",
      additionalProperties: false,
      required: ["voiceover", "beats"],
      properties: {
        voiceover: { type: "string" },
        beats: { type: "array", items: { type: "string" } },
      },
    },
    scenes: {
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "direction", "on_screen_text"],
            properties: {
              label: { type: "string" },
              direction: { type: "string" },
              on_screen_text: { type: "string" },
            },
          },
        },
      },
    },
    image_prompts: {
      type: "object",
      additionalProperties: false,
      required: ["prompts"],
      properties: {
        prompts: { type: "array", items: { type: "string" } },
      },
    },
    voice: {
      type: "object",
      additionalProperties: false,
      required: ["voice_style", "direction"],
      properties: {
        voice_style: { type: "string" },
        direction: { type: "string" },
      },
    },
    captions: {
      type: "object",
      additionalProperties: false,
      required: ["style", "keywords"],
      properties: {
        style: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
    },
    render_prep: {
      type: "object",
      additionalProperties: false,
      required: ["format", "checks"],
      properties: {
        format: { type: "string" },
        checks: { type: "array", items: { type: "string" } },
      },
    },
    render: {
      type: "object",
      additionalProperties: false,
      required: ["preview", "export"],
      properties: {
        preview: { type: "string" },
        export: { type: "string" },
      },
    },
  },
} as const;

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

function normalizeOpenAiError(status: number, bodyText: string) {
  const compact = bodyText.replace(/\s+/g, " ").trim();
  if (
    status === 429 &&
    /quota|billing details|insufficient_quota|max(imum)? monthly spend/i.test(compact)
  ) {
    return "OpenAI quota is exhausted for this API account or project. Add credits, raise the spend limit, or switch to a funded API project.";
  }
  if (status === 401) {
    return "OpenAI rejected the API key. Verify the deployed OPENAI_API_KEY and project permissions.";
  }
  if (status === 403) {
    return "OpenAI denied access for this request. Check project permissions, model access, and any IP restrictions.";
  }
  return `OpenAI generation failed (${status}): ${compact.slice(0, 240)}`;
}

function stepOutput(generation: ViralGeneration, step: PipelineStepId) {
  return generation[step];
}

export async function generateViralVideoPackage(project: ProjectGenerationRow) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");

  const model = process.env.OPENAI_GENERATION_MODEL?.trim() || "gpt-4.1-mini";
  const idea = project.idea?.trim() || project.title?.trim() || "short-form video idea";
  const trendContext = getTikTokTrendContext();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Hermiora AI, a senior short-form video strategist. Generate viral-style content that is specific, ethical, punchy, and optimized for TikTok/Reels/Shorts. Return only JSON matching the schema.",
        },
        {
          role: "user",
          content: `Create a 35-55 second vertical video package for this idea: ${idea}\n\nTrend context: ${trendContext}\n\nMake it emotionally sharp, clear for a creator to record, and suitable for a production pipeline.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "hermiora_viral_generation",
          strict: true,
          schema: generationSchema,
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(normalizeOpenAiError(res.status, text));
  }

  const json = await res.json();
  const outputText = extractOutputText(json);
  if (!outputText) throw new Error("OpenAI response did not include output text.");
  return JSON.parse(outputText) as ViralGeneration;
}

export async function runRealProjectGeneration(
  admin: SupabaseClient,
  project: ProjectGenerationRow,
) {
  const timestamp = new Date().toISOString();

  await admin
    .from("projects")
    .update({ status: "generating", progress: 15, updated_at: timestamp })
    .eq("id", project.id);

  try {
    const generation = await generateViralVideoPackage(project);
    const stepResults = await Promise.all(
      PIPELINE_STEPS.map((step) =>
        admin
          .from("generations")
          .update({
            status: "done",
            output: stepOutput(generation, step.id),
            updated_at: timestamp,
          })
          .eq("project_id", project.id)
          .eq("step", step.id),
      ),
    );

    const stepError = stepResults.find((result) => result.error)?.error;
    if (stepError) throw stepError;

    await admin
      .from("projects")
      .update({
        title: generation.metadata.titles[0] || project.title,
        status: "ready",
        progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    await admin
      .from("projects")
      .update({ status: "failed", progress: 1, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    await admin
      .from("generations")
      .update({
        status: "failed",
        output: { error: message },
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", project.id)
      .eq("step", "hook");
    throw error;
  }
}
