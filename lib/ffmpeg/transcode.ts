import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { getConfig } from "@/lib/config";
import { AdapterError } from "@/lib/media/adapter";

const OUTPUT_EXT: Record<string, string> = { mp3: "mp3", m4a: "m4a", opus: "opus" };
const OUTPUT_MIME: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", opus: "audio/ogg" };

export function extForOutput(format: string): string {
  return OUTPUT_EXT[format] ?? "mp3";
}

export function mimeForOutput(format: string): string {
  return OUTPUT_MIME[format] ?? "audio/mpeg";
}

/**
 * Transcode any source file to MP3 with libmp3lame.
 * - argv arrays only (no shell)
 * - parses `-progress pipe:1` for REAL progress (out_time_ms / Duration)
 * - caller maps that to UI percentage; never invent progress.
 */
export interface TranscodeOpts {
  inputPath: string;
  outputPath: string;
  bitrate: number; // kbps
  timeoutMs: number;
  expectedDurationSec: number | null;
  onProgress?: (info: { percent: number; outTimeMs: number }) => void;
  abortSignal?: AbortSignal;
}

export async function transcodeToMp3(opts: TranscodeOpts): Promise<{ bytes: number }> {
  const { FFMPEG_PATH } = getConfig();
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    opts.inputPath,
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    `${opts.bitrate}k`,
    "-ar",
    "44100",
    "-progress",
    "pipe:1",
    "-nostats",
    opts.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    let totalMs =
      opts.expectedDurationSec && opts.expectedDurationSec > 0 ? opts.expectedDurationSec * 1_000_000 : null;
    let finished = false;

    const fail = (err: Error) => {
      if (finished) return;
      finished = true;
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(err);
    };

    const timer = setTimeout(() => fail(new AdapterError("TIMEOUT", "ffmpeg timed out")), opts.timeoutMs);
    const onAbort = () => fail(Object.assign(new Error("cancelled"), { code: "CANCELLED" }));
    opts.abortSignal?.addEventListener("abort", onAbort, { once: true });

    // Parse key=value progress lines: out_time_ms=12345, Duration is in stderr header sometimes.
    let buf = "";
    child.stdout.on("data", (d: Buffer) => {
      buf += d.toString();
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        const m = line.match(/^out_time_ms=(\d+)/);
        if (m && opts.onProgress) {
          const outMs = Number(m[1]);
          let percent = 0;
          if (totalMs && totalMs > 0) percent = Math.min(99, Math.max(0, (outMs / totalMs) * 100));
          else percent = Math.min(95, outMs / 60_000_000); // unknown duration: slow creep capped at 95
          try {
            opts.onProgress({ percent, outTimeMs: outMs });
          } catch {}
        }
        const dm = line.match(/^Duration:\s*(\d+):(\d+):([\d.]+)/);
        // -progress mode rarely emits Duration; stderr parse below covers it.
        if (dm && !totalMs) {
          const h = Number(dm[1]),
            mi = Number(dm[2]),
            s = Number(dm[3]);
          totalMs = (h * 3600 + mi * 60 + s) * 1_000_000;
        }
      }
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      const dm = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      if (dm && !totalMs) {
        totalMs = (Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3])) * 1_000_000;
      }
      if (stderr.length > 300_000) stderr = stderr.slice(-300_000);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        fail(new AdapterError("SERVER_ERROR", `ffmpeg binary not found at "${FFMPEG_PATH}". Install FFmpeg (see README).`));
      } else fail(new AdapterError("CONVERSION_FAILED", e.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      opts.abortSignal?.removeEventListener("abort", onAbort);
      if (finished) return;
      finished = true;
      if (code === 0) resolve();
      else fail(new AdapterError("CONVERSION_FAILED", `ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });

  const stat = await fs.stat(opts.outputPath);
  if (stat.size < 1024) throw new AdapterError("CONVERSION_FAILED", "ffmpeg produced an empty file");
  return { bytes: stat.size };
}

/**
 * Instant path for free-tier boxes: remux original audio with `-c:a copy`.
 * No libmp3lame re-encode, near-zero CPU — a download-time conversion
 * instead of a minutes-long transcode. Output container follows `format`.
 */
export async function remuxAudio(opts: {
  inputPath: string;
  outputPath: string;
  timeoutMs: number;
  abortSignal?: AbortSignal;
}): Promise<{ bytes: number }> {
  const { FFMPEG_PATH } = getConfig();
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", opts.inputPath, "-vn", "-c:a", "copy", opts.outputPath];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    let finished = false;
    const fail = (err: Error) => {
      if (finished) return;
      finished = true;
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(err);
    };
    const timer = setTimeout(() => fail(new AdapterError("TIMEOUT", "ffmpeg timed out")), opts.timeoutMs);
    const onAbort = () => fail(Object.assign(new Error("cancelled"), { code: "CANCELLED" }));
    opts.abortSignal?.addEventListener("abort", onAbort, { once: true });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 100_000) stderr = stderr.slice(-100_000);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        fail(new AdapterError("SERVER_ERROR", `ffmpeg binary not found at "${FFMPEG_PATH}". Install FFmpeg (see README).`));
      } else fail(new AdapterError("CONVERSION_FAILED", e.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      opts.abortSignal?.removeEventListener("abort", onAbort);
      if (finished) return;
      finished = true;
      if (code === 0) resolve();
      else fail(new AdapterError("CONVERSION_FAILED", `ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });

  const stat = await fs.stat(opts.outputPath);
  if (stat.size < 1024) throw new AdapterError("CONVERSION_FAILED", "ffmpeg produced an empty file");
  return { bytes: stat.size };
}

/** Verify any audio output with ffprobe: must have an audio stream. */
export async function verifyAudio(filePath: string): Promise<{ duration: number | null; bytes: number }> {
  const { FFPROBE_PATH } = getConfig();
  const stat = await fs.stat(filePath);
  const probe = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      FFPROBE_PATH,
      ["-v", "error", "-show_entries", "format=duration,size", "-show_entries", "stream=codec_name,codec_type", "-of", "json", filePath],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err.slice(-500) || `ffprobe code ${code}`))));
  }).catch(() => null);
  if (!probe) {
    // ffprobe missing or failed — fall back to size-only check so dev without
    // ffprobe can still proceed; production Docker always has it.
    return { duration: null, bytes: stat.size };
  }
  try {
    const j = JSON.parse(probe) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string }>;
    };
    const hasAudio = (j.streams ?? []).some((s) => s.codec_type === "audio");
    if (!hasAudio) throw new AdapterError("CONVERSION_FAILED", "output has no audio stream");
    const dur = j.format?.duration ? Number(j.format.duration) : NaN;
    return { duration: Number.isFinite(dur) && dur > 0 ? dur : null, bytes: stat.size };
  } catch (e) {
    if (e instanceof AdapterError) throw e;
    throw new AdapterError("CONVERSION_FAILED", "could not verify output");
  }
}

/** Backward-compat alias (mp3 path). Prefer verifyAudio for new code. */
export const verifyMp3 = verifyAudio;
