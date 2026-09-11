# Security

Threat model: untrusted URLs in, child processes + filesystem writes inside.
Layers (defense in depth):

1. **Allowlist, not blocklist** — only `youtube.com / youtu.be / music…` (+
   operator `ALLOWED_DIRECT_HOSTS`) pass validation. Everything else is
   rejected before any network/process use.
2. **SSRF** — `isBlockedHost()` rejects literal private IPs/localhost/cloud
   metadata (`169.254.169.254`, `metadata.google.internal`, `*.internal`,
   `*.local`). `assertUrlSafe()` then DNS-resolves the host and rejects
   private/loopback results (blocks DNS-rebinding). Call it before every fetch.
3. **Command injection** — `spawn(cmd, args[])` everywhere; the URL is always
   one argv element after `--`. No `exec`, no template strings into shell.
   Validation rejects backticks/`$()`/`;`/`|` first anyway.
4. **Path traversal** — job dirs are `jobs/<nanoid>/`; `safeJoin()` asserts
   resolved paths stay inside; `assertJobId()` allows `[A-Za-z0-9_-]{8,64}`
   only; download filenames come from `sanitizeFilename()`, never the title
   verbatim.
5. **Resource exhaustion** — `MAX_INPUT_DURATION_SEC`, `MAX_FILE_MB` (checked
   pre-flight via metadata/`content-length` AND during streaming),
   `MAX_CONCURRENT_JOBS`, per-IP active/hourly/minute buckets,
   `PROCESSING_TIMEOUT_MIN` kill timers on every child.
6. **File abuse** — extension/MIME allow-check on direct downloads, minimum
   output size (1 KB), ffprobe audio-stream verification, source deleted right
   after transcode, everything under per-job TTL.
7. **Logging hygiene** — `lib/logging/logger.ts` strips query strings from
   URLs and drops token/secret/cookie fields. Logs carry `jobId/event/codes`,
   never bodies or IPs.

Tests in `tests/security/` pin: traversal (`../../etc/passwd`), injection
(`$(whoami)`, backticks, `; rm`), SSRF (private ranges, metadata IP),
oversized input, and rate-limit buckets.
