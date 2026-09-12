import fs from "node:fs/promises";
import path from "node:path";
import { extractYoutubeId } from "@/lib/validation/url";
import { getConfig } from "@/lib/config";

/**
 * Persistent conversion cache: completed MP3s keyed by videoId + bitrate.
 * Repeat conversions are served from disk without touching YouTube at all —
 * faster for users (seconds, not minutes) and far fewer upstream requests,
 * which is exactly how the big converter sites keep load (and blocks) down.
 *
 * Lives under <dbdir>/cache (on the /data volume in Docker). Bounded by
 * CACHE_MAX_MB + CACHE_TTL_HOURS; enforced on every write and in cleanup.
 */

/** Cache key for a YouTube video + bitrate. Null when inputs are invalid. */
export function cacheKey(videoId: string, bitrate: number): string | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  if (!Number.isInteger(bitrate) || bitrate <= 0 || bitrate > 2000) return null;
  return `${videoId}-${bitrate}k.mp3`;
}

/** Extract a YouTube video id from a normalized source URL. Null on failure. */
export function videoIdOf(sourceUrl: string): string | null {
  try {
    return extractYoutubeId(new URL(sourceUrl));
  } catch {
    return null;
  }
}

function dataDir(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/jobs.db";
  const p = raw.startsWith("file:") ? raw.slice("file:".length) : "./data/jobs.db";
  const abs = path.isAbsolute(p) ? p : path.resolve(/*turbopackIgnore: true*/ process.cwd(), p);
  return path.dirname(abs);
}

export function cacheDir(): string {
  return path.join(dataDir(), "cache");
}

export function cachePath(key: string): string {
  if (!/^[A-Za-z0-9_-]{11}-\d{1,4}k\.mp3$/.test(key)) throw new Error("unsafe cache key");
  return path.join(cacheDir(), key);
}

/** Path of a fresh, non-empty cached MP3, or null. */
export async function readCache(key: string): Promise<string | null> {
  try {
    const cfg = getConfig();
    const p = cachePath(key);
    const st = await fs.stat(p);
    if (!st.isFile() || st.size === 0) return null;
    if (Date.now() - st.mtimeMs > cfg.CACHE_TTL_HOURS * 3_600_000) return null;
    return p;
  } catch {
    return null;
  }
}

/** Store a finished MP3 in cache (best-effort), then enforce bounds. */
export async function writeCache(key: string, srcPath: string): Promise<void> {
  const cfg = getConfig();
  const dest = cachePath(key);
  await fs.mkdir(cacheDir(), { recursive: true });
  await fs.copyFile(srcPath, dest);
  await sweepCache(cfg.CACHE_MAX_MB * 1024 * 1024, cfg.CACHE_TTL_HOURS * 3_600_000);
}

/** Delete expired entries, then oldest-first until under maxBytes. Exported for cleanup + tests. */
export async function sweepCache(maxBytes: number, ttlMs: number, now = Date.now()): Promise<string[]> {
  const removed: string[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(cacheDir());
  } catch {
    return removed;
  }
  type Item = { name: string; mtimeMs: number; size: number };
  const items: Item[] = [];
  for (const name of entries) {
    if (!/^[A-Za-z0-9_-]{11}-\d{1,4}k\.mp3$/.test(name)) continue;
    try {
      const st = await fs.stat(path.join(cacheDir(), name));
      if (!st.isFile()) continue;
      if (now - st.mtimeMs > ttlMs) {
        await fs.rm(path.join(cacheDir(), name), { force: true });
        removed.push(name);
        continue;
      }
      items.push({ name, mtimeMs: st.mtimeMs, size: st.size });
    } catch {
      continue;
    }
  }
  let total = items.reduce((n, i) => n + i.size, 0);
  items.sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
  for (const it of items) {
    if (total <= maxBytes) break;
    try {
      await fs.rm(path.join(cacheDir(), it.name), { force: true });
      removed.push(it.name);
      total -= it.size;
    } catch {
      continue;
    }
  }
  return removed;
}
