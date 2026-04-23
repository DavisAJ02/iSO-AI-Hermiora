import type { PipelineStep } from "./types";

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "hook", label: "Hook" },
  { id: "script", label: "Script" },
  { id: "scenes", label: "Scenes" },
  { id: "image_prompts", label: "Images" },
  { id: "voice", label: "Voice" },
  { id: "captions", label: "Captions" },
  { id: "render_prep", label: "Prep" },
  { id: "render", label: "Rendering" },
];

export const VOICE_OPTIONS = [
  "Dramatic Male",
  "Calm Female",
  "Energetic Male",
  "Soft Female",
] as const;

export const VIDEO_STYLE_OPTIONS = [
  "Cinematic",
  "Minimal",
  "Bold",
  "Dark",
] as const;

export const NICHE_OPTIONS = [
  "Storytelling",
  "History",
  "Motivation",
  "Finance",
  "Psychology",
  "Mythology",
  "Horror",
  "Anime",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Swahili",
  "Lingala",
  "Spanish",
] as const;

export const VOICE_STYLE_OPTIONS = [
  "Narration",
  "High Energy",
  "Calm Explainer",
  "Dark Dramatic",
  "Storyteller",
] as const;

export const ART_STYLE_OPTIONS = [
  "Modern Cartoon",
  "Comic",
  "Creep Comic",
  "Anime",
  "Mythology",
  "Painting",
  "Dark Fantasy",
  "Realism",
  "Pixel Art",
] as const;

export const CAPTION_STYLE_OPTIONS = [
  "Bold Stroke",
  "Red Highlight",
  "Sleek",
  "Karaoke",
  "Creator Pop",
] as const;

export const EFFECT_OPTIONS = [
  "Animated Hook",
  "Shake Effect",
  "Film Grain",
  "Fast Zooms",
  "Cinematic Glow",
] as const;

export const QUICK_TEMPLATES = [
  { emoji: "☠️", label: "Scary Story" },
  { emoji: "🔥", label: "Motivation" },
  { emoji: "⚔️", label: "History" },
] as const;
