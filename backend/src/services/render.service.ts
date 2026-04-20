/**
 * Hermiora video render — FFmpeg slideshow + narration + burned-in captions → MP4 (9:16) → Supabase `videos` bucket.
 *
 * ## FFmpeg command examples (manual / debugging)
 *
 * **1) Probe audio duration (seconds)**
 * ```bash
 * ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 narration.mp3
 * ```
 *
 * **2) Slideshow from concat demuxer + mux with AAC audio (9:16, 1080×1920)**
 * ```bash
 * ffmpeg -y -f concat -safe 0 -i concat.txt -i narration.mp3 \
 *   -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,subtitles=captions.srt:force_style='FontSize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Alignment=2'" \
 *   -c:v libx264 -preset medium -crf 20 -r 30 \
 *   -c:a aac -b:a 192k -movflags +faststart \
 *   -shortest output.mp4
 * ```
 *
 * **3) Single image for whole duration (no concat file)**
 * ```bash
 * ffmpeg -y -loop 1 -i frame.png -i narration.mp3 -t 45 \
 *   -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p" \
 *   -c:v libx264 -preset medium -crf 20 -r 30 -c:a aac -shortest out.mp4
 * ```
 *
 * Requires `ffmpeg` and `ffprobe` on PATH, or set `FFMPEG_PATH` / `FFPROBE_PATH`.
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaptionCue,
  CaptionTrack,
  ImagePromptPlan,
  RenderPrepManifest,
  SceneBreakdown,
} from "../pipeline/types.js";
import type { SceneImageResult } from "./image.service.js";
import type { VoiceSynthesisResult } from "./tts.service.js";

export function buildRenderPrepManifest(params: {
  projectId: string;
  hook: string;
  script: string;
  scenes: SceneBreakdown;
  imagePrompts: ImagePromptPlan;
  imageAssets: SceneImageResult[];
  voice: VoiceSynthesisResult;
  captions: CaptionTrack;
}): RenderPrepManifest {
  return {
    version: 1,
    projectId: params.projectId,
    hook: params.hook,
    script: params.script,
    scenes: params.scenes,
    imagePrompts: params.imagePrompts,
    imageAssets: params.imageAssets.map((a) => ({
      sceneId: a.sceneId,
      storagePath: a.storagePath,
      bucket: a.bucket,
    })),
    voice: {
      storagePath: params.voice.storagePath,
      bucket: params.voice.bucket,
      format: params.voice.format,
    },
    captions: params.captions,
    createdAt: new Date().toISOString(),
  };
}

const OUT_W = 1080;
const OUT_H = 1920;
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 30; // 30 days — client should re-sign from `storagePath` in generation output if needed

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH?.trim() || "ffprobe";
}

async function runProcess(cmd: string, args: string[], cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-6000)}`));
    });
  });
}

async function ffprobeDurationSeconds(audioFile: string): Promise<number> {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioFile,
  ];
  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn(ffprobeBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`ffprobe failed: ${stderr}`));
    });
  });
  const n = parseFloat(out);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid audio duration from ffprobe: "${out}"`);
  }
  return n;
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(whole, 2)},${pad(ms, 3)}`;
}

function cuesToSrt(cues: CaptionCue[]): string {
  const lines: string[] = [];
  cues.forEach((c, i) => {
    const text = c.text.replace(/\r?\n/g, " ").trim();
    if (!text) return;
    lines.push(String(i + 1));
    lines.push(`${formatSrtTime(c.startSec)} --> ${formatSrtTime(c.endSec)}`);
    lines.push(text);
    lines.push("");
  });
  return lines.join("\n");
}

/** Minimal WEBVTT → SRT fallback when cues are missing */
function vttToSrtLoose(vtt: string): string {
  const cues: CaptionCue[] = [];
  const blockRe = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})[^\n]*\n([\s\S]*?)(?=\n\n|\nWEBVTT|$)/gi;
  let m: RegExpExecArray | null;
  const vttTimeToSec = (t: string): number => {
    const [hms, frac] = t.trim().split(".");
    const parts = hms.split(":").map(Number);
    if (parts.length !== 3) return 0;
    const [h, mi, s] = parts;
    return h * 3600 + mi * 60 + s + (parseInt(frac ?? "0", 10) || 0) / 1000;
  };
  while ((m = blockRe.exec(vtt)) !== null) {
    const startSec = vttTimeToSec(m[1]);
    const endSec = vttTimeToSec(m[2]);
    const text = m[3].trim();
    if (endSec > startSec && text) cues.push({ startSec, endSec, text });
  }
  if (cues.length === 0) {
    return "1\n00:00:00,000 --> 00:00:05,000\n(captions unavailable)\n";
  }
  return cuesToSrt(cues);
}

