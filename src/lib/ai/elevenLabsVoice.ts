import type { SupabaseClient } from "@supabase/supabase-js";

type ScriptOutput = {
  voiceover?: string;
  beats?: string[];
};

type VoiceOutput = {
  voice_style?: string;
  direction?: string;
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

export async function generateElevenLabsAudio(project: ProjectVoiceRow) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID is not configured.");

  const text = extractScriptText(project);
  if (!text) throw new Error("No script text is available for voice generation.");

  const savedVoice = getGenerationOutput<VoiceOutput>(project.generations, "voice");
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
    throw new Error(normalizeElevenLabsError(response.status, textBody));
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    provider: "elevenlabs",
    voice_id: voiceId,
    model_id: modelId,
    mime_type: "audio/mpeg",
    audio_base64: audioBuffer.toString("base64"),
    voice_style: typeof savedVoice?.voice_style === "string" ? savedVoice.voice_style : "Narration",
    direction: typeof savedVoice?.direction === "string" ? savedVoice.direction : "Short-form social voiceover",
    characters: text.length,
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
