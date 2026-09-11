# API

All JSON. Errors look like `{ "error": { "code": "CONVERSION_FAILED", "message": "…" } }`.
Never stack traces. `export const runtime = "nodejs"` on every route (they
spawn binaries and touch disk — incompatible with edge/workers runtimes).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyze` | `{url}` → `{normalizedUrl, source, metadata:{title,duration,thumbnail,source,author,available}}` |
| POST | `/api/jobs` | `{url, bitrate}` (bitrate ∈ 128/192/256/320) → `201 {job}` |
| GET | `/api/jobs/:id` | `{job}` — `no-store`. 404 unknown, 410 expired |
| GET | `/api/jobs/:id/events` | SSE stream of `{job}` + `event: done` on terminal |
| POST | `/api/jobs/:id/cancel` | → `{job}` with `cancelled` |
| GET | `/api/download/:id` | streams `audio/mpeg`, `Content-Disposition: attachment`. 409 not-ready, 410 expired |
| GET | `/api/metrics` | `{total, active, byStatus}` — no PII |

`job` shape: `{id, status, progress 0–100, stage, bitrate, createdAt,
updatedAt, expiresAt, error?: {code,message}, input?: {title,duration,
thumbnail,source,author}, output?: {filename,bytes,duration,bitrate},
downloadUrl?}`. Internal `sourceUrl` (full URL) and request IPs are never
serialized — see `publicJob()`.

Status codes: 400 invalid/unsupported, 404 unknown id, 409 valid job but wrong
state (download before completed), 410 expired/deleted, 429 rate-limited,
500/504 tool failures/timeouts.
