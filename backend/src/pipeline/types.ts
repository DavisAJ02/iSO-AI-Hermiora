/** Single scene after script breakdown */
export type Scene = {
  id: number;
  title: string;
  narration: string;
  visualDescription: string;
  estimatedSeconds?: number;
};

export type SceneBreakdown = {
  scenes: Scene[];
};

export type ImagePromptItem = {
  sceneId: number;
  prompt: string;
};

export type ImagePromptPlan = {
  prompts: ImagePromptItem[];
};

export type CaptionCue = {
  startSec: number;
  endSec: number;
  text: string;
};

export type CaptionTrack = {
  format: "vtt";
  vtt: string;
  cues?: CaptionCue[];
};

export type RenderPrepManifest = {
  version: 1;
  projectId: string;
  hook: string;
  script: string;
  scenes: SceneBreakdown;
  imagePrompts: ImagePromptPlan;
  imageAssets: { sceneId: number; storagePath: string; bucket: string }[];
  voice: { storagePath: string; bucket: string; format: string };
  captions: CaptionTrack;
  createdAt: string;
};
