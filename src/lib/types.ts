export type PipelineStepId =
  | "hook"
  | "script"
  | "scenes"
  | "voice"
  | "rendering";

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

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
}

export interface GenerationState {
  active: boolean;
  progress: number;
  currentStep: PipelineStepId;
  statusText: string;
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
  createdAt?: string;
}

export interface Series {
  id: string;
  title: string;
  category: string;
  videoCount: number;
  durationLabel: string;
  voice: string;
  thumbClass: string;
  viewsLabel: string;
  likesLabel: string;
  avgWatchLabel: string;
  engagementPct: number;
  /** Tailwind gradient classes for engagement bar fill */
  engagementBarClass: string;
}

export interface Testimonial {
  id: string;
  initials: string;
  handle: string;
  quote: string;
}
