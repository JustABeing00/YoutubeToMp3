import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { AdapterError, type DownloadResult, type MediaMetadata, type MediaSourceAdapter } from "./adapter";

export { AdapterError };
export type { DownloadResult, MediaMetadata, MediaSourceAdapter };
import { getConfig } from "@/lib/config";

/**
 * YouTube adapter backed by yt-dlp. All invocations use spawn() with an
 * argument ARRAY — user input is always a single argv element, never
 * interpolated into a shell string (command-injection safe).
 *
 * VPS note: YouTube serves metadata from one endpoint but the actual media
 * bytes from googlevideo.com, which 403-blocks many datacenter IPs when the
 * default web/visionos player client is used. Forcing the android client +
 * IPv4 bypasses most of those blocks without cookies. Deno/Node give yt-dlp
 * the JS runtime it needs for signature challenges.
 *
 * Only use with content you own or have permission to download.
 */

// Shared flags for every yt-dlp call. Kept as argv elements (never a shell
// string) so URLs can't inject commands.
const YT_BASE_ARGS = [
  "--force-ipv4",
  "--no-playlist",
  "--no-warnings",
  "--extractor-args",
  "youtube:player_client=android",
  "--js-runtimes",
  "node,deno",
  "--retries",
  "3",
  "--fragment-retries",
  "3",
  "--retry-sleep",
  "1",
];

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new AdapterError("TIMEOUT", "media tool timed out"));
    }, timeoutMs);
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
      if (stdout.length > 2_000_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 500_000) stderr = stderr.slice(-500_000);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        reject(
          new AdapterError(
            "SERVER_ERROR",
            `yt-dlp binary not found at "${cmd}". Install it or set YTDLP_PATH (see README).`
          )
        );
      } else reject(new AdapterError("RETRIEVAL_FAILED", `media tool failed: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else {
        const msg = stderr.slice(-2000).toLowerCase();
        if (/private|login|sign in|cookies|age/.test(msg)) {
          reject(new AdapterError("AUTH_REQUIRED", "This video requires sign-in or is private."));
        } else if (/unavailable|not found|removed|404/.test(msg)) {
          reject(new AdapterError("SOURCE_UNAVAILABLE", "The video is unavailable."));
        } else {
          reject(new AdapterError("RETRIEVAL_FAILED", `yt-dlp exited with code ${code}`));
        }
      }
    });
  });
}

interface YtDlpJson {
  title?: string;
  duration?: number;
  thumbnail?: string;
  channel?: string;
  uploader?: string;
  is_live?: boolean;
  availability?: string;
}

export class YoutubeAdapter implements MediaSourceAdapter {
  readonly name = "youtube";

  async validateUrl(_url: string) {
    return { supported: true };
  }

  async getMetadata(url: string): Promise<MediaMetadata> {
    const { YTDLP_PATH } = getConfig();
    const { stdout } = await run(
      YTDLP_PATH,
      [...YT_BASE_ARGS, "--skip-download", "--dump-single-json", "--", url],
      45_000
    );
    let data: YtDlpJson;
    try {
      data = JSON.parse(stdout) as YtDlpJson;
    } catch {
      throw new AdapterError("METADATA_UNAVAILABLE", "Could not parse video information.");
    }
    if (data.availability === "private" || data.availability === "needs_auth") {
      throw new AdapterError("AUTH_REQUIRED", "This video is private or requires sign-in.");
    }
    const duration =
      typeof data.duration === "number" && Number.isFinite(data.duration) && data.duration >= 0
        ? Math.floor(data.duration)
        : null;
    return {
      title: typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 300) : "Untitled video",
      duration,
      thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : null,
      source: "YouTube",
      author: data.channel ?? data.uploader ?? null,
      available: true,
    };
  }

  async downloadSource(
    url: string,
    outputPath: string,
    opts: { timeoutMs: number; maxBytes: number; onProgress?: (p: number) => void }
  ): Promise<DownloadResult> {
    const { YTDLP_PATH } = getConfig();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    // Download best audio ≤ ~320k. yt-dlp merges/selects; extension varies.
    const template = `${outputPath}.%(ext)s`;
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        YTDLP_PATH,
        [
          ...YT_BASE_ARGS,
          "-f",
          "bestaudio/best",
          "--no-part",
          "-o",
          template,
          "--",
          url,
        ],
        { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
      );
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new AdapterError("TIMEOUT", "download timed out"));
      }, opts.timeoutMs);
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
        const m = stderr.match(/(\d{1,3}\.\d)%/);
        if (m && opts.onProgress) {
          const pct = Math.min(99, Math.max(0, parseFloat(m[1])));
          try {
            opts.onProgress(pct);
          } catch {}
        }
        if (stderr.length > 500_000) stderr = stderr.slice(-500_000);
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        const e = err as NodeJS.ErrnoException;
        if (e.code === "ENOENT") {
          reject(new AdapterError("SERVER_ERROR", `yt-dlp binary not found at "${YTDLP_PATH}".`));
        } else reject(new AdapterError("RETRIEVAL_FAILED", e.message));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else {
          const msg = stderr.slice(-2000).toLowerCase();
          if (/private|login|sign in|cookies/.test(msg)) reject(new AdapterError("AUTH_REQUIRED", "Auth required."));
          else if (/unavailable|not found|removed/.test(msg))
            reject(new AdapterError("SOURCE_UNAVAILABLE", "Source unavailable."));
          else reject(new AdapterError("RETRIEVAL_FAILED", `download failed (code ${code})`));
        }
      });
    });

    // yt-dlp appends the real extension; find the produced file.
    const dir = path.dirname(outputPath);
    const base = path.basename(outputPath);
    const entries = await fs.readdir(dir);
    const match = entries.find((e) => e.startsWith(`${base}.`));
    if (!match) throw new AdapterError("RETRIEVAL_FAILED", "downloader produced no file");
    const filePath = path.join(dir, match);
    const stat = await fs.stat(filePath);
    if (stat.size === 0) throw new AdapterError("RETRIEVAL_FAILED", "empty download");
    if (stat.size > opts.maxBytes) {
      await fs.rm(filePath, { force: true });
      throw new AdapterError("OUTPUT_TOO_LARGE", "source exceeds size limit");
    }
    return { filePath, bytes: stat.size, ext: path.extname(match).slice(1), duration: null };
  }
}

export class DirectFileAdapter implements MediaSourceAdapter {
  readonly name = "direct";

  async validateUrl(_url: string) {
    return { supported: true };
  }

  async getMetadata(url: string): Promise<MediaMetadata> {
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "audio file");
    return { title: name.slice(0, 300) || "audio file", duration: null, thumbnail: null, source: "Direct", author: null, available: true };
  }

  async downloadSource(
    url: string,
    outputPath: string,
    opts: { timeoutMs: number; maxBytes: number; onProgress?: (p: number) => void }
  ): Promise<DownloadResult> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
      if (!res.ok || !res.body) throw new AdapterError("SOURCE_UNAVAILABLE", `HTTP ${res.status}`);
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > opts.maxBytes) throw new AdapterError("OUTPUT_TOO_LARGE", "file too large");
      const ctype = res.headers.get("content-type") ?? "";
      if (ctype && !/audio|video|octet-stream|mpeg|mp4|webm|ogg|wav/i.test(ctype)) {
        throw new AdapterError("UNSUPPORTED_SOURCE", `unsupported content-type ${ctype}`);
      }
      const { createWriteStream } = await import("node:fs");
      let bytes = 0;
      await new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(outputPath);
        const reader = res.body!.getReader();
        const pump = async () => {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              bytes += value.byteLength;
              if (bytes > opts.maxBytes) {
                ws.destroy();
                reject(new AdapterError("OUTPUT_TOO_LARGE", "file too large"));
                return;
              }
              if (!ws.write(value)) await new Promise<void>((done) => ws.once("drain", () => done()));
            }
            ws.end(resolve);
          } catch (e) {
            ws.destroy();
            reject(e);
          }
        };
        pump();
        ws.on("error", reject);
      });
      const stat = await fs.stat(outputPath);
      return { filePath: outputPath, bytes: stat.size, ext: path.extname(new URL(url).pathname).slice(1) || "bin", duration: null };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Pick adapter from an already-validated normalized URL hostname. */
export function pickAdapter(normalizedUrl: string): MediaSourceAdapter {
  const host = new URL(normalizedUrl).hostname.toLowerCase();
  if (host.includes("youtube") || host.includes("youtu.be")) return new YoutubeAdapter();
  return new DirectFileAdapter();
}
