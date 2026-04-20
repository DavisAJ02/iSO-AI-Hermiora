import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAI } from "../openai.client.js";
import type { ImagePromptItem } from "../pipeline/types.js";

export type SceneImageResult = {
  sceneId: number;
  bucket: string;
  storagePath: string;
};

const MAX_IMAGES = 8;

/**
 * Generates stills with DALL·E 3 and uploads to the private `images` bucket.
 * Path: `{userId}/{projectId}/scene-{sceneId}.png`
 */
export async function generateSceneImagesToStorage(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  prompts: ImagePromptItem[];
}): Promise<SceneImageResult[]> {
  const { supabase, userId, projectId, prompts } = params;
  const openai = getOpenAI();
  const bucket = "images";
  const slice = prompts.slice(0, MAX_IMAGES);
  const results: SceneImageResult[] = [];

  for (const { sceneId, prompt } of slice) {
    const img = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}\nVertical 9:16 composition, cinematic, no text or logos in frame.`,
      size: "1024x1792",
      n: 1,
    });

    const first = img.data?.[0];
    const url = first?.url;
    const b64 = first?.b64_json;
    let buffer: Buffer;
    if (url) {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to download generated image (${res.status})`);
      }
      buffer = Buffer.from(await res.arrayBuffer());
    } else if (b64) {
      buffer = Buffer.from(b64, "base64");
    } else {
      throw new Error("Image generation returned no url or b64_json");
    }

    const storagePath = `${userId}/${projectId}/scene-${sceneId}.png`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) {
      throw new Error(`Image upload failed for scene ${sceneId}: ${upErr.message}`);
    }
    results.push({ sceneId, bucket, storagePath });
  }

  return results;
}
