# VideoToMP3 — convert videos you have rights to into MP3

Minimal, fast, private converter for **technical experimentation and learning**.
Paste a link → analyze → pick quality → real progress → temporary download.
Files delete themselves.

> **Only convert media you own or have explicit permission to download.**
> Respect the source platform's Terms of Service. The YouTube adapter
> (`yt-dlp` behind `MediaSourceAdapter`) is for your own content / permitted
> material. See [Legal](#legal).

## How it works (paste → Downloads folder)

```
paste URL → validateUrl() (client, instant)
  → POST /api/analyze → server validate → assertUrlSafe (DNS/SSRF)
  → yt-dlp --dump-single-json → normalized {title,duration,thumbnail,source}
  → MetadataCard + bitrate (128/192 default/256/320)
  → POST /api/jobs → {jobId} (row: queued)
  → worker runJob(): analyzing → retrieving (yt-dlp %, 10→35%)
  → processing (ffmpeg -progress out_time_ms, 38→90%)
  → finalizing (ffprobe verify, 94%) → completed (100%)
  → UI via SSE /api/jobs/:id/events (polling fallback)
  → GET /api/download/:id streams audio/mpeg with sanitized filename
  → cleanup: source deleted post-transcode, output expired after TTL
```

Key files: `components/Converter.tsx` (state machine) → `app/api/*/route.ts`
(thin handlers) → `lib/jobs/manager.ts` (queue+pipeline) →
`lib/media/youtube-adapter.ts` → `lib/ffmpeg/transcode.ts` →
`lib/storage/files.ts` + `scripts/cleanup.ts`.

```
Browser → Frontend UI → API → Validation → Job creation → Queue/Worker
  → Media retrieval → FFmpeg → Temp storage → Download → Auto cleanup
```

## Quick start (local)

Requires Node 20+ and FFmpeg + yt-dlp for real conversions (UI/tests run
without them; conversions return a clear `SERVER_ERROR` telling you what to
install).

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev        # http://localhost:3000
```

Install tools:

- **Windows (winget):** `winget install Gyan.FFmpeg` then
  `winget install yt-dlp.yt-dlp` — ensure both are on `PATH`, or set
  `FFMPEG_PATH` / `YTDLP_PATH` in `.env`.
- **macOS:** `brew install ffmpeg yt-dlp`
- **Debian/Ubuntu:** `apt install ffmpeg` + latest yt-dlp binary from GitHub.

## Docker (reproducible, recommended)

```bash
cp .env.example .env
docker compose up --build   # http://localhost:3000
```

Image bundles Node 20 + ffmpeg + yt-dlp. Volumes persist `/data` (SQLite)
and `/tmp/converter` (job files).

## Configuration

See `.env.example` (every operational knob, documented). Highlights:

| Var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `file:./data/jobs.db` | SQLite file (metadata only) |
| `TEMP_DIR` | `./tmp/converter` | job dirs: `jobs/<id>/{source,output}` |
| `MAX_CONCURRENT_JOBS` | `2` | worker slots |
| `MAX_JOBS_PER_IP` / `JOBS_PER_HOUR_PER_IP` / `ANALYZE_PER_MIN_PER_IP` | `5/10/20` | rate limits |
| `MAX_INPUT_DURATION_SEC` | `3600` | videos longer than this are refused |
| `MAX_FILE_MB` | `200` | source+output cap |
| `JOB_EXPIRATION_MINUTES` | `30` | download TTL |
| `PROCESSING_TIMEOUT_MIN` | `15` | kill switch per job |
| `ALLOWED_DIRECT_HOSTS` | `` | extra hosts for direct-file adapter |
| `FFMPEG_PATH`/`FFPROBE_PATH`/`YTDLP_PATH` | system binaries | override paths |

## Commands

```bash
npm run dev | build | start | lint | typecheck
npm test            # vitest: unit + security + integration + frontend
npm run cleanup     # manual expiry/orphan sweep
npm run db:migrate  # ensure jobs table
```

## API

`POST /api/analyze` · `POST /api/jobs` · `GET /api/jobs/:id` ·
`GET /api/jobs/:id/events` (SSE) · `POST /api/jobs/:id/cancel` ·
`GET /api/download/:id` · `GET /api/metrics`. Full contracts in `docs/api.md`.

## Security

Allowlisted hosts · DNS-level SSRF blocking · argv-only spawns (no shell) ·
`safeJoin` + strict job IDs · per-IP rate limits · duration/size/timeout caps ·
ffprobe-verified output · redacted structured logs. Details: `docs/security.md`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `yt-dlp binary not found` | install yt-dlp or set `YTDLP_PATH` |
| `ffmpeg binary not found` | install FFmpeg or set `FFMPEG_PATH` |
| `requires sign-in / private` | video needs auth — expected, can't convert |
| `file too large / too long` | over `MAX_FILE_MB` / `MAX_INPUT_DURATION_SEC` |
| `rate limited / server busy` | wait, or raise limits in `.env` |
| `HTTP 403 on download` (flagged VPS IP) | container mints proof-of-origin tokens + Chrome fingerprint automatically (`YTDLP_EXTRA_ARGS`); on failure it retries via free Piped/Invidious backends (`FALLBACK_*` in `.env`). If all fail, the host IP range is burned — refresh `PIPED_API_URLS`/`INVIDIOUS_API_URLS` or rebuild monthly for latest yt-dlp fixes |
| `better-sqlite3` install fails on Windows | not used — storage is Node's built-in `node:sqlite`, no build tools needed |
| Expired download (410) | TTL passed — convert again |
| `ExperimentalWarning: SQLite…` on Node 24 | benign — `node:sqlite` prints this on some versions; everything works |

## Deployment — read before Cloudflare

**Cloudflare Workers/Pages cannot run the backend** (no child processes, no
filesystem, CPU time limits). Deploy the container to **Fly.io / Render /
Railway / any VPS** (see `docs/deployment.md` for free-tier picks). The
frontend *can* live on Cloudflare Pages only if split from the API container.

## Legal

Downloading videos you don't own or lack permission for may violate copyright
law and YouTube's Terms of Service. This project is for learning and for
content you own or are authorized to process (your uploads, Creative Commons /
public-domain works, direct links you control). The permission notice is shown
in the UI; `ENABLED_ADAPTERS=direct` + `ALLOWED_DIRECT_HOSTS` restrict the app
to operator-approved sources.

## Most important files

- `components/Converter.tsx` — entire UX state machine (idle→analyzing→ready→working→done/error)
- `app/api/analyze/route.ts`, `app/api/jobs/route.ts` — validation/rate-limit/entry
- `lib/validation/url.ts` — normalization + allowlist (client+server shared)
- `lib/security/ssrf.ts` — SSRF/DNS protection
- `lib/media/adapter.ts`, `lib/media/youtube-adapter.ts` — downloader abstraction
- `lib/ffmpeg/transcode.ts` — spawn + real progress + ffprobe verify
- `lib/jobs/manager.ts` — queue, pipeline, cancel, SSE fan-out
- `lib/jobs/store.ts` — SQLite metadata store (swap for Postgres later)
- `lib/storage/files.ts`, `scripts/cleanup.ts` — isolation + expiry
- `docs/*.md` — architecture, pipeline, jobs, API, security, deployment
