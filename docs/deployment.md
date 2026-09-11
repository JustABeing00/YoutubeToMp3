# Deployment

## ⚠️ Cloudflare Workers cannot host this app

Workers are V8 isolates: **no `child_process` (ffmpeg/yt-dlp impossible), no
writable filesystem (SQLite + temp MP3s impossible), ~30s CPU limits** (a
3-minute transcode dies). The API routes explicitly use the Node.js runtime
for this reason.

## What to use instead (cheapest → best)

1. **Fly.io** (recommended free-ish) — `fly launch` with the included
   `Dockerfile`; 256 MB VM + 1 GB volume (`/data`) is enough to learn.
   `fly volumes create jobdata --size 1`, set secrets from `.env.example`.
2. **Render free tier** — Docker deploy, persistent disk for `/data`. Sleeps
   when idle (first conversion wakes it).
3. **Railway / Koyeb / Hetzner CX11 (~€4/mo)** — same container, no changes.
4. **Split (optional):** frontend on Cloudflare Pages + this container as the
   API (`NEXT_PUBLIC_SITE_URL` points at Pages, API behind same domain via
   reverse proxy to avoid CORS). Only worth it past hobby scale.

All options run `docker-compose.yml` as-is. Volumes **must** persist `/data`
(SQLite) and ideally `/tmp/converter` (or let it be ephemeral — cleanup
recovers orphans on boot).

## Scaling path

- More conversions → raise `MAX_CONCURRENT_JOBS` to CPU count, bigger VM.
- Multiple VMs → replace `manager.ts` queue with Redis/BullMQ + S3 storage
  (interfaces already exist: `JobStore`, `lib/storage/files.ts`).
- Observability → scrape `/api/metrics` (totals/active/byStatus) into any
  monitor; structured pino logs already carry jobId/event/duration.
