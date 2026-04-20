import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAI } from "../openai.client.js";

const TTS_CHAR_LIMIT = 4000;

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type OpenAiTtsVoice = (typeof VOICES)[number];

function resolveTtsVoice(raw: string | undefined): OpenAiTtsVoice {
  const v = raw?.trim().toLowerCase();
  if (v && (VOICES as readonly string[]).includes(v)) {
    return v as OpenAiTtsVoice;
  }
  return "nova";
}

export type VoiceSynthesisResult = {
  bucket: string;
  storagePath: string;
  format: "mp3";
  truncated?: boolean;
};

/**
 * Synthesizes narration with OpenAI TTS and uploads to the private `audio` bucket.
 * Path: `{userId}/{projectId}/narration.mp3`
 */
export async function synthesizeSpeechToStorage(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  text: string;
}): Promise<VoiceSynthesisResult> {
  const { supabase, userId, projectId, text } = params;
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("TTS input text is empty");
  }

  const truncated = trimmed.length > TTS_CHAR_LIMIT;
  const input = truncated ? trimmed.slice(0, TTS_CHAR_LIMIT) : trimmed;

  const openai = getOpenAI();
  const response = await openai.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL?.trim() || "tts-1",
    voice: resolveTtsVoice(process.env.OPENAI_TTS_VOICE),
    input,
    response_format: "mp3",
  });

  const buf = Buffer.from(await response.arrayBuffer());
  const bucket = "audio";
  const storagePath = `${userId}/${projectId}/narration.mp3`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, buf, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (upErr) {
    throw new Error(`TTS upload failed: ${upErr.message}`);
  }

  return { bucket, storagePath, format: "mp3", truncated };
}
