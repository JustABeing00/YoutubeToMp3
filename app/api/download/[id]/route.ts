import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { assertJobId } from "@/lib/security/path";
import { errorBody } from "@/lib/errors";
import { jobStore } from "@/lib/jobs/store";
import { outputFile } from "@/lib/storage/files";
import { mimeForFormat } from "@/lib/config";
import { logEvent } from "@/lib/logging/logger";

export const runtime = "nodejs";

function mimeFor(jobFormat: string | undefined, filename: string): string {
  if (jobFormat === "m4a" || jobFormat === "opus") return mimeForFormat(jobFormat);
  if (filename.endsWith(".m4a")) return "audio/mp4";
  if (filename.endsWith(".opus")) return "audio/ogg";
  return "audio/mpeg";
}

/** Secure streaming download. Verifies ownership, expiry, streams (no full buffering). Supports Range + HEAD for resumable mobile downloads through the edge proxy. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    assertJobId(id);
  } catch {
    return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  }
  const job = await jobStore.get(id);
  if (!job) return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  if (job.status !== "completed" || !job.output) {
    if (job.status === "expired" || Date.now() > job.expiresAt) {
      return NextResponse.json(errorBody("EXPIRED"), { status: 410 });
    }
    return NextResponse.json(errorBody("CONFLICT", "conversion not ready"), { status: 409 });
  }
  if (Date.now() > job.expiresAt) return NextResponse.json(errorBody("EXPIRED"), { status: 410 });

  let filePath: string;
  try {
    filePath = outputFile(id, job.output.filename);
  } catch {
    return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  }
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size === 0) throw new Error("missing");
  } catch {
    return NextResponse.json(errorBody("EXPIRED"), { status: 410 });
  }

  const format = (job.output as { format?: string }).format ?? (job as { format?: string }).format ?? "mp3";
  const mime = mimeFor(format, job.output.filename);
  // RFC 5987 filename* for unicode titles.
  const asciiBase = job.output.filename.replace(/\.[a-z0-9]+$/i, "").replace(/[^\x20-\x7E]/g, "").slice(0, 100) || "audio";
  const ext = job.output.filename.split(".").pop() ?? "mp3";
  const ascii = `${asciiBase}.${ext}`;
  const etag = `"${id}-${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  const common = {
    "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(job.output.filename)}`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
    etag,
  };

  if (req.method === "HEAD") {
    return new Response(null, { headers: { "content-type": mime, "content-length": String(stat.size), ...common } });
  }

  // Single-range requests (mobile resume / edge proxy chunking).
  const range = req.headers.get("range");
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    if (m) {
      const total = stat.size;
      const start = m[1] === "" ? Math.max(0, total - Number(m[2] || total)) : Number(m[1]);
      const end = m[2] === "" ? total - 1 : Math.min(total - 1, Number(m[2]));
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start && start < total) {
        logEvent("download.served", { jobId: id, bytes: end - start + 1, range: true });
        const stream = fs.createReadStream(filePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (e) => controller.error(e));
          },
          cancel() {
            stream.destroy();
          },
        });
        return new Response(webStream, {
          status: 206,
          headers: {
            "content-type": mime,
            "content-length": String(end - start + 1),
            "content-range": `bytes ${start}-${end}/${total}`,
            ...common,
          },
        });
      }
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    }
  }

  logEvent("download.served", { jobId: id, bytes: stat.size });
  const stream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (e) => controller.error(e));
    },
    cancel() {
      stream.destroy();
    },
  });
  // RFC 5987 filename* for unicode titles (ascii computed above).
  return new Response(webStream, {
    headers: {
      "content-type": mime,
      "content-length": String(stat.size),
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(job.output.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "accept-ranges": "bytes",
      etag,
    },
  });
}
