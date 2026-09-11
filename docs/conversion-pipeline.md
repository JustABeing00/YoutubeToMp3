# Conversion pipeline

`lib/jobs/manager.ts :: runJob()` is the whole pipeline — read it top to
bottom and you have the system:

```
validate (route) → assertUrlSafe → getMetadata → duration/size gate
  → downloadSource() → transcodeToMp3() → removeSourceFiles()
  → verifyMp3() → completed
```

## FFmpeg invocation

```ts
ffmpeg -hide_banner -loglevel error -y
  -i <source> -vn -c:a libmp3lame -b:a <128|192|256|320>k -ar 44100
  -progress pipe:1 -nostats <output>.mp3
```

- `-vn` drops video; `-ar 44100` keeps output predictable.
- Bitrate is validated against `ALLOWED_BITRATES` at the route AND re-read
  from the job row in the worker (client can't smuggle `-b:a 9999k` — it's an
  integer column, interpolated as one argv element).
- 320 kbps from a 128 kbps source stays 128 kbps quality in a bigger file —
  the UI says so next to the picker.

## Real progress (no fake timers)

- **Retrieving:** yt-dlp's stderr `%` → mapped to 10–35%.
- **Processing:** ffmpeg `-progress pipe:1` emits `out_time_ms=N`. With a known
  duration: `pct = out_time_ms / (duration·10⁶)`. Unknown duration: slow creep
  capped at 95% until the process exits. Mapped to 38–90% of job progress.
- **Finalizing:** fixed 94% while ffprobe verifies.
- The server row is the source of truth; the client never increments on its own.

## Failure handling

Every stage throws `AdapterError(code, message)` with a stable `code`
(`AUTH_REQUIRED`, `SOURCE_UNAVAILABLE`, `OUTPUT_TOO_LARGE`, `TIMEOUT`,
`CONVERSION_FAILED`…). Routes map codes to user copy via `lib/errors.ts`
(no stack traces to the browser); full stderr tails go to structured logs.
`finally` deletes the job dir on failure so partial files never accumulate.
A file <1 KB or with no audio stream (ffprobe) fails the job even if ffmpeg
exited 0 — **success = verified MP3, not exit code.**
