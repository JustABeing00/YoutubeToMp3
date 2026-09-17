import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "@/lib/jobs/nanoid";
import { extForFormat, getConfig } from "@/lib/config";
import { canTransition, stageText, type InputMetadata, type Job } from "@/lib/jobs/types";
import { jobStore } from "@/lib/jobs/store";
import { ensureJobDirs, outputFile, outputDir, sourceDir, removeJobDir, removeSourceFiles } from "@/lib/storage/files";
import { pickAdapter, AdapterError } from "@/lib/media/youtube-adapter";
import { cacheKey, readCache, videoIdOf, writeCache } from "@/lib/jobs/cache";
import { breakerAllows, breakerReport } from "@/lib/jobs/breaker";
import { remuxAudio, transcodeToMp3, verifyAudio } from "@/lib/ffmpeg/transcode";
import { sanitizeFilename } from "@/lib/validation/filename";
import { logEvent, logError } from "@/lib/logging/logger";

/**
 * In-process job queue. Single-container friendly:
 * - `enqueue()` creates the row and kicks the pump (non-blocking).
 * - pump runs up to MAX_CONCURRENT_JOBS conversions concurrently.
 * - cancellation is cooperative via AbortController per job.
 *
 * For multi-machine scale, replace this file's queue with BullMQ/Redis —
 * the API routes only call enqueue()/cancel()/get(), so they won't change.
 */

const aborters = new Map<string, AbortController>();
const running = new Set<string>();
const sseListeners = new Map<string, Set<(job: Job) => void>>();

