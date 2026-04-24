/**
 * Central AI env resolution. We support both the target variable names and the
 * older aliases already present in local/Vercel configs so the migration stays
 * smooth.
 */

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export const aiConfig = {
  openai: {
    apiKey: firstEnv("OPENAI_API_KEY", "OPENAI_SECRET_KEY"),
    model: firstEnv("OPENAI_TEXT_MODEL", "OPENAI_GENERATION_MODEL") || "gpt-4.1-mini",
  },
  replicate: {
    apiToken: firstEnv("REPLICATE_API_TOKEN"),
    imageModel: firstEnv("REPLICATE_IMAGE_MODEL") || "black-forest-labs/flux-schnell",
    videoModel: firstEnv("REPLICATE_VIDEO_MODEL") || "minimax/video-01",
  },
  runway: {
    apiKey: firstEnv("RUNWAY_API_KEY", "RUNWAY_API_TOKEN"),
    apiVersion: firstEnv("RUNWAY_API_VERSION") || "2024-11-06",
    videoModel: firstEnv("RUNWAY_VIDEO_MODEL") || "gen4_turbo",
  },
  huggingface: {
    apiKey: firstEnv("HUGGINGFACE_API_KEY", "HUGGINGFACE_API_TOKEN"),
    chatModel:
      firstEnv("HUGGINGFACE_CHAT_MODEL") || "katanemo/Arch-Router-1.5B:hf-inference",
    imageModel:
      firstEnv("HUGGINGFACE_IMAGE_MODEL") || "black-forest-labs/FLUX.1-schnell",
    videoModel: firstEnv("HUGGINGFACE_VIDEO_MODEL") || "genmo/mochi-1-preview",
  },
  pexels: {
    apiKey: firstEnv("PEXELS_API_KEY"),
  },
};
