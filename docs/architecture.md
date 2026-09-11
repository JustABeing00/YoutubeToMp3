# Architecture

Single-container Next.js app. Everything runs in one Node process (plus
`ffmpeg` / `yt-dlp` child processes) — ideal for learning and cheap hosting.
Scale later by extracting the worker; the seams are already drawn.

```
Browser
  │  POST /api/analyze, POST /api/jobs, GET /api/jobs/:id (+SSE), GET /api/download/:id
  ▼
Next.js Route Handlers (app/api/*) — thin: validate → rate-limit → delegate
  │
  ├─ lib/validation/url.ts   normalize + allowlist (shared client/server)
  ├─ lib/security/ssrf.ts    literal-IP block + DNS-resolve check
  ├─ lib/rate-limit/limiter.ts  per-IP sliding windows
  ▼
lib/jobs/manager.ts — in-process queue (semaphore = MAX_CONCURRENT_JOBS)
  │  rows in SQLite (lib/jobs/store.ts) — metadata only
  ▼
lib/media/* — MediaSourceAdapter interface (youtube-adapter, direct-adapter)
  │  download → $TEMP_DIR/jobs/<id>/source/
  ▼
lib/ffmpeg/transcode.ts — spawn ffmpeg (argv arrays), parse -progress
  │  output → $TEMP_DIR/jobs/<id>/output/<sanitized>.mp3
  │  verify with ffprobe before marking completed
  ▼
GET /api/download/:id — streams file, sets Content-Disposition
  ▼
scripts/cleanup.ts — expiry + orphan sweep (interval + boot + manual)
```

## Why these choices

- **Jobs are async** — conversions take 10s–minutes. Holding an HTTP request
  open would hit proxy timeouts and waste connections. POST returns `{jobId}`
  instantly; the client follows progress via SSE/polling.
- **SQLite for metadata, filesystem for bytes** — DBs are bad blob stores
  (bloat, backup pain, no range-streaming). `JobStore` is an interface, so
  Postgres later means one new class, not a rewrite. Same for
  `LocalFileStorage` → S3.
- **One dir per job** — isolation makes cleanup (`rm -rf jobs/<id>`) and
  traversal-prevention (`safeJoin`) trivial, and concurrent jobs can't collide.
- **Adapter interface** — the pipeline calls `getMetadata/downloadSource`
  only. yt-dlp specifics (flags, JSON shape, error strings) never leak past
  `lib/media/`. Disable YouTube via `ENABLED_ADAPTERS=direct`.
- **Spawn with argv, never shell** — user URLs are single argv elements;
  there is no string for `; rm -rf /` to escape from. Validation runs first
  anyway (defense in depth).

## Request lifecycle (paste → download)

1. User pastes URL → client `validateUrl()` gives instant feedback.
2. `POST /api/analyze` → server validate → `assertUrlSafe` (DNS) →
   `adapter.getMetadata()` → normalized JSON (never raw yt-dlp output).
3. UI shows `MetadataCard` + bitrate picker → `POST /api/jobs`.
4. Manager inserts `queued` row, `pump()` starts `runJob` if a slot is free.
5. Worker: `analyzing` (metadata) → `retrieving` (download, 10→35%) →
   `processing` (ffmpeg, 38→90%) → `finalizing` (ffprobe verify, 94%) →
   `completed` (100%, source files already deleted).
6. UI follows via SSE (`/api/jobs/:id/events`) with polling fallback.
7. `GET /api/download/:id` streams the MP3 with a sanitized filename.
8. After `JOB_EXPIRATION_MINUTES`, cleanup marks `expired` and deletes files.
