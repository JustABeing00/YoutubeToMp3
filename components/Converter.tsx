"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateUrl } from "@/lib/validation/url";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { MetadataCard, MetadataSkeleton, type Meta } from "@/components/MetadataCard";
import { ThemeToggle } from "@/components/ThemeToggle";

type Phase =
  | { name: "idle" }
  | { name: "analyzing" }
  | { name: "ready"; meta: Meta; normalizedUrl: string }
  | { name: "working"; jobId: string; status: string; stage: string; progress: number }
  | { name: "done"; jobId: string; filename: string; bytes: number; duration: number | null; downloadUrl: string }
  | { name: "error"; message: string; code?: string };

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function friendlyError(code?: string, fallback?: string): string {
  const map: Record<string, string> = {
    INVALID_URL: "That URL doesn't look valid. Please paste a supported video link.",
    UNSUPPORTED_SOURCE: "This source isn't supported.",
    METADATA_UNAVAILABLE: "We couldn't fetch information for this video. It may be private or unavailable.",
    AUTH_REQUIRED: "This video requires sign-in and can't be converted.",
    SOURCE_UNAVAILABLE: "The source media is unavailable right now.",
    RETRIEVAL_FAILED: "We couldn't retrieve the source media.",
    CONVERSION_FAILED: "We couldn't convert this file. Please try again.",
    TIMEOUT: "The conversion timed out. Try a shorter video.",
    OUTPUT_TOO_LARGE: "This video would produce too large a file.",
    RATE_LIMITED: "You're doing that too often. Please wait a moment.",
    EXPIRED: "This file has expired and was deleted.",
  };
  if (code && map[code]) return map[code];
  return fallback || "Something went wrong. Please try again.";
}

