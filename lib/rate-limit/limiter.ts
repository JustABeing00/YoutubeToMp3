/** In-memory sliding-window rate limiter (per process). Good for a single-container deploy; swap for Redis when scaling. */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function prune(b: Bucket, windowMs: number, now: number) {
  b.hits = b.hits.filter((t) => now - t < windowMs);
}

export function checkRate(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [] };
    buckets.set(key, b);
  }
  prune(b, windowMs, now);
  if (b.hits.length >= limit) {
    const oldest = b.hits[0] ?? now;
    return { allowed: false, remaining: 0, resetMs: oldest + windowMs - now };
  }
  b.hits.push(now);
  return { allowed: true, remaining: limit - b.hits.length, resetMs: windowMs };
}

export function _resetRateLimits() {
  buckets.clear();
}

export function clientIp(headers: Headers): string {
  // Trust Cloudflare / proxy headers only for rate-limit bucketing (never for auth).
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim().slice(0, 64);
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  return "unknown";
}
