// @ts-nocheck — Cloudflare Worker runtime (deployed by wrangler, not Next.js).
// Type-checked by `wrangler deploy --dry-run`, not by the Next.js tsc gate.
/**
 * kharb.edge — full-site Cloudflare Worker in front of the Render Free backend.
 *
 * Routes (see wrangler.toml): kharb.online/* + www.kharb.online/*.
 *
 * - www → apex 301 (preserves path). The Next.js redirect stays as backstop.
 * - /api/* → converting proxy: no cache, streams SSE/downloads untouched,
 *   OPTIONS answered at edge, POST /api/analyze cached 60s, 502/503/525
 *   (Render asleep) → 1 retry after 5s → 503 {code:WAKING} for the UI.
 * - everything else (pages, static, sitemap, robots, manifest) → cached
 *   proxy: GET 200s edge-cached (HTML 5 min, hashed assets 1 day), never
 *   caches no-store/private or non-GET. Render sleeps → 1 retry → 503 page.
 * - Forwards real visitor IP (x-origin-ip) + X-Origin-Token so the backend
 *   can rate-limit correctly and reject direct-origin bypass (middleware.ts).
 */

interface Env {
  RENDER_ORIGIN: string;
  ORIGIN_TOKEN?: string;
}

const ANALYZE_CACHE_TTL = 60;
const PAGE_CACHE_TTL = 300; // HTML + xml/txt: fresh enough, kind to sleepy origin
const ASSET_CACHE_TTL = 86400; // hashed JS/CSS/images/fonts: immutable-ish
const NO_STORE = "no-store, no-transform";

function wakingJson(): Response {
  return Response.json(
    { error: { code: "WAKING", message: "Converter is waking up after idle. Please wait a moment and retry." } },
    { status: 503, headers: { "cache-control": NO_STORE } }
  );
}

function wakingPage(): Response {
  return new Response(
    "<!doctype html><html><head><title>Waking… — Kharb</title><meta name=viewport content='width=device-width,initial-scale=1'></head>" +
      "<body style='font-family:system-ui;background:#111;color:#eee;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>" +
      "<div style='text-align:center'><h1>Waking converter…</h1><p>Free tier sleeps after idle. Reload in ~60 seconds.</p></div></body></html>",
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": NO_STORE } }
  );
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("true-client-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "unknown"
  ).slice(0, 64);
}

function originOf(env: Env): string | null {
  const o = (env.RENDER_ORIGIN ?? "").replace(/\/$/, "");
  return o || null;
}

function baseHeaders(req: Request, env: Env, forApi: boolean): Headers {
  const h = new Headers();
  const pass = ["content-type", "range", "accept", "accept-language", "user-agent", "if-none-match", "if-modified-since"];
  for (const k of pass) {
    const v = req.headers.get(k);
    if (v) h.set(k, v);
  }
  const ip = clientIp(req);
  if (ip && ip !== "unknown") {
    h.set("x-origin-ip", ip);
    h.set("cf-connecting-ip", ip);
  }
  if (forApi && env.ORIGIN_TOKEN) h.set("x-origin-token", env.ORIGIN_TOKEN);
  return h;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Canonical host: www → apex, path preserved.
    if (url.hostname === "www.kharb.online") {
      url.hostname = "kharb.online";
      return Response.redirect(url.toString(), 301);
    }

    const origin = originOf(env);
    if (!origin) return Response.json({ error: { code: "SERVER_ERROR", message: "Origin not configured." } }, { status: 500 });

    if (url.pathname.startsWith("/api/")) return serveApi(req, url, origin, env, ctx);
    return serveSite(req, url, origin, ctx);
  },
};

/* ------------------------------- /api/* ------------------------------- */

async function serveApi(req: Request, url: URL, origin: string, env: Env, ctx: ExecutionContext): Promise<Response> {
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

  // Short edge cache for analyze only — never jobs/download/events.
  if (req.method === "POST" && url.pathname === "/api/analyze") {
    const bodyText = await req.clone().text().catch(() => "");
    const key = new Request(`https://edge.local/analyze?h=${hash(bodyText)}&ip=${clientIp(req)}`, { method: "GET" });
    const cache = caches.default;
    const hit = await cache.match(key);
    if (hit) return hit;
    const res = await forwardApi(req, url, origin, env);
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set("cache-control", `public, max-age=${ANALYZE_CACHE_TTL}`);
      headers.set("x-edge-cache", "MISS");
      ctx.waitUntil(cache.put(key, new Response(res.clone().body, { status: res.status, headers })));
    }
    return res;
  }

  return forwardApi(req, url, origin, env, true);
}

async function forwardApi(req: Request, url: URL, origin: string, env: Env, retryOnWake = false): Promise<Response> {
  const target = origin + url.pathname + url.search;
  const headers = baseHeaders(req, env, true);
  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = req.body;

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    if (!retryOnWake) return wakingJson();
    await sleep(5000);
    try {
      res = await fetch(target, init);
    } catch {
      return wakingJson();
    }
  }

  // Render asleep -> retry once, then clean waking signal for the UI.
  if (retryOnWake && (res.status === 502 || res.status === 503 || res.status === 525)) {
    await sleep(5000);
    try {
      const retry = await fetch(target, init);
      if (retry.status !== 502 && retry.status !== 503 && retry.status !== 525) return passthrough(retry);
    } catch {}
    return wakingJson();
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

/* --------------------------- pages + static --------------------------- */

function cacheableSiteResponse(req: Request, res: Response): number | null {
  if (req.method !== "GET" || !res.ok) return null;
  if (req.headers.has("range")) return null;
  const cc = (res.headers.get("cache-control") ?? "").toLowerCase();
  if (cc.includes("no-store") || cc.includes("private")) return null;
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html")) return PAGE_CACHE_TTL;
  if (
    ct.includes("javascript") ||
    ct.includes("text/css") ||
    ct.includes("image/") ||
    ct.includes("font") ||
    ct.includes("application/json") ||
    ct.includes("xml") ||
    ct.includes("text/plain") ||
    req.url.endsWith(".webmanifest") ||
    req.url.endsWith(".txt") ||
    req.url.endsWith(".xml")
  ) {
    return ASSET_CACHE_TTL;
  }
  return null;
}

async function serveSite(req: Request, url: URL, origin: string, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;

  if (req.method === "GET") {
    const hit = await cache.match(new Request(url.toString(), { method: "GET" }));
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("x-edge-cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }
  }

  const attempt = async (): Promise<Response | null> => {
    try {
      const res = await fetch(origin + url.pathname + url.search, { method: req.method, headers: baseHeaders(req, {} as Env, false), redirect: "manual" });
      return res;
    } catch {
      return null;
    }
  };

  let res = await attempt();
  if (!res || res.status === 502 || res.status === 503 || res.status === 525) {
    await sleep(5000);
    res = await attempt();
    if (!res || res.status === 502 || res.status === 503 || res.status === 525) return wakingPage();
  }

  const ttl = cacheableSiteResponse(req, res);
  if (ttl !== null) {
    const headers = new Headers(res.headers);
    headers.set("cache-control", `public, max-age=${ttl}`);
    headers.set("x-edge-cache", "MISS");
    ctx.waitUntil(cache.put(new Request(url.toString(), { method: "GET" }), new Response(res.clone().body, { status: res.status, headers })));
    return new Response(res.body, { status: res.status, headers });
  }
  return res;
}

/* --------------------------------- utils --------------------------------- */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
