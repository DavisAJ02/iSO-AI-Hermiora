import {
  ART_STYLE_OPTIONS,
  BACKGROUND_MUSIC_OPTIONS,
  CAPTION_STYLE_OPTIONS,
  EFFECT_OPTIONS,
  LANGUAGE_OPTIONS,
  NICHE_OPTIONS,
  VOICE_STYLE_OPTIONS,
} from "@/lib/constants";
import type { CreativeControls } from "@/lib/types";

export const DEFAULT_CREATIVE_CONTROLS: CreativeControls = {
  niche: "Storytelling",
  language: "English",
  voiceStyle: "Narration",
  artStyle: "Realism",
  captionStyle: "Bold Stroke",
  backgroundMusic: "Ambient Pulse",
  effects: ["Animated Hook"],
  exampleScript: "",
};

function normalizeStringOption(
  raw: unknown,
  options: readonly string[],
  fallback: string,
) {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  return options.includes(value) ? value : fallback;
}

export function normalizeCreativeControls(
  value: unknown,
  fallback: CreativeControls = DEFAULT_CREATIVE_CONTROLS,
): CreativeControls {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback, effects: [...fallback.effects] };
  }

  const controls = value as Record<string, unknown>;
  const effects = Array.isArray(controls.effects)
    ? controls.effects
        .map((effect) => (typeof effect === "string" ? effect.trim() : ""))
        .filter((effect): effect is string => EFFECT_OPTIONS.includes(effect as (typeof EFFECT_OPTIONS)[number]))
        .slice(0, 6)
    : fallback.effects;

  const exampleScript =
    typeof controls.exampleScript === "string" && controls.exampleScript.trim()
      ? controls.exampleScript.trim().slice(0, 1000)
      : fallback.exampleScript ?? "";

  return {
    niche: normalizeStringOption(controls.niche, NICHE_OPTIONS, fallback.niche),
    language: normalizeStringOption(controls.language, LANGUAGE_OPTIONS, fallback.language),
    voiceStyle: normalizeStringOption(
      controls.voiceStyle,
      VOICE_STYLE_OPTIONS,
      fallback.voiceStyle,
    ),
    artStyle: normalizeStringOption(controls.artStyle, ART_STYLE_OPTIONS, fallback.artStyle),
    captionStyle: normalizeStringOption(
      controls.captionStyle,
      CAPTION_STYLE_OPTIONS,
      fallback.captionStyle,
    ),
    backgroundMusic: normalizeStringOption(
      controls.backgroundMusic,
      BACKGROUND_MUSIC_OPTIONS,
      fallback.backgroundMusic,
    ),
    effects,
    exampleScript,
  };
}

export function mergeCreativeControls(
  base: CreativeControls | null | undefined,
  override: CreativeControls | null | undefined,
) {
  return normalizeCreativeControls(
    {
      ...(base ?? DEFAULT_CREATIVE_CONTROLS),
      ...(override ?? {}),
      effects: override?.effects?.length ? override.effects : base?.effects,
      exampleScript:
        override?.exampleScript?.trim() || base?.exampleScript?.trim() || "",
    },
    DEFAULT_CREATIVE_CONTROLS,
  );
}
