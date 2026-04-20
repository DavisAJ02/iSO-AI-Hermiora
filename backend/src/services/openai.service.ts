import { defaultChatModel, getOpenAI } from "../openai.client.js";
import type { CaptionCue, CaptionTrack, ImagePromptPlan, SceneBreakdown } from "../pipeline/types.js";

function safeJsonParse<T>(raw: string): T {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(slice) as T;
}

async function chatJson<T>(system: string, user: string): Promise<T> {
  const openai = getOpenAI();
  const model = defaultChatModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty content");
  return safeJsonParse<T>(text);
}

async function chatText(system: string, user: string, temperature = 0.75): Promise<string> {
  const openai = getOpenAI();
  const model = defaultChatModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content");
  return text;
}

export async function generateHook(idea: string): Promise<string> {
  return chatText(
    "You write viral short-form video hooks: one punchy opening line (max 220 characters). No hashtags, no stage directions.",
    `Video idea:\n${idea.trim()}`,
    0.85,
  );
}

export async function generateScript(idea: string, hook: string): Promise<string> {
  return chatText(
    "You write concise voiceover scripts for 60–120 second vertical videos. Output plain script text only: short paragraphs or line breaks where a pause fits. No markdown, no character names in brackets.",
    `Idea:\n${idea.trim()}\n\nHook (first line should align with this energy):\n${hook.trim()}`,
    0.7,
  );
}

function validateSceneBreakdown(data: unknown): SceneBreakdown {
  if (!data || typeof data !== "object") throw new Error("Invalid scene JSON: not an object");
  const scenes = (data as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Invalid scene JSON: scenes must be a non-empty array");
  }
  const normalized: SceneBreakdown = { scenes: [] };
  for (const s of scenes) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const id = Number(o.id);
    const title = String(o.title ?? "").trim();
    const narration = String(o.narration ?? "").trim();
    const visualDescription = String(o.visualDescription ?? "").trim();
    if (!title || !narration) continue;
    normalized.scenes.push({
      id: Number.isFinite(id) ? id : normalized.scenes.length + 1,
      title,
      narration,
      visualDescription: visualDescription || narration,
      estimatedSeconds:
        typeof o.estimatedSeconds === "number" && o.estimatedSeconds > 0
          ? o.estimatedSeconds
          : undefined,
    });
  }
  if (normalized.scenes.length === 0) {
    throw new Error("Invalid scene JSON: no valid scenes");
  }
  return normalized;
}

export async function generateSceneBreakdown(script: string): Promise<SceneBreakdown> {
  const system = `You break a voiceover script into scenes for a short vertical video.
Return JSON only with this shape:
{"scenes":[{"id":1,"title":"string","narration":"string","visualDescription":"string for image generation","estimatedSeconds":8}]}
Rules:
- 4–10 scenes
- narration is the exact portion of script spoken in that scene (can paraphrase slightly for clarity)
- visualDescription is vivid, safe-for-work, suitable for image generation (no text overlays in image)`;

  const raw = await chatJson<unknown>(system, `Script:\n${script.trim()}`);
  return validateSceneBreakdown(raw);
}

function validateImagePromptPlan(data: unknown): ImagePromptPlan {
  if (!data || typeof data !== "object") throw new Error("Invalid image prompts JSON");
  const prompts = (data as { prompts?: unknown }).prompts;
  if (!Array.isArray(prompts)) throw new Error("Invalid image prompts: prompts array missing");
  const out: ImagePromptPlan = { prompts: [] };
  for (const p of prompts) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const sceneId = Number(o.sceneId);
    const prompt = String(o.prompt ?? "").trim();
    if (!prompt || !Number.isFinite(sceneId)) continue;
    out.prompts.push({ sceneId, prompt });
  }
  if (out.prompts.length === 0) throw new Error("No image prompts generated");
  return out;
}

export async function generateImagePrompts(breakdown: SceneBreakdown): Promise<ImagePromptPlan> {
  const system = `You write one DALL·E 3 style image prompt per scene for a vertical 9:16 short video.
Return JSON only: {"prompts":[{"sceneId":number,"prompt":"string"}]}
Each prompt: English, vivid, no real-person names, no logos, no on-image text, SFW, suitable for vertical framing.`;

  const user = `Scenes JSON:\n${JSON.stringify(breakdown)}`;
  const raw = await chatJson<unknown>(system, user);
  return validateImagePromptPlan(raw);
}

function scriptToVttCues(script: string): CaptionCue[] {
  const chunks = script
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  const n = Math.max(1, chunks.length);
  const total = 90;
  const per = total / n;
  return chunks.map((text, i) => ({
    startSec: Math.round(i * per * 10) / 10,
    endSec: Math.round((i + 1) * per * 10) / 10,
    text,
  }));
}

function cuesToVtt(cues: CaptionCue[]): string {
  const lines = ["WEBVTT", ""];
  cues.forEach((c, i) => {
    lines.push(String(i + 1));
    lines.push(`${formatVttTime(c.startSec)} --> ${formatVttTime(c.endSec)}`);
    lines.push(c.text.replace(/\n/g, " "));
    lines.push("");
  });
  return lines.join("\n");
}

function formatVttTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(whole, 2)}.${pad(ms, 3)}`;
}

export async function generateCaptions(script: string, breakdown: SceneBreakdown): Promise<CaptionTrack> {
  try {
    const system = `You produce timed captions for a short vertical video.
Return JSON only: {"cues":[{"startSec":number,"endSec":number,"text":"string"}]}
Rules: 0 <= startSec < endSec, cover roughly 0–90 seconds, cues non-overlapping in order, text short lines, no profanity.`;

    const user = `Script:\n${script.trim()}\n\nScene titles for timing hints:\n${breakdown.scenes.map((s) => `- ${s.title}`).join("\n")}`;
    const raw = await chatJson<{ cues?: CaptionCue[] }>(system, user);
    const cues = Array.isArray(raw.cues)
      ? raw.cues.filter(
          (c) =>
            c &&
            typeof c.startSec === "number" &&
            typeof c.endSec === "number" &&
            typeof c.text === "string" &&
            c.endSec > c.startSec,
        )
      : [];
    if (cues.length === 0) throw new Error("No cues");
    const vtt = cuesToVtt(cues);
    return { format: "vtt", vtt, cues };
  } catch {
    const cues = scriptToVttCues(script);
    return { format: "vtt", vtt: cuesToVtt(cues), cues };
  }
}
