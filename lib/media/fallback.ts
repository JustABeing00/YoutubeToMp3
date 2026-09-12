import { AdapterError } from "./adapter";
import { extractYoutubeId } from "@/lib/validation/url";
import { getConfig } from "@/lib/config";

/**
 * Free fallback for YouTube audio URLs when a direct yt-dlp download from
 * this server's IP is blocked (HTTP 403 from googlevideo.com on datacenter
 * IPs, or SABR-only player responses with no playable formats).
 *
 * Public Piped / Invidious API instances run on THEIR servers, so they can
 * still resolve the video to a playable audio stream URL. Proxied URLs
 * (pipedproxy hosts) are preferred over direct googlevideo URLs, which would
 * 403 again from a flagged IP.
 *
 * Best-effort: public instances are rate-limited and come and go. The
 * instance lists are operator-overridable via env (see .env.example).
 * Instances are tried in order; per-instance timeouts keep the worst case
 * bounded well inside PROCESSING_TIMEOUT_MIN.
 *
 * Only use with content you own or have permission to download.
 */

export interface FallbackStream {
  url: string;
  title: string | null;
  duration: number | null; // seconds; null when unknown
  via: string; // resolving backend hostname (for logs only)
}

function csvList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => s.startsWith("https://"));
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isDirectGoogleHost(u: string): boolean {
  const h = hostOf(u);
  return h.endsWith("googlevideo.com") || h.endsWith("youtube.com") || h.endsWith("ggpht.com");
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { accept: "application/json", "user-agent": "videotomp3-fallback/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

interface Scored {
  url: string;
  bitrate: number;
  proxied: boolean;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Highest-bitrate candidate wins; proxied (non-googlevideo) hosts first. */
function best(cands: Scored[]): string | null {
  if (cands.length === 0) return null;
  const proxied = cands.filter((c) => c.proxied);
  const pool = proxied.length > 0 ? proxied : cands;
  pool.sort((a, b) => b.bitrate - a.bitrate);
  return pool[0].url;
}

/** Piped /streams/<id> -> { audioStreams: [{url, bitrate}] }. Pure, tested. */
export function pickPipedAudio(data: unknown): string | null {
  const d = data as { audioStreams?: Array<{ url?: unknown; bitrate?: unknown }> };
  if (!d || !Array.isArray(d.audioStreams)) return null;
  const cands: Scored[] = [];
  for (const s of d.audioStreams) {
    if (!s || typeof s.url !== "string" || !s.url.startsWith("https://")) continue;
    cands.push({ url: s.url, bitrate: num(s.bitrate), proxied: !isDirectGoogleHost(s.url) });
  }
  return best(cands);
}

/** Invidious /api/v1/videos/<id> -> { adaptiveFormats: [{url, bitrate, type}] }. Pure, tested. */
export function pickInvidiousAudio(data: unknown): string | null {
  const d = data as { adaptiveFormats?: Array<{ url?: unknown; bitrate?: unknown; type?: unknown }> };
  if (!d || !Array.isArray(d.adaptiveFormats)) return null;
  const cands: Scored[] = [];
  for (const f of d.adaptiveFormats) {
    if (!f || typeof f.url !== "string" || !f.url.startsWith("https://")) continue;
    if (typeof f.type === "string" && !f.type.startsWith("audio/")) continue;
    cands.push({ url: f.url, bitrate: num(f.bitrate), proxied: !isDirectGoogleHost(f.url) });
  }
  return best(cands);
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null;
}

function secs(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

/**
 * Resolve a normalized YouTube watch URL to a directly downloadable audio
 * stream URL via public fallback backends. Throws AdapterError on failure.
 */
export async function resolveFallbackAudioUrl(normalizedYoutubeUrl: string): Promise<FallbackStream> {
  const cfg = getConfig();
  const perApiMs = cfg.FALLBACK_API_TIMEOUT_SEC * 1000;

  let videoId: string | null = null;
  try {
    videoId = extractYoutubeId(new URL(normalizedYoutubeUrl));
  } catch {
    videoId = null;
  }
  if (!videoId) throw new AdapterError("INVALID_URL", "Could not determine video id.");

  for (const base of csvList(cfg.PIPED_API_URLS)) {
    try {
      const data = (await fetchJson(`${base}/streams/${videoId}`, perApiMs)) as {
        title?: unknown;
        duration?: unknown;
      };
      const url = pickPipedAudio(data);
      if (url) {
        return { url, title: text(data.title), duration: secs(data.duration), via: hostOf(base) };
      }
    } catch {
      // try next instance
    }
  }

  for (const base of csvList(cfg.INVIDIOUS_API_URLS)) {
    try {
      const data = (await fetchJson(`${base}/api/v1/videos/${videoId}`, perApiMs)) as {
        title?: unknown;
        lengthSeconds?: unknown;
      };
      const url = pickInvidiousAudio(data);
      if (url) {
        return { url, title: text(data.title), duration: secs(data.lengthSeconds), via: hostOf(base) };
      }
    } catch {
      // try next instance
    }
  }

  throw new AdapterError("RETRIEVAL_FAILED", "Public fallback backends unavailable.");
}
