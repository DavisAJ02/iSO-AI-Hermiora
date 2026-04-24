import type { SupabaseClient } from "@supabase/supabase-js";
import { runAiJob } from "@/lib/ai/aiRouter";
import { getArtStylePreset } from "@/lib/ai/artStylePresets";
import { aiConfig } from "@/lib/ai/config";
import { saveProjectImages } from "@/lib/ai/openAiImages";
import { saveProjectVoice } from "@/lib/ai/elevenLabsVoice";
import { getTikTokTrendContext } from "@/lib/ai/providerHealth";
import { PIPELINE_STEPS } from "@/lib/constants";
import type { CreativeControls, PipelineStepId } from "@/lib/types";

type ProjectGenerationRow = {
  id: string;
  user_id: string;
  title: string | null;
  idea: string | null;
  series_id?: string | null;
  series_context?: string | null;
  creative_controls?: CreativeControls | null;
};

type ViralGeneration = {
  metadata: {
    niche: string;
    platform: string;
    language: string;
    voice_style: string;
    art_style: string;
    caption_style: string;
    background_music: string;
    effects: string[];
    style_reference: string;
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
    art_style: string;
    aspect_ratio: string;
    negative_prompt: string;
    shots: {
      label: string;
      prompt: string;
      motion_hint: string;
    }[];
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
      required: [
        "niche",
        "platform",
        "language",
        "voice_style",
        "art_style",
        "caption_style",
        "background_music",
        "effects",
        "style_reference",
        "titles",
        "hashtags",
      ],
      properties: {
        niche: { type: "string" },
        platform: { type: "string" },
        language: { type: "string" },
        voice_style: { type: "string" },
        art_style: { type: "string" },
        caption_style: { type: "string" },
        background_music: { type: "string" },
        effects: { type: "array", items: { type: "string" } },
        style_reference: { type: "string" },
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
      required: ["art_style", "aspect_ratio", "negative_prompt", "shots"],
      properties: {
        art_style: { type: "string" },
        aspect_ratio: { type: "string" },
        negative_prompt: { type: "string" },
        shots: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "prompt", "motion_hint"],
            properties: {
              label: { type: "string" },
              prompt: { type: "string" },
              motion_hint: { type: "string" },
            },
          },
        },
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

function stepOutput(generation: ViralGeneration, step: PipelineStepId) {
  return generation[step];
}

function describeCreativeControls(controls: CreativeControls | null | undefined) {
  if (!controls) return "No creative controls were provided.";
  const artStylePreset = getArtStylePreset(controls.artStyle);

  const parts = [
    `Niche: ${controls.niche}`,
    `Language: ${controls.language}`,
    `Voice style: ${controls.voiceStyle}`,
    `Art style: ${controls.artStyle}`,
    artStylePreset ? `Art style blueprint: ${artStylePreset.promptGuide}` : null,
    `Caption style: ${controls.captionStyle}`,
    `Background music: ${controls.backgroundMusic}`,
    controls.effects.length > 0 ? `Effects: ${controls.effects.join(", ")}` : null,
    controls.exampleScript?.trim()
      ? `Example script to match tone: ${controls.exampleScript.trim()}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}

function describeSeriesContext(project: ProjectGenerationRow) {
  return project.series_context?.trim()
    ? `Series continuity context:\n${project.series_context.trim()}`
    : "No series continuity context was provided.";
}

export async function generateViralVideoPackage(
  admin: SupabaseClient,
  project: ProjectGenerationRow,
) {
  if (!aiConfig.openai.apiKey && !aiConfig.huggingface.apiKey) {
    throw new Error("No script generation provider is configured.");
  }

  const idea = project.idea?.trim() || project.title?.trim() || "short-form video idea";
  const trendContext = getTikTokTrendContext();
  const creativeControls = describeCreativeControls(project.creative_controls);
  const seriesContext = describeSeriesContext(project);
  const prompt = `Create a 35-55 second vertical video package for this idea: ${idea}

Trend context: ${trendContext}

Creative controls:
${creativeControls}

${seriesContext}

Make it emotionally sharp, clear for a creator to record, and suitable for a production pipeline. Match the requested language, tone reference, art direction, captions, effects, and series continuity when they are provided.`;

  const result = await runAiJob(admin, {
    userId: project.user_id,
    jobType: "script",
    prompt,
    text: {
      model: aiConfig.openai.model,
      parseJson: true,
      schemaName: "hermiora_viral_generation",
      jsonSchema: generationSchema,
      systemPrompt:
        "You are Hermiora AI, a senior short-form video strategist. Generate viral-style content that is specific, ethical, punchy, and optimized for TikTok/Reels/Shorts. Return only JSON matching the schema. Make the image_prompts step visually specific: each shot prompt must clearly reflect the requested art style, visual effects, and storytelling tone with premium composition, clean anatomy, and high-detail finish suitable for polished short-form content.",
    },
    metadata: {
      projectId: project.id,
      seriesId: project.series_id ?? null,
    },
  });

  if (!result.outputJson) {
    throw new Error("The AI router returned no structured generation payload.");
  }
  return result.outputJson as ViralGeneration;
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
    const generation = await generateViralVideoPackage(admin, project);
    const stepResults = await Promise.all(
      PIPELINE_STEPS.map((step) => {
        const baseOutput = stepOutput(generation, step.id);
        const status =
          step.id === "voice" && process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim()
            ? "processing"
            : "done";
        return admin
          .from("generations")
          .update({
            status,
            output: baseOutput,
            updated_at: timestamp,
          })
          .eq("project_id", project.id)
          .eq("step", step.id);
      }),
    );

    const stepError = stepResults.find((result) => result.error)?.error;
    if (stepError) throw stepError;

    if (process.env.HERMIORA_IMAGE_GENERATION !== "off") {
      try {
        await saveProjectImages(admin, {
          id: project.id,
          user_id: project.user_id,
          title: generation.metadata.titles[0] || project.title,
          idea: project.idea,
          generations: [{ step: "image_prompts", output: generation.image_prompts }],
        });
      } catch (imageError) {
        await admin
          .from("generations")
          .update({
            status: "failed",
            output: {
              ...generation.image_prompts,
              error:
                imageError instanceof Error
                  ? imageError.message
                  : "Image generation failed.",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", project.id)
          .eq("step", "image_prompts");
      }
    }

    if (process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim()) {
      try {
        await saveProjectVoice(admin, {
          id: project.id,
          title: generation.metadata.titles[0] || project.title,
          idea: project.idea,
          generations: [
            { step: "script", output: generation.script },
            { step: "voice", output: generation.voice },
          ],
        });
      } catch (voiceError) {
        await admin
          .from("generations")
          .update({
            status: "failed",
            output: {
              ...generation.voice,
              error:
                voiceError instanceof Error
                  ? voiceError.message
                  : "Voice generation failed.",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", project.id)
          .eq("step", "voice");
      }
    }

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
