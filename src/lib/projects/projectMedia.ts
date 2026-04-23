import type { SupabaseClient } from "@supabase/supabase-js";

type GenerationRow = {
  step: string | null;
  output?: unknown;
};

type ProjectWithMedia = {
  generations?: GenerationRow[] | null;
} & Record<string, unknown>;

type GeneratedImage = {
  storage_path?: string;
  [key: string]: unknown;
};

type ImagePromptOutput = {
  generated_images?: GeneratedImage[];
  [key: string]: unknown;
};

export async function hydrateProjectMediaUrls<T extends ProjectWithMedia>(
  admin: SupabaseClient,
  project: T,
) {
  const generations = Array.isArray(project.generations) ? project.generations : [];

  const nextGenerations = await Promise.all(
    generations.map(async (generation) => {
      if (generation.step !== "image_prompts") return generation;
      const output = generation.output as ImagePromptOutput | undefined;
      const generatedImages = Array.isArray(output?.generated_images)
        ? output.generated_images
        : [];

      if (generatedImages.length === 0) return generation;

      const signedImages = await Promise.all(
        generatedImages.map(async (image) => {
          const path = image.storage_path;
          if (!path) return image;
          const { data } = await admin.storage.from("images").createSignedUrl(path, 60 * 60 * 24);
          return {
            ...image,
            signed_url: data?.signedUrl ?? null,
          };
        }),
      );

      return {
        ...generation,
        output: {
          ...output,
          generated_images: signedImages,
        },
      };
    }),
  );

  return {
    ...project,
    generations: nextGenerations,
  };
}