function captionsToSrt(captions: CaptionTrack): string {
  if (captions.cues && captions.cues.length > 0) {
    return cuesToSrt(captions.cues);
  }
  return vttToSrtLoose(captions.vtt);
}

function computeImageDurations(
  assets: { sceneId: number }[],
  scenes: SceneBreakdown["scenes"],
  audioDurationSec: number,
): number[] {
  if (assets.length === 0) return [];
  const weights = assets.map((a) => {
    const s = scenes.find((sc) => sc.id === a.sceneId);
    const w = s?.estimatedSeconds != null && s.estimatedSeconds > 0 ? s.estimatedSeconds : 4;
    return w;
  });
  const sum = weights.reduce((x, y) => x + y, 0) || 1;
  return weights.map((w) => (w / sum) * audioDurationSec);
}

async function downloadStorageFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  destFsPath: string,
): Promise<void> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed (${bucket}/${path}): ${error?.message ?? "no data"}`);
  }
  const buf = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(destFsPath, buf);
}

async function writeConcatFile(imagePaths: string[], durationsSec: number[], concatPath: string): Promise<void> {
  if (imagePaths.length !== durationsSec.length) {
    throw new Error("concat: imagePaths and durations length mismatch");
  }
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < imagePaths.length; i++) {
    const p = imagePaths[i].replace(/\\/g, "/");
    lines.push(`file '${p.replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${durationsSec[i].toFixed(4)}`);
  }
  const last = imagePaths[imagePaths.length - 1].replace(/\\/g, "/");
  lines.push(`file '${last.replace(/'/g, "'\\''")}'`);
  await fs.writeFile(concatPath, lines.join("\n"), "utf8");
}

/**
 * Downloads assets from Supabase, runs FFmpeg, uploads `final.mp4` to the `videos` bucket.
 * Returns a time-limited signed URL (private bucket) and the storage path for re-signing.
 */
export async function renderVideoFromManifest(params: {
  manifest: RenderPrepManifest;
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ signedUrl: string; storagePath: string }> {
  const { manifest, supabase, userId } = params;
  const { projectId, imageAssets, voice, captions, scenes } = manifest;

  const sorted = [...imageAssets].sort((a, b) => a.sceneId - b.sceneId);
  if (sorted.length === 0) {
    throw new Error("render: no image assets to stitch");
  }

  const workDir = await fs.mkdtemp(join(tmpdir(), "hermiora-render-"));
  const audioPath = join(workDir, "narration.mp3");
  const srtPath = join(workDir, "captions.srt");
  const concatPath = join(workDir, "concat.txt");
  const outPath = join(workDir, "output.mp4");

  try {
    await downloadStorageFile(supabase, voice.bucket, voice.storagePath, audioPath);
    const audioDuration = await ffprobeDurationSeconds(audioPath);

    await fs.writeFile(srtPath, captionsToSrt(captions), "utf8");

    const imagePaths: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const ext = a.storagePath.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const local = join(workDir, `img_${i}.${ext}`);
      await downloadStorageFile(supabase, a.bucket, a.storagePath, local);
      imagePaths.push(local);
    }

    const durations = computeImageDurations(sorted, scenes.scenes, audioDuration);
    await writeConcatFile(imagePaths, durations, concatPath);

    const vf = [
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease`,
      `pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2`,
      "setsar=1",
      "format=yuv420p",
      `subtitles=captions.srt:force_style='FontSize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Alignment=2'`,
    ].join(",");

    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-i",
      "narration.mp3",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      process.env.FFMPEG_PRESET?.trim() || "medium",
      "-crf",
      process.env.FFMPEG_CRF?.trim() || "20",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-shortest",
      "output.mp4",
    ];

    await runProcess(ffmpegBin(), args, workDir);

    const stat = await fs.stat(outPath);
    if (!stat.isFile() || stat.size < 1024) {
      throw new Error("render: output.mp4 missing or too small");
    }

    const storagePath = `${userId}/${projectId}/final.mp4`;
    const fileBuf = await fs.readFile(outPath);
    const { error: upErr } = await supabase.storage.from("videos").upload(storagePath, fileBuf, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (upErr) {
      throw new Error(`Video upload failed: ${upErr.message}`);
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("videos")
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
    if (signErr || !signed?.signedUrl) {
      throw new Error(`createSignedUrl failed: ${signErr?.message ?? "no url"}`);
    }

    return { signedUrl: signed.signedUrl, storagePath };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
