import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserSupabaseClient } from "../lib/supabase.js";
import { generateSceneImagesToStorage, type SceneImageResult } from "../services/image.service.js";
import {
  generateCaptions,
  generateHook,
  generateImagePrompts,
  generateSceneBreakdown,
  generateScript,
} from "../services/openai.service.js";
import { buildRenderPrepManifest, renderVideoFromManifest } from "../services/render.service.js";
import { synthesizeSpeechToStorage, type VoiceSynthesisResult } from "../services/tts.service.js";
import type { CaptionTrack, ImagePromptPlan, RenderPrepManifest, SceneBreakdown } from "./types.js";

export class PipelineStepError extends Error {
  readonly step: string;

  constructor(step: string, message: string, cause?: unknown) {
    super(message);
    this.name = "PipelineStepError";
    this.step = step;
    if (cause !== undefined && (this as Error & { cause?: unknown }).cause === undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

const PROGRESS = {
  hook: 10,
  script: 30,
  scenes: 50,
  imagePrompts: 60,
  voice: 70,
  captions: 85,
  renderPrep: 95,
  render: 100,
} as const;

async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  fields: { progress?: number; status?: "generating" | "ready" | "failed"; video_url?: string | null },
): Promise<void> {
  const { error } = await supabase.from("projects").update(fields).eq("id", projectId);
  if (error) {
    throw new PipelineStepError("project", `Failed to update project: ${error.message}`, error);
  }
}

async function startGenerationRow(
  supabase: SupabaseClient,
  projectId: string,
  step: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("generations")
    .insert({
      project_id: projectId,
      step,
      status: "processing",
      output: { startedAt: new Date().toISOString() },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new PipelineStepError(step, error?.message ?? "Failed to insert generation row", error);
  }
  return data.id as string;
}

async function finishGenerationRow(
  supabase: SupabaseClient,
  genId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("generations").update({ status: "done", output }).eq("id", genId);
  if (error) {
    throw new PipelineStepError("generations", error.message, error);
  }
}

async function failGenerationRow(supabase: SupabaseClient, genId: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await supabase
    .from("generations")
    .update({ status: "failed", output: { error: message } })
    .eq("id", genId);
}

/**
 * Runs the full Hermiora generation pipeline for a project (sequential steps, Supabase updates).
 * Uses the caller's JWT — RLS applies. Requires `OPENAI_API_KEY` and storage policies for audio/images.
 */
export async function generateVideoPipeline(params: { projectId: string; accessToken: string }): Promise<void> {
  const { projectId, accessToken } = params;
  const supabase = createUserSupabaseClient(accessToken);

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id, idea, title, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !project) {
    throw new PipelineStepError("project", pErr?.message ?? "Project not found", pErr);
  }

  const idea = (project.idea ?? "").trim() || (project.title ?? "").trim();
  if (!idea) {
    await updateProject(supabase, projectId, { status: "failed", progress: 0 });
    throw new PipelineStepError("project", "Project has no idea or title to generate from");
  }

  const userId = project.user_id as string;
  await updateProject(supabase, projectId, { status: "generating", progress: 0 });

  let hookText = "";
  let scriptText = "";
  let scenes: SceneBreakdown = { scenes: [] };
  let imagePrompts: ImagePromptPlan = { prompts: [] };
  let imageAssets: SceneImageResult[] = [];
  let voiceMeta: VoiceSynthesisResult | null = null;
  let manifest: RenderPrepManifest | undefined;

  try {
    // 1 — Hook
    let genId = await startGenerationRow(supabase, projectId, "hook");
    try {
      hookText = await generateHook(idea);
      await finishGenerationRow(supabase, genId, { hook: hookText });
      await updateProject(supabase, projectId, { progress: PROGRESS.hook });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("hook", e instanceof Error ? e.message : String(e), e);
    }

    // 2 — Script
    genId = await startGenerationRow(supabase, projectId, "script");
    try {
      scriptText = await generateScript(idea, hookText);
      await finishGenerationRow(supabase, genId, { script: scriptText });
      await updateProject(supabase, projectId, { progress: PROGRESS.script });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("script", e instanceof Error ? e.message : String(e), e);
    }

    // 3 — Scene breakdown (structured JSON)
    genId = await startGenerationRow(supabase, projectId, "scenes");
    try {
      scenes = await generateSceneBreakdown(scriptText);
      await finishGenerationRow(supabase, genId, { scenes });
      await updateProject(supabase, projectId, { progress: PROGRESS.scenes });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("scenes", e instanceof Error ? e.message : String(e), e);
    }

    // 4 — Image prompts (LLM) + image generation (DALL·E → storage)
    genId = await startGenerationRow(supabase, projectId, "image_prompts");
    try {
      imagePrompts = await generateImagePrompts(scenes);
      imageAssets = await generateSceneImagesToStorage({
        supabase,
        userId,
        projectId,
        prompts: imagePrompts.prompts,
      });
      await finishGenerationRow(supabase, genId, {
        prompts: imagePrompts.prompts,
        assets: imageAssets,
      });
      await updateProject(supabase, projectId, { progress: PROGRESS.imagePrompts });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("image_prompts", e instanceof Error ? e.message : String(e), e);
    }

    // 5 — Voice (TTS)
    genId = await startGenerationRow(supabase, projectId, "voice");
    try {
      voiceMeta = await synthesizeSpeechToStorage({
        supabase,
        userId,
        projectId,
        text: scriptText,
      });
      await finishGenerationRow(supabase, genId, { ...voiceMeta });
      await updateProject(supabase, projectId, { progress: PROGRESS.voice });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("voice", e instanceof Error ? e.message : String(e), e);
    }

    // 6 — Captions
    genId = await startGenerationRow(supabase, projectId, "captions");
    let captions: CaptionTrack;
    try {
      captions = await generateCaptions(scriptText, scenes);
      await finishGenerationRow(supabase, genId, { captions });
      await updateProject(supabase, projectId, { progress: PROGRESS.captions });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("captions", e instanceof Error ? e.message : String(e), e);
    }

    // 7 — Render preparation (manifest)
    genId = await startGenerationRow(supabase, projectId, "render_prep");
    try {
      if (!voiceMeta) {
        throw new Error("Voice metadata missing after voice step");
      }

      manifest = buildRenderPrepManifest({
        projectId,
        hook: hookText,
        script: scriptText,
        scenes,
        imagePrompts,
        imageAssets,
        voice: voiceMeta,
        captions,
      });

      await finishGenerationRow(supabase, genId, { manifest });
      await updateProject(supabase, projectId, { progress: PROGRESS.renderPrep, status: "generating" });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("render_prep", e instanceof Error ? e.message : String(e), e);
    }

    // 8 — FFmpeg encode + upload + project.video_url
    if (!manifest) {
      throw new PipelineStepError("render", "Manifest missing after render_prep");
    }
    genId = await startGenerationRow(supabase, projectId, "render");
    try {
      const { signedUrl, storagePath } = await renderVideoFromManifest({
        manifest,
        supabase,
        userId,
      });
      await finishGenerationRow(supabase, genId, {
        signedUrl,
        storagePath,
        bucket: "videos",
      });
      await updateProject(supabase, projectId, {
        progress: PROGRESS.render,
        status: "ready",
        video_url: signedUrl,
      });
    } catch (e) {
      await failGenerationRow(supabase, genId, e);
      throw new PipelineStepError("render", e instanceof Error ? e.message : String(e), e);
    }
  } catch (e) {
    const stepProgress: Record<string, number> = {
      hook: PROGRESS.hook,
      script: PROGRESS.script,
      scenes: PROGRESS.scenes,
      image_prompts: PROGRESS.imagePrompts,
      voice: PROGRESS.voice,
      captions: PROGRESS.captions,
      render_prep: PROGRESS.renderPrep,
      render: PROGRESS.render,
    };
    const progress =
      e instanceof PipelineStepError && stepProgress[e.step] !== undefined ? stepProgress[e.step]! : 0;

    const { error: failUpdErr } = await supabase
      .from("projects")
      .update({ status: "failed", progress })
      .eq("id", projectId);
    if (failUpdErr) {
      console.error("[generateVideoPipeline] failed to mark project failed:", failUpdErr.message);
    }
    throw e;
  }
}