export function subscribe(jobId: string, fn: (job: Job) => void): () => void {
  let set = sseListeners.get(jobId);
  if (!set) {
    set = new Set();
    sseListeners.set(jobId, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

async function setJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const cur = await jobStore.get(id);
  if (!cur) return null;
  if (patch.status && patch.status !== cur.status && !canTransition(cur.status, patch.status)) {
    // Race (e.g. cancel landed first) — keep the first terminal state.
    return cur;
  }
  const next = await jobStore.update(id, {
    ...patch,
    stage: patch.stage ?? (patch.status ? stageText(patch.status) : cur.stage),
  });
  if (next) sseListeners.get(id)?.forEach((fn) => { try { fn(next); } catch {} });
  return next;
}

export async function enqueue(opts: {
  sourceUrl: string;
  source: string;
  bitrate: number;
  format?: Job["format"];
  ip: string;
  input?: InputMetadata;
}): Promise<Job> {
  const cfg = getConfig();
  const now = Date.now();
  const format = opts.format === "m4a" || opts.format === "opus" ? opts.format : "mp3";
  const job: Job = {
    id: nanoid(16),
    status: "queued",
    progress: 0,
    stage: stageText("queued"),
    sourceUrl: opts.sourceUrl,
    source: opts.source,
    bitrate: opts.bitrate,
    format,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + cfg.JOB_EXPIRATION_MINUTES * 60_000,
    input: opts.input,
  };
  await jobStore.create({ ...job, ip: opts.ip } as Job & { ip: string });
  logEvent("job.created", { jobId: job.id, source: job.source, bitrate: job.bitrate, format: job.format });
  void pump();
  return job;
}

export async function cancelJob(id: string): Promise<Job | null> {
  const cur = await jobStore.get(id);
  if (!cur) return null;
  if (["completed", "failed", "cancelled", "expired"].includes(cur.status)) return cur;
  aborters.get(id)?.abort();
  const next = await setJob(id, { status: "cancelled", progress: cur.progress, errorMessage: "Cancelled by user." });
  await removeJobDir(id);
  logEvent("job.cancelled", { jobId: id });
  return next;
}

function pump() {
  const cfg = getConfig();
  // fire-and-forget; each active job handled in its own async task
  void (async () => {
    if (running.size >= cfg.MAX_CONCURRENT_JOBS) return;
    const active = await jobStore.listActive();
    const next = active.find((j) => j.status === "queued" && !running.has(j.id));
    if (!next) return;
    running.add(next.id);
    try {
      await runJob(next.id);
    } finally {
      running.delete(next.id);
      // cascade: maybe another queued job can start now
      void pump();
    }
  })();
}

async function runJob(id: string) {
  const cfg = getConfig();
  const started = Date.now();
  const aborter = new AbortController();
  aborters.set(id, aborter);
  const signal = aborter.signal;
  try {
    let job = await jobStore.get(id);
    if (!job || job.status !== "queued") return;
    if (signal.aborted) return;

    await ensureJobDirs(id);
    const adapter = pickAdapter(job.sourceUrl);
    const maxBytes = cfg.MAX_FILE_MB * 1024 * 1024;
    const timeoutMs = cfg.PROCESSING_TIMEOUT_MIN * 60_000;

    // BREAKER — after repeated upstream blocks, fail fast with a clear
    // cooldown message instead of hammering (hammering deepens throttling).
    if (job.source === "youtube" && !breakerAllows()) {
      await setJob(id, {
        status: "failed",
        errorCode: "RATE_LIMITED",
        errorMessage: "YouTube downloads are cooling down after repeated blocks. Please retry in a few minutes.",
      });
      return;
    }

    // ANALYZING — refresh metadata inside the worker so progress is truthful
    // even when the job waited in the queue after /api/analyze.
    await setJob(id, { status: "analyzing", progress: 3 });
    logEvent("job.started", { jobId: id });
    try {
      const meta = await adapter.getMetadata(job.sourceUrl);
      if (meta.duration != null && meta.duration > cfg.MAX_INPUT_DURATION_SEC) {
        throw new AdapterError("OUTPUT_TOO_LARGE", `duration ${meta.duration}s exceeds limit`);
      }
      job = (await setJob(id, {
        input: { title: meta.title, duration: meta.duration, thumbnail: meta.thumbnail, source: meta.source, author: meta.author },
        progress: 8,
      })) ?? job;
    } catch (e) {
      if (signal.aborted) return;
      throw e;
    }

    // CACHE — repeat conversions skip YouTube entirely (seconds, not minutes).
    // Verified BEFORE any status transition: a corrupt entry is deleted and
    // the job falls through to the normal pipeline (still analyzing→…).
    if (job.source === "youtube") {
      const vid = videoIdOf(job.sourceUrl);
      const format = job.format ?? "mp3";
      const key = vid && cacheKey(vid, job.bitrate, format);
      const hit = key ? await readCache(key) : null;
      if (hit && key) {
        try {
          const title = (await jobStore.get(id))?.input?.title ?? "audio";
          const filename = sanitizeFilename(title, "audio", extForFormat(format));
          const outPath = outputFile(id, filename);
          await fs.mkdir(outputDir(id), { recursive: true });
          await fs.copyFile(hit, outPath);
          const verified = await verifyAudio(outPath);
          // Walk the legal transition chain (analyzing→retrieving→processing→
          // finalizing→completed) so status subscribers see a truthful sprint.
          await setJob(id, { status: "retrieving", progress: 40 });
          await setJob(id, { status: "processing", progress: 70 });
          await setJob(id, { status: "finalizing", progress: 94 });
          await setJob(id, {
            status: "completed",
            progress: 100,
            output: { filename, bytes: verified.bytes, duration: verified.duration, bitrate: job.bitrate, format },
          });
          breakerReport(true);
          logEvent("job.completed", { jobId: id, cached: true, bytes: verified.bytes, format });
          return;
        } catch {
          await fs.rm(hit, { force: true }).catch(() => {});
        }
      }
    }

    // RETRIEVING — real downloader percentage 8% -> 35%.
    await setJob(id, { status: "retrieving", progress: 10 });
    const dlTarget = path.join(sourceDir(id), "input");
    let downloadedPath: string;
    try {
      const dl = await adapter.downloadSource(job.sourceUrl, dlTarget, {
        timeoutMs,
        maxBytes,
        onProgress: (p) => {
          // intentionally not awaited — progress writes are best-effort
          void setJob(id, { progress: Math.round(10 + (p / 100) * 25) });
        },
      });
      downloadedPath = dl.filePath;
    } catch (e) {
      if (signal.aborted) return;
      throw e;
    }
    logEvent("media.retrieved", { jobId: id });

    // PROCESSING — mp3: real ffmpeg percentage 35% -> 90%.
    // m4a/opus: stream copy is near-instant, walk straight through.
    await setJob(id, { status: "processing", progress: 38 });
    const title = (await jobStore.get(id))?.input?.title ?? "audio";
    const format = job.format ?? "mp3";
    const filename = sanitizeFilename(title, "audio", extForFormat(format));
    const outPath = outputFile(id, filename);
    await fs.mkdir(outputDir(id), { recursive: true });
    try {
      const inputMeta = (await jobStore.get(id))?.input;
      if (format === "mp3") {
        await transcodeToMp3({
          inputPath: downloadedPath,
          outputPath: outPath,
          bitrate: job.bitrate,
          timeoutMs,
          expectedDurationSec: inputMeta?.duration ?? null,
          abortSignal: signal,
          onProgress: ({ percent }) => {
            void setJob(id, { progress: Math.round(38 + (percent / 100) * 52) });
          },
        });
      } else {
        await setJob(id, { progress: 55 });
        await remuxAudio({ inputPath: downloadedPath, outputPath: outPath, timeoutMs, abortSignal: signal });
        await setJob(id, { progress: 88 });
      }
    } catch (e) {
      if (signal.aborted || (e as Error & { code?: string })?.code === "CANCELLED") return;
      throw e;
    }
    await removeSourceFiles(id); // source no longer needed — delete early
    logEvent("conversion.completed", { jobId: id, durationMs: Date.now() - started });

    // FINALIZING — verify output before declaring success.
    await setJob(id, { status: "finalizing", progress: 94 });
    const stat = await fs.stat(outPath);
    if (stat.size > maxBytes) {
      await removeJobDir(id);
      throw new AdapterError("OUTPUT_TOO_LARGE", "output exceeds size limit");
    }
    const verified = await verifyAudio(outPath);
    const totalMs = Date.now() - started;
    // Persist successful YouTube conversions for instant repeat serving.
    // Skipped automatically when CACHE_MAX_MB=0 (ephemeral free-tier disk).
    if (job.source === "youtube") {
      const vid = videoIdOf(job.sourceUrl);
      const key = vid && cacheKey(vid, job.bitrate, job.format ?? "mp3");
      if (key) await writeCache(key, outPath).catch(() => {});
    }
    await setJob(id, {
      status: "completed",
      progress: 100,
      output: { filename, bytes: verified.bytes, duration: verified.duration, bitrate: job.bitrate, format: job.format ?? "mp3" },
    });
    breakerReport(true);
    logEvent("job.completed", { jobId: id, durationMs: totalMs, bytes: verified.bytes, format: job.format ?? "mp3" });
  } catch (e) {
    const cur = await jobStore.get(id);
    if (!cur || ["cancelled", "completed"].includes(cur.status)) return;
    const code = e instanceof AdapterError ? e.code : "SERVER_ERROR";
    const message =
      e instanceof AdapterError ? e.message : "Unexpected error during conversion.";
    if (cur.source === "youtube" && ["RETRIEVAL_FAILED", "TIMEOUT", "SOURCE_UNAVAILABLE"].includes(code)) {
      breakerReport(false);
    }
    await setJob(id, { status: "failed", errorCode: code, errorMessage: message });
    logError("job.failed", e, { jobId: id, code });
    await removeJobDir(id).catch(() => {});
  } finally {
    aborters.delete(id);
  }
}

/** Returned to the browser — strips internal paths/IPs. */
export function publicJob(job: Job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    bitrate: job.bitrate,
    format: job.format ?? "mp3",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    error: job.errorCode ? { code: job.errorCode, message: job.errorMessage ?? "Conversion failed." } : undefined,
    input: job.input,
    output: job.output,
    downloadUrl: job.status === "completed" ? `/api/download/${job.id}` : undefined,
  };
}
