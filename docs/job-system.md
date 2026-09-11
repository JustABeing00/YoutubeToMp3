# Job system

States: `queued → analyzing → retrieving → processing → finalizing → completed`
with `failed / cancelled / expired` as exits. Legal transitions live in
`lib/jobs/types.ts :: TRANSITIONS` and are unit-tested — the manager refuses
illegal jumps (e.g. a late worker write after user cancel loses the race).

## Why async + poll/SSE

Conversions outlive HTTP timeouts (proxies kill idle requests at 30–60s).
So `POST /api/jobs` only inserts a row and returns `{job:{id}}`. The browser
then subscribes:

- Primary: `GET /api/jobs/:id/events` (SSE, `lib/jobs/manager.ts :: subscribe`).
- Fallback: `GET /api/jobs/:id` every 2s (`cache: no-store`).

Both read the same SQLite row, so they can't disagree.

## Concurrency

`pump()` starts a queued job only if `running.size < MAX_CONCURRENT_JOBS`.
Per-IP active cap (`MAX_JOBS_PER_IP`) is checked at enqueue. For multiple
machines, replace `manager.ts` queuing with BullMQ — routes only call
`enqueue / cancel / get`, so they stay unchanged.

## Cancellation

`POST /api/jobs/:id/cancel` aborts the `AbortController` for that job (ffmpeg
gets SIGKILL, download stream aborts), marks `cancelled`, deletes the dir.
Worker checks `signal.aborted` between stages so a cancel mid-transcode can't
later flip the job to `completed` (the `setJob` transition guard backs this up).

## Expiry

`expiresAt = createdAt + JOB_EXPIRATION_MINUTES`. Downloads past expiry get
HTTP 410. `scripts/cleanup.ts` flips `completed → expired` and deletes dirs.
