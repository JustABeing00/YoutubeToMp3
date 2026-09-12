import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { AdapterError, type DownloadResult, type MediaMetadata, type MediaSourceAdapter } from "./adapter";

export { AdapterError };
export type { DownloadResult, MediaMetadata, MediaSourceAdapter };
import { getConfig } from "@/lib/config";
import { assertUrlSafe } from "@/lib/security/ssrf";
import { logError, logEvent } from "@/lib/logging/logger";
import { extractYoutubeId } from "@/lib/validation/url";
import { resolveFallbackAudioUrl } from "./fallback";
import { fetchOEmbed } from "./oembed";

/**
 * YouTube adapter backed by yt-dlp. All invocations use spawn() with an
 * argument ARRAY — user input is always a single argv element, never
 * interpolated into a shell string (command-injection safe).
 *
 * VPS note: YouTube serves metadata from one endpoint but the actual media
 * bytes from googlevideo.com, which 403-blocks many datacenter IPs, and the
 * android/ios player clients now return SABR-only responses with no playable
 * formats (Sept 2026). So: default player client for listing, Deno as the JS
 * runtime (single name — yt-dlp ignores comma-joined values), IPv4 only
 * (Hostinger has no IPv6 route), Chrome TLS fingerprint + self-minted
 * proof-of-origin tokens via YTDLP_EXTRA_ARGS (see Dockerfile), and a free
 * Piped/Invidious fallback (./fallback.ts) when the direct download 403s.
 *
 * Only use with content you own or have permission to download.
 */

// Shared flags for every yt-dlp call. Kept as argv elements (never a shell
// string) so URLs can't inject commands.
const YT_BASE_ARGS = [
  "--force-ipv4",
  "--no-playlist",
  "--no-warnings",
  "--js-runtimes",
  "deno",
  "--retries",
  "3",
  "--fragment-retries",
  "3",
  "--retry-sleep",
  "1",
];

/**
 * Operator-owned extra yt-dlp argv from YTDLP_EXTRA_ARGS (space-separated).
 * Never derived from user input — safe to append.
 */
function extraArgs(): string[] {
  const raw = getConfig().YTDLP_EXTRA_ARGS.trim();
  return raw ? raw.split(/\s+/) : [];
}

/** Proxy argv for all yt-dlp traffic (WARP sidecar). Empty when disabled. */
function proxyArgs(): string[] {
  const p = getConfig().YTDLP_PROXY.trim();
  return p ? ["--proxy", p] : [];
}

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
    // oEmbed first: free, unlimited, never IP-blocked. yt-dlp then fills in
    // duration/availability; if yt-dlp is throttled, oEmbed data still lets
    // Analyze succeed (duration unknown) instead of hard-failing.
    let videoId: string | null = null;
    try {
      videoId = extractYoutubeId(new URL(url));
    } catch {
      videoId = null;
    }
    const embed = videoId ? await fetchOEmbed(videoId) : null;
    let data: YtDlpJson | null = null;
    try {
      const { stdout } = await run(
        YTDLP_PATH,
        [...YT_BASE_ARGS, ...extraArgs(), ...proxyArgs(), "--skip-download", "--dump-single-json", "--", url],
        45_000
      );
      try {
        data = JSON.parse(stdout) as YtDlpJson;
      } catch {
        throw new AdapterError("METADATA_UNAVAILABLE", "Could not parse video information.");
      }
    } catch (e) {
      if (!embed) throw e;
      data = null;
    }
    if (data && (data.availability === "private" || data.availability === "needs_auth")) {
      throw new AdapterError("AUTH_REQUIRED", "This video is private or requires sign-in.");
    }
    const duration =
      data && typeof data.duration === "number" && Number.isFinite(data.duration) && data.duration >= 0
        ? Math.floor(data.duration)
        : null;
    const rawTitle =
      (data && typeof data.title === "string" && data.title.trim()) || embed?.title || "Untitled video";
    return {
      title: rawTitle.trim().slice(0, 300),
      duration,
      thumbnail:
        (data && typeof data.thumbnail === "string" ? data.thumbnail : null) ?? embed?.thumbnail ?? null,
      source: "YouTube",
      author: (data && (data.channel ?? data.uploader)) || embed?.author || null,
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
    try {
      await this.runYtDlpDownload(YTDLP_PATH, template, url, opts);
    } catch (e) {
      // Auth/size verdicts are final — a third-party resolver can't help.
      if (e instanceof AdapterError && (e.code === "AUTH_REQUIRED" || e.code === "OUTPUT_TOO_LARGE")) throw e;
      if (getConfig().FALLBACK_ENABLED !== "true") throw e;
      // Direct googlevideo download blocked (typically HTTP 403 on datacenter
      // IPs): resolve a playable stream via public backends and fetch it with
      // the hardened direct downloader (SSRF-checked, size-capped).
      logEvent("media.fallback_attempt", { adapter: "youtube" });
      try {
        const stream = await resolveFallbackAudioUrl(url);
        await assertUrlSafe(stream.url);
        const dl = await new DirectFileAdapter().downloadSource(stream.url, outputPath, opts);
        logEvent("media.fallback_used", { adapter: "youtube", via: stream.via });
        return dl;
      } catch (fb) {
        logError("media.fallback_failed", fb, { adapter: "youtube" });
        throw e; // original direct error is the actionable one
      }
    }

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

  /** Direct yt-dlp byte download. Resolves on success, throws AdapterError otherwise. */
  private runYtDlpDownload(
    ytdlpPath: string,
    template: string,
    url: string,
    opts: { timeoutMs: number; onProgress?: (p: number) => void }
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(
        ytdlpPath,
        [
          ...YT_BASE_ARGS,
          ...extraArgs(),
          ...proxyArgs(),
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
          reject(new AdapterError("SERVER_ERROR", `yt-dlp binary not found at "${ytdlpPath}".`));
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
