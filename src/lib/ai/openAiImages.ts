import type { SupabaseClient } from "@supabase/supabase-js";
import { runAiJob } from "@/lib/ai/aiRouter";
import { getArtStylePreset } from "@/lib/ai/artStylePresets";

type ImagePromptOutput = {
  art_style?: string;
  aspect_ratio?: string;
  negative_prompt?: string;
  prompts?: string[];
  shots?: {
    label?: string;
    prompt?: string;
    motion_hint?: string;
  }[];
};

type GenerationRow = {
  step: string | null;
  output?: unknown;
};

type ProjectImageRow = {
  id: string;
  user_id: string;
  title?: string | null;
  idea?: string | null;
  generations?: GenerationRow[] | null;
};

type StoredImage = {
  label: string;
  storage_path: string;
  mime_type: string;
  prompt: string;
  provider: string;
  motion_hint?: string;
};

function getGenerationOutput<T>(rows: GenerationRow[] | null | undefined, step: string): T | null {
  const match = (rows ?? []).find((row) => row.step === step);
  return (match?.output as T | null) ?? null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function sizeFromAspectRatio(aspectRatio: string | undefined) {
  if (!aspectRatio) return "1024x1536";
  if (aspectRatio.includes("16:9")) return "1536x1024";
  return "1024x1536";
}

async function resolveImageBuffer(outputUrl: string | null, outputBuffer?: Buffer) {
  if (outputBuffer) return outputBuffer;
  if (!outputUrl) throw new Error("Image provider returned no file output.");

  const response = await fetch(outputUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Generated image could not be downloaded (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildStyledPrompt(basePrompt: string, artStyle: string | undefined, motionHint: string | undefined) {
  const preset = getArtStylePreset(artStyle);
  return [
    preset?.promptGuide ?? null,
    basePrompt,
    motionHint?.trim() ? `Motion cue for framing: ${motionHint.trim()}` : null,
    "vertical premium short-form visual, crisp focal subject, polished lighting, strong composition, no text overlay, high production value",
  ]
    .filter(Boolean)
    .join(". ");
}

function buildNegativePrompt(baseNegativePrompt: string | undefined, artStyle: string | undefined) {
  const preset = getArtStylePreset(artStyle);
  return [baseNegativePrompt?.trim() || null, preset?.negativeGuide ?? null]
    .filter(Boolean)
    .join(", ");
}

export async function saveProjectImages(admin: SupabaseClient, project: ProjectImageRow) {
  const imageOutput = getGenerationOutput<ImagePromptOutput>(project.generations, "image_prompts");
  const structuredShots = (imageOutput?.shots ?? [])
    .filter((shot) => shot?.prompt?.trim())
    .slice(0, 3);
  const legacyShots =
    structuredShots.length === 0
      ? (imageOutput?.prompts ?? [])
          .filter((prompt) => typeof prompt === "string" && prompt.trim())
          .slice(0, 3)
          .map((prompt, index) => ({
            label: `Shot ${index + 1}`,
            prompt,
            motion_hint: "",
          }))
      : [];
  const shots = structuredShots.length > 0 ? structuredShots : legacyShots;
  if (shots.length === 0) {
    throw new Error("No image prompts are available for image generation.");
  }

  const size = sizeFromAspectRatio(imageOutput?.aspect_ratio);
  const negativePrompt = buildNegativePrompt(imageOutput?.negative_prompt, imageOutput?.art_style);
  const generatedImages: StoredImage[] = [];

  for (const [index, shot] of shots.entries()) {
    const label = shot.label?.trim() || `Shot ${index + 1}`;
    const prompt = shot.prompt?.trim() || "";
    const filename = `${String(index + 1).padStart(2, "0")}-${slugify(label || project.title || "image") || "image"}.png`;
    const storagePath = `${project.user_id}/projects/${project.id}/${filename}`;
    const styledPrompt = buildStyledPrompt(prompt, imageOutput?.art_style, shot.motion_hint);
    const generation = await runAiJob(admin, {
      userId: project.user_id,
      jobType: "image",
      prompt: styledPrompt,
      image: {
        aspectRatio: imageOutput?.aspect_ratio,
        negativePrompt,
        size,
      },
      metadata: {
        projectId: project.id,
        shotLabel: label,
      },
    });
    const imageBuffer = await resolveImageBuffer(generation.outputUrl, generation.outputBuffer);
    const mimeType = generation.mimeType || "image/png";
    const { error: uploadError } = await admin.storage
      .from("images")
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    generatedImages.push({
      label,
      storage_path: storagePath,
      mime_type: mimeType,
      prompt: styledPrompt,
      provider: generation.providerUsed,
      motion_hint: shot.motion_hint?.trim() || undefined,
    });
  }

  const nextOutput = {
    ...imageOutput,
    quality: "provider-managed",
    negative_prompt: negativePrompt || imageOutput?.negative_prompt,
    generated_images: generatedImages,
  };

  const { error } = await admin
    .from("generations")
    .update({
      status: "done",
      output: nextOutput,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", project.id)
    .eq("step", "image_prompts");

  if (error) throw error;

  return nextOutput;
}
