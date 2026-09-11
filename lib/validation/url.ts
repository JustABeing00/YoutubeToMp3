import { isBlockedHost } from "@/lib/security/hosts";

/**
 * Supported sources. Keep this allowlist tight — everything else is rejected
 * before we ever touch the network or spawn a downloader.
 */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const DIRECT_HOSTS_ENV = "ALLOWED_DIRECT_HOSTS"; // optional comma-separated extra hosts for direct files

export type SupportedSource = "youtube" | "direct";

export interface ValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  source?: SupportedSource;
  videoId?: string;
  code?: string;
  reason?: string;
}

const MAX_URL_LENGTH = 2048;

export function getDirectAllowlist(): Set<string> {
  const raw = process.env[DIRECT_HOSTS_ENV] ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Client-safe + server-safe validation (server adds SSRF/DNS checks separately). */
export function validateUrl(input: string): ValidationResult {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { ok: false, code: "INVALID_URL", reason: "empty" };
  if (trimmed.length > MAX_URL_LENGTH) return { ok: false, code: "INVALID_URL", reason: "too-long" };
  // Block obvious filesystem / shell input before URL parsing.
  if (/^[\w-]+:/.test(trimmed) === false && !/^https?:\/\//i.test(trimmed)) {
    return { ok: false, code: "INVALID_URL", reason: "missing-scheme" };
  }
  // Block obvious shell/filesystem metachars. Note: `&` and `=` are LEGAL in
  // URLs (query separators) and must stay allowed — real watch links need them.
  if (/[`$;|<>\\\s]/.test(trimmed) && !/^https?:\/\/[^\s`$;|<>\\]+$/i.test(trimmed)) {
    return { ok: false, code: "INVALID_URL", reason: "illegal-chars" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, code: "INVALID_URL", reason: "malformed" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "INVALID_URL", reason: "bad-protocol" };
  }
  if (url.username || url.password) {
    return { ok: false, code: "INVALID_URL", reason: "credentials-in-url" };
  }

  const host = url.hostname.toLowerCase();
  if (!host || host.length > 253) return { ok: false, code: "INVALID_URL", reason: "bad-host" };

  // Synchronous SSRF pre-check (literal IPs / localhost names). DNS-level
  // check happens server-side in assertUrlSafe().
  const blocked = isBlockedHost(host);
  if (blocked) return { ok: false, code: "INVALID_URL", reason: "blocked-host" };

  // Normalize: strip tracking params, fragments, force canonical host.
  if (YOUTUBE_HOSTS.has(host)) {
    const videoId = extractYoutubeId(url);
    if (!videoId) return { ok: false, code: "INVALID_URL", reason: "missing-video-id" };
    const normalized = `https://www.youtube.com/watch?v=${videoId}`;
    return { ok: true, normalizedUrl: normalized, source: "youtube", videoId };
  }

  // Direct media files (operator-owned content) — opt-in via allowlist.
  const direct = getDirectAllowlist();
  if (direct.has(host)) {
    url.hash = "";
    return { ok: true, normalizedUrl: url.toString(), source: "direct" };
  }

  return { ok: false, code: "UNSUPPORTED_SOURCE", reason: `host-not-allowed:${host}` };
}

export function extractYoutubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  }
  const v = url.searchParams.get("v");
  if (v && /^[A-Za-z0-9_-]{6,20}$/.test(v)) return v;
  // /shorts/<id>, /embed/<id>, /live/<id>
  const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{6,20})/);
  if (m) return m[2];
  return null;
}

/** Human duration formatting, tolerant of missing/weird values. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "–";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