export function Converter() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [bitrate, setBitrate] = useState(192);
  const [hint, setHint] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const eventRef = useRef<EventSource | null>(null);

  const stopStreams = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (eventRef.current) {
      eventRef.current.close();
      eventRef.current = null;
    }
  }, []);

  useEffect(() => stopStreams, [stopStreams]);

  const analyze = useCallback(
    async (raw: string) => {
      const v = validateUrl(raw);
      if (!v.ok) {
        setHint(v.code === "UNSUPPORTED_SOURCE" ? "Only supported video links work here." : "Enter a valid video URL first.");
        setPhase({ name: "error", message: friendlyError(v.code), code: v.code });
        return;
      }
      setHint(null);
      setPhase({ name: "analyzing" });
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: v.normalizedUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPhase({ name: "error", message: friendlyError(data?.error?.code, data?.error?.message), code: data?.error?.code });
          return;
        }
        setPhase({ name: "ready", meta: data.metadata, normalizedUrl: data.normalizedUrl });
      } catch {
        setPhase({ name: "error", message: "Network error. Check your connection and try again." });
      }
    },
    []
  );

  const startJob = useCallback(
    async (normalizedUrl: string) => {
      setPhase({ name: "working", jobId: "", status: "queued", stage: "Waiting for a processing slot…", progress: 0 });
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: normalizedUrl, bitrate }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPhase({ name: "error", message: friendlyError(data?.error?.code, data?.error?.message), code: data?.error?.code });
          return;
        }
        const jobId: string = data.job.id;

        const applyJob = (job: { status: string; progress: number; stage: string; output?: { filename: string; bytes: number; duration: number | null }; error?: { code: string; message: string } }) => {
          if (job.status === "completed" && job.output) {
            stopStreams();
            setPhase({
              name: "done",
              jobId,
              filename: job.output.filename,
              bytes: job.output.bytes,
              duration: job.output.duration,
              downloadUrl: `/api/download/${jobId}`,
            });
          } else if (job.status === "failed" || job.status === "expired") {
            stopStreams();
            setPhase({ name: "error", message: friendlyError(job.error?.code, job.error?.message), code: job.error?.code });
          } else if (job.status === "cancelled") {
            stopStreams();
            setPhase({ name: "idle" });
            setHint("Conversion cancelled.");
          } else {
            setPhase({ name: "working", jobId, status: job.status, stage: job.stage, progress: job.progress });
          }
        };

        // Prefer SSE for live progress; fall back to polling.
        let sseOk = false;
        const startPolling = async () => {
          if (pollRef.current) return;
          const tick = async () => {
            try {
              const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
              const d = await r.json();
              if (r.ok && d.job) applyJob(d.job);
              else if (r.status === 410) {
                stopStreams();
                setPhase({ name: "error", message: friendlyError("EXPIRED"), code: "EXPIRED" });
              }
            } catch {}
          };
          await tick();
          // No fake increments — server row is the source of truth.
          pollRef.current = window.setInterval(tick, 2000);
        };
        try {
          const es = new EventSource(`/api/jobs/${jobId}/events`);
          eventRef.current = es;
          es.onmessage = (ev) => {
            try {
              sseOk = true;
              applyJob(JSON.parse(ev.data));
            } catch {}
          };
          es.onerror = () => {
            es.close();
            if (eventRef.current === es) eventRef.current = null;
            if (!sseOk) void startPolling();
          };
        } catch {
          void startPolling();
        }
        // If SSE connects, no polling needed. Give it 3s to prove itself.
        window.setTimeout(() => {
          void sseOk;
        }, 3000);
      } catch {
        setPhase({ name: "error", message: "Network error starting conversion." });
      }
    },
    [bitrate, stopStreams]
  );

  const cancel = useCallback(async () => {
    const p = phase;
    if (p.name !== "working" || !p.jobId) return;
    stopStreams();
    try {
      await fetch(`/api/jobs/${p.jobId}/cancel`, { method: "POST" });
    } catch {}
    setPhase({ name: "idle" });
    setHint("Conversion cancelled.");
  }, [phase, stopStreams]);

  const reset = useCallback(() => {
    stopStreams();
    setUrl("");
    setHint(null);
    setPhase({ name: "idle" });
  }, [stopStreams]);

  const liveMessage =
    phase.name === "analyzing"
      ? "Checking URL…"
      : phase.name === "working"
        ? `${phase.stage} ${phase.progress}%`
        : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      {/* URL form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void analyze(url);
        }}
        className="mt-8"
      >
        <label htmlFor="video-url" className="sr-only">
          Video URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              id="video-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste video URL here"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (hint) setHint(null);
              }}
              className="w-full rounded-full border border-neutral-300 bg-white py-3 pl-5 pr-11 text-[15px] shadow-sm transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:focus:border-white"
            />
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setHint(null);
                }}
                aria-label="Clear URL"
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            )}
          </div>
          <Button type="submit" loading={phase.name === "analyzing"} className="shrink-0 px-7 py-3">
            Analyze
          </Button>
        </div>
      </form>
      <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-500">
        Only convert media you own or have permission to download. Files auto-delete after ~30 minutes.
      </p>

      {/* screen-reader live status */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage ?? (hint ? hint : "")}
      </div>

      {hint && phase.name === "idle" && (
        <p className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {hint}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {phase.name === "analyzing" && <MetadataSkeleton />}

        {phase.name === "ready" && (
          <div className="space-y-4">
            <MetadataCard meta={phase.meta} bitrate={bitrate} onBitrate={setBitrate} />
            <Button onClick={() => void startJob(phase.normalizedUrl)} className="w-full py-3.5 text-base">
              Convert to MP3 · {bitrate} kbps
            </Button>
          </div>
        )}

        {phase.name === "working" && (
          <div className="animate-rise rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium capitalize">{phase.status.replace(/_/g, " ")}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{phase.stage}</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={phase.progress} label="Conversion progress" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="danger" onClick={() => void cancel()}>
                Cancel conversion
              </Button>
            </div>
          </div>
        )}

        {phase.name === "done" && (
          <div className="animate-rise rounded-2xl border border-green-200 bg-green-50/60 p-5 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">✓ Conversion complete</p>
            <p className="mt-1 break-all text-sm font-medium">{phase.filename}</p>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {formatBytes(phase.bytes)}
              {phase.duration != null ? ` · ${Math.floor(phase.duration / 60)}:${String(Math.floor(phase.duration % 60)).padStart(2, "0")}` : ""}
              {" · "}expires soon
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={phase.downloadUrl}
                download={phase.filename}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                ⬇ Download MP3
              </a>
              <Button variant="secondary" onClick={reset} className="flex-1">
                Convert another
              </Button>
            </div>
          </div>
        )}

        {phase.name === "error" && (
          <div className="animate-rise rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/30" role="alert">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Something didn&apos;t work</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-200">{phase.message}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={reset}>
                Try another URL
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200/70 dark:border-neutral-800/70">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="VideoToMP3 home">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          VideoToMP3
        </a>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <a href="#how" className="hidden rounded-full px-3 py-1.5 text-neutral-500 transition hover:text-neutral-900 sm:inline dark:text-neutral-400 dark:hover:text-white">
            How it works
          </a>
          <a href="#privacy" className="hidden rounded-full px-3 py-1.5 text-neutral-500 transition hover:text-neutral-900 sm:inline dark:text-neutral-400 dark:hover:text-white">
            Privacy
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
