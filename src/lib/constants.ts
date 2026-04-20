import type { PipelineStep } from "./types";

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "hook", label: "Hook" },
  { id: "script", label: "Script" },
  { id: "scenes", label: "Scenes" },
  { id: "voice", label: "Voice" },
  { id: "rendering", label: "Rendering" },
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

export const QUICK_TEMPLATES = [
  { emoji: "☠️", label: "Scary Story" },
  { emoji: "🔥", label: "Motivation" },
  { emoji: "⚔️", label: "History" },
] as const;
