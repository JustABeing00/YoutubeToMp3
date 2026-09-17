# Deployment — Workers + Render (free, no card)

## Architecture (locked — Worker-only, no Pages)

```
Browser → kharb.online/* → Worker kharb-edge (worker/index.ts, wrangler.toml)
  ├─ /api/*            → converting proxy to Render (no cache, streams SSE/downloads)
  ├─ pages + static    → cached proxy to Render (HTML 5 min, assets 1 day)
  └─ www.kharb.online  → 301 to apex inside the Worker
```

Same-origin proxy = Converter keeps relative `/api/*` URLs, zero CORS work.
Workers free: 100k req/day, no card. Render free: 0.1 CPU / 512MB /
ephemeral / sleeps after 15 min. Conversions AND pages both live on Render;
the edge only caches + retries cold starts. (Pages intentionally NOT used —
one repo containing backend code makes Pages builds awkward; Pages can bolt
on later if traffic outgrows Worker quota, with no Render changes.)

## ⚠️ Cloudflare Workers cannot host conversions

Workers are V8 isolates: **no `child_process` (ffmpeg/yt-dlp impossible), no
writable filesystem (SQLite + temp audio impossible), CPU limits** (a
3-minute transcode dies). The API routes explicitly use the Node.js runtime
for this reason. The Worker here is a thin proxy, not a converter.

## Backend — Render Free Docker

Option 1 — blueprint (recommended): `render.yaml` in repo root. Dashboard →
New → Blueprint → select repo → set `ORIGIN_TOKEN` (generate once, also used
as Worker secret) → Deploy. Region: Singapore.

Option 2 — manual: New Web Service → Docker → repo → region Singapore →
health check `/api/metrics` → env vars (see `render.yaml` + `.env.example`
Workers section): ephemeral `DATABASE_URL=file:/tmp/data/jobs.db`,
`TEMP_DIR=/tmp/converter`, `MAX_CONCURRENT_JOBS=1`,
`MAX_INPUT_DURATION_SEC=1200`, `CACHE_MAX_MB=0`, `DEFAULT_BITRATE=128`,
`WARP_ENABLED=false`, `FALLBACK_ENABLED=true`, `ORIGIN_TOKEN=<rand32>`.

Verify direct before DNS: `curl https://xxxx.onrender.com/api/metrics` → 200,
then one short convert. Expect 30–60s cold start after 15 min idle.

## Edge — Worker kharb-edge

```bash
npx wrangler secret put ORIGIN_TOKEN   # same value as Render ORIGIN_TOKEN
npx wrangler deploy --var RENDER_ORIGIN:https://xxxx.onrender.com
```

Then Cloudflare dashboard → Workers Routes → `kharb.online/api/*`.
Behavior: OPTIONS answered at edge; `POST /api/analyze` cached 60s;
502/503/525 → retry once after 5s → `503 {code:WAKING}` (UI auto-retries);
all forwards carry `X-Origin-Token` + `x-origin-ip`; responses stream
untouched (SSE + Range downloads work). Full-site mode (no Pages):
`wrangler.toml` routes `kharb.online/*` + `www.kharb.online/*` — www 301s
to apex in the Worker, GET pages edge-cached (HTML 5 min, assets 1 day,
`x-edge-cache: HIT/MISS`), `/api/*` never cached.

## Frontend — deleted (Worker-only)

Pages intentionally NOT used: one repo containing backend code makes Pages
builds awkward, and the Worker already serves pages edge-cached. No Pages
project, no second `NEXT_PUBLIC_*` copy. If traffic outgrows the 100k/day
Worker quota, Pages bolts on later with no Render changes.

## DNS cutover (registrar/Hostinger panel)

1. Add `kharb.online` to Cloudflare → change NS → wait Active. Lower TTL 300.
2. Delete old `A @/www → <vps-ip>` + all `AAAA` (Render is IPv4-only).
3. `CNAME @ → pages.dev`, `CNAME www → pages.dev`, Worker route `/api/*`.
4. Verify: `curl -sI https://kharb.online/` 200, `curl -s
   https://kharb.online/api/metrics` 200, sitemap locs apex-only.

Direct `xxxx.onrender.com` without `X-Origin-Token` returns 404
(`middleware.ts`) — that's the bypass guard working, not an outage.

## Fitting the 0.1 CPU box (already in code)

- Formats: `m4a`/`opus` = `ffmpeg -c:a copy` stream copy (near-zero CPU,
  instant); `mp3` = libmp3lame re-encode (slow path). Default UI is Original.
- `MAX_CONCURRENT_JOBS=1`, ephemeral SQLite (`PRAGMA WAL`), cache disabled
  (`CACHE_MAX_MB=0`), polling 3.5s (saves Workers quota), waking UX + retry.
- Downloads support Range/ETag/HEAD for resumable mobile downloads.
- Monthly: Render “Clear build cache & Deploy” (fresh yt-dlp vs YouTube).

## Upgrade lever (no re-architecting)

Render Starter $7/mo for the origin only (0.5 CPU, no sleep, +disk at
`/data`): set `DATABASE_URL=file:/data/jobs.db`, `CACHE_MAX_MB=2000`,
`WARP_ENABLED=true` with baked `wgcf-profile.conf`. Edge + Pages untouched.

## Old options (kept for reference)

- Fly.io: card required, no free for new users (2026).
- Koyeb: card required since May 2026. Free instances can't use volumes.
- Oracle Always-Free (2 OCPU/12GB forever) remains the best $0 VM if you
  ever have a card — same Docker, zero code changes (ARM needs 2-line
  Dockerfile arch swap).
