export type PipelineStepId =
  | "hook"
  | "script"
  | "scenes"
  | "image_prompts"
  | "voice"
  | "captions"
  | "render_prep"
  | "render";

export type PipelineJobStatus = "pending" | "processing" | "done" | "failed";

export type ProjectStatus =
  | "generating"
  | "ready"
  | "draft"
  | "published"
  | "failed";

export type PlanTier = "free" | "creator" | "pro";

export type BillingPeriod = "monthly" | "yearly";

export type PaymentMethod = "apple" | "mobile_money" | "card";

export type MobileOperator = "mpesa" | "orange" | "airtel" | "africel" | "mtn";

export interface CreativeControls {
  niche: string;
  language: string;
  voiceStyle: string;
  artStyle: string;
  captionStyle: string;
  backgroundMusic: string;
  effects: string[];
  exampleScript?: string;
}

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
}

export interface GenerationState {
  projectId?: string;
  active: boolean;
  progress: number;
  currentStep: PipelineStepId;
  statusText: string;
}

export interface GenerationStepState {
  step: PipelineStepId;
  status: PipelineJobStatus;
  updatedAt?: string | null;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  status: ProjectStatus;
  durationSec: number;
  gradient: string;
  /** 0–100 when status is generating; shown on thumbnails */
  thumbProgress?: number;
  idea?: string | null;
  creativeControls?: CreativeControls | null;
  seriesId?: string | null;
  seriesTitle?: string | null;
  createdAt?: string;
  currentStep?: PipelineStepId;
  generationSteps?: GenerationStepState[];
}

export interface Series {
  id: string;
  title: string;
  description?: string | null;
  defaultCreativeControls: CreativeControls;
  projectCount: number;
  readyCount: number;
  generatingCount: number;
  createdAt?: string;
}

export interface Testimonial {
  id: string;
  initials: string;
  handle: string;
  quote: string;
}
