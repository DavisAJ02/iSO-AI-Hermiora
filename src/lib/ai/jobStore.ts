import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiJobRequest, AiJobResult, AiJobStatus, AiProviderName } from "@/lib/ai/jobTypes";

/**
 * Thin persistence helpers around the ai_jobs table so routing code stays
 * focused on provider logic instead of raw SQL updates.
 */

export async function createAiJob(
  admin: SupabaseClient,
  request: AiJobRequest,
) {
  const { data, error } = await admin
    .from("ai_jobs")
    .insert({
      user_id: request.userId,
      job_type: request.jobType,
      prompt: request.prompt,
      provider_used: null,
      status: "pending",
      output_url: null,
      output_text: null,
      error_message: null,
      cost_estimate: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create AI job record.");
  }

  return data.id as string;
}

export async function updateAiJobStatus(
  admin: SupabaseClient,
  jobId: string,
  patch: {
    providerUsed?: AiProviderName | null;
    status?: AiJobStatus;
    outputUrl?: string | null;
    outputText?: string | null;
    errorMessage?: string | null;
    costEstimate?: number | null;
  },
) {
  const updatePayload = {
    ...(patch.providerUsed !== undefined ? { provider_used: patch.providerUsed } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.outputUrl !== undefined ? { output_url: patch.outputUrl } : {}),
    ...(patch.outputText !== undefined ? { output_text: patch.outputText } : {}),
    ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
    ...(patch.costEstimate !== undefined ? { cost_estimate: patch.costEstimate } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("ai_jobs")
    .update(updatePayload)
    .eq("id", jobId);

  if (error) throw error;
}

export async function markAiJobSuccess(
  admin: SupabaseClient,
  jobId: string,
  result: AiJobResult,
) {
  await updateAiJobStatus(admin, jobId, {
    providerUsed: result.providerUsed,
    status: "done",
    outputUrl: result.outputUrl,
    outputText:
      result.outputText ??
      (result.outputJson ? JSON.stringify(result.outputJson).slice(0, 20_000) : null),
    errorMessage: null,
    costEstimate: result.costEstimate ?? null,
  });
}
