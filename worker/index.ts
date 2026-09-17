// @ts-nocheck — Cloudflare Worker runtime (deployed by wrangler, not Next.js).
// Type-checked by `wrangler deploy --dry-run`, not by the Next.js tsc gate.
/**
 * kharb.edge — Cloudflare Worker in front of the Render Free backend.
 *
 * Same-origin proxy: browser calls /api/* on kharb.online, the Worker pipes
 * to RENDER_ORIGIN (xxxx.onrender.com) and streams the response back without
 * buffering (SSE + 200MB MP3s pass through, ~1ms CPU per request).
 *
 * - OPTIONS answered at edge (no origin wake for preflights).
 * - POST /api/analyze short-cached 60s (repeat pastes don't wake Render).
 * - 502/503/525 (Render asleep) -> 1 retry after 5s -> 503 {code:WAKING}
 *   which the Converter UI already handles via its polling fallback.
 * - Forwards cf-connecting-ip as x-origin-ip + X-Origin-Token so the backend
 *   can rate-limit real visitors and reject direct-origin bypass.
 */

interface Env {
  RENDER_ORIGIN: string;
  ORIGIN_TOKEN?: string;
}

const ANALYZE_CACHE_TTL = 60;
const NO_STORE = "no-store, no-transform";

function waking(): Response {
  return Response.json({ error: { code: "WAKING", message: "Converter is waking up after idle. Please wait a moment and retry." } }, { status: 503, headers: { "cache-control": NO_STORE } });
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("true-client-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "unknown"
  ).slice(0, 64);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return new Response("not found", { status: 404 });

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "https://kharb.online",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type, range",
          "access-control-max-age": "86400",
        },
      });
    }

    const origin = (env.RENDER_ORIGIN ?? "").replace(/\/$/, "");
    if (!origin) return Response.json({ error: { code: "SERVER_ERROR", message: "Origin not configured." } }, { status: 500 });

    // Short edge cache for analyze only — never jobs/download/events.
    const cacheable = req.method === "POST" && url.pathname === "/api/analyze";
    if (cacheable) {
      const bodyText = await req.clone().text().catch(() => "");
      const ip = clientIp(req);
      const key = new Request(`https://edge.local/analyze?h=${hash(bodyText)}&ip=${ip}`, { method: "GET" });
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) return hit;
      const res = await forward(req, url, origin, env);
      if (res.ok) {
        const copy = res.clone();
        const headers = new Headers(copy.headers);
        headers.set("cache-control", `public, max-age=${ANALYZE_CACHE_TTL}`);
        headers.set("x-edge-cache", "MISS");
        ctx.waitUntil(cache.put(key, new Response(copy.body, { status: copy.status, headers })));
      }
      return res;
    }

    return forward(req, url, origin, env, true);
  },
};

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function forward(req: Request, url: URL, origin: string, env: Env, retryOnWake = false): Promise<Response> {
  const target = origin + url.pathname + url.search;
  const headers = new Headers();
  // Forward only what the origin needs; drop host/cookies/cf-* (except IP).
  const pass = ["content-type", "range", "accept", "user-agent", "if-none-match"];
  for (const k of pass) {
    const v = req.headers.get(k);
    if (v) headers.set(k, v);
  }
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
  if (ip) headers.set("x-origin-ip", ip.split(",")[0].trim());
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) headers.set("cf-connecting-ip", cfIp);
  if (env.ORIGIN_TOKEN) headers.set("x-origin-token", env.ORIGIN_TOKEN);

  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = req.body;

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    if (!retryOnWake) return waking();
    await sleep(5000);
    try {
      res = await fetch(target, init);
    } catch {
      return waking();
    }
  }

  // Render asleep -> retry once, then clean waking signal for the UI.
  if (retryOnWake && (res.status === 502 || res.status === 503 || res.status === 525)) {
    await sleep(5000);
    try {
      const retry = await fetch(target, init);
      if (retry.status !== 502 && retry.status !== 503 && retry.status !== 525) return passthrough(retry);
    } catch {}
    return waking();
  }
  return passthrough(res);
}

function passthrough(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("x-content-type-options", "nosniff");
  // Stream body through untouched — critical for SSE + large downloads.
  return new Response(res.body, { status: res.status, headers });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
