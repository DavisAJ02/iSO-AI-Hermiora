import type { SupabaseClient } from "@supabase/supabase-js";

type ScriptOutput = {
  voiceover?: string;
  beats?: string[];
};

type VoiceOutput = {
  voice_style?: string;
  direction?: string;
};

type ElevenLabsVoice = {
  voice_id: string;
  name?: string | null;
  category?: string | null;
  available_for_tiers?: string[] | null;
  labels?: Record<string, string> | null;
  sharing?: {
    category?: string | null;
    free_users_allowed?: boolean | null;
  } | null;
};

type GenerationRow = {
  step: string | null;
  output?: unknown;
};

type ProjectVoiceRow = {
  id: string;
  title?: string | null;
  idea?: string | null;
  generations?: GenerationRow[] | null;
};

function getGenerationOutput<T>(rows: GenerationRow[] | null | undefined, step: string): T | null {
  const match = (rows ?? []).find((row) => row.step === step);
  return (match?.output as T | null) ?? null;
}

function extractScriptText(project: ProjectVoiceRow) {
  const script = getGenerationOutput<ScriptOutput>(project.generations, "script");
  if (typeof script?.voiceover === "string" && script.voiceover.trim()) {
    return script.voiceover.trim();
  }
  if (Array.isArray(script?.beats) && script.beats.length > 0) {
    return script.beats.join(" ");
  }
  return (project.idea?.trim() || project.title?.trim() || "").trim();
}

function normalizeElevenLabsError(status: number, bodyText: string) {
  const compact = bodyText.replace(/\s+/g, " ").trim();
  if (
    status === 402 &&
    /paid_plan_required|library voices|free users cannot use library voices/i.test(compact)
  ) {
    return "ElevenLabs rejected the selected voice because Voice Library voices require a paid plan. Use an owned/default voice ID or upgrade the ElevenLabs plan.";
  }
  if (status === 401) {
    return "ElevenLabs rejected the API key. Verify ELEVENLABS_API_KEY in the deployed environment.";
  }
  if (status === 404) {
    return "ElevenLabs could not find the configured voice. Verify ELEVENLABS_VOICE_ID.";
  }
  return `ElevenLabs voice generation failed (${status}): ${compact.slice(0, 240)}`;
}

async function synthesizeWithVoice(apiKey: string, voiceId: string, modelId: string, text: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const textBody = await response.text().catch(() => "");
    const error = new Error(normalizeElevenLabsError(response.status, textBody)) as Error & {
      status?: number;
      bodyText?: string;
    };
    error.status = response.status;
    error.bodyText = textBody;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function listVoices(apiKey: string) {
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const textBody = await response.text().catch(() => "");
    throw new Error(normalizeElevenLabsError(response.status, textBody));
  }

  const data = (await response.json()) as { voices?: ElevenLabsVoice[] | null };
  return data.voices ?? [];
}

function isFreeTierVoice(voice: ElevenLabsVoice) {
  const tiers = (voice.available_for_tiers ?? [])
    .map((tier) => tier.trim().toLowerCase())
    .filter(Boolean);

  if (tiers.includes("free")) return true;
  if (tiers.length > 0) return false;

  const category = `${voice.category ?? voice.sharing?.category ?? ""}`.trim().toLowerCase();
  return ["default", "premade", "generated", "cloned", "voice design", "voice_design"].includes(
    category,
  );
}

function selectFallbackVoice(voices: ElevenLabsVoice[], blockedVoiceId: string) {
  const candidates = voices.filter((voice) => voice.voice_id && voice.voice_id !== blockedVoiceId);
  const freeTierVoices = candidates.filter(isFreeTierVoice);

  return (
    freeTierVoices.find((voice) => {
      const useCase = voice.labels?.use_case?.toLowerCase() ?? "";
      return useCase.includes("social") || useCase.includes("narration");
    }) ??
    freeTierVoices[0] ??
    null
  );
}

export async function generateElevenLabsAudio(project: ProjectVoiceRow) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID is not configured.");

  const text = extractScriptText(project);
  if (!text) throw new Error("No script text is available for voice generation.");

  const savedVoice = getGenerationOutput<VoiceOutput>(project.generations, "voice");
  let finalVoiceId = voiceId;
  let fallbackVoice: ElevenLabsVoice | null = null;
  let audioBuffer: Buffer;

  try {
    audioBuffer = await synthesizeWithVoice(apiKey, voiceId, modelId, text);
  } catch (error) {
    const status = typeof error === "object" && error ? (error as { status?: number }).status : undefined;
    const bodyText =
      typeof error === "object" && error ? (error as { bodyText?: string }).bodyText ?? "" : "";
    const isLibraryPlanError =
      status === 402 &&
      /paid_plan_required|library voices|free users cannot use library voices/i.test(bodyText);

    if (!isLibraryPlanError) {
      throw error;
    }

    const voices = await listVoices(apiKey);
    fallbackVoice = selectFallbackVoice(voices, voiceId);
    if (!fallbackVoice) {
      throw new Error(
        "ElevenLabs rejected the configured voice and no free-tier/default fallback voice was found. Add a Default voice to My Voices or set ELEVENLABS_VOICE_ID to a free-usable voice.",
      );
    }

    finalVoiceId = fallbackVoice.voice_id;
    audioBuffer = await synthesizeWithVoice(apiKey, finalVoiceId, modelId, text);
  }

  return {
    provider: "elevenlabs",
    voice_id: finalVoiceId,
    model_id: modelId,
    mime_type: "audio/mpeg",
    audio_base64: audioBuffer.toString("base64"),
    voice_style: typeof savedVoice?.voice_style === "string" ? savedVoice.voice_style : "Narration",
    direction: typeof savedVoice?.direction === "string" ? savedVoice.direction : "Short-form social voiceover",
    characters: text.length,
    fallback_from_voice_id: finalVoiceId !== voiceId ? voiceId : undefined,
    fallback_voice_name: fallbackVoice?.name ?? undefined,
    fallback_voice_category: fallbackVoice?.category ?? fallbackVoice?.sharing?.category ?? undefined,
  };
}

export async function saveProjectVoice(
  admin: SupabaseClient,
  project: ProjectVoiceRow,
) {
  const voiceOutput = await generateElevenLabsAudio(project);
  const timestamp = new Date().toISOString();

  const { error } = await admin
    .from("generations")
    .update({
      status: "done",
      output: voiceOutput,
      updated_at: timestamp,
    })
    .eq("project_id", project.id)
    .eq("step", "voice");

  if (error) throw error;

  return voiceOutput;
}
