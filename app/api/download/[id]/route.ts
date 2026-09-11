import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { assertJobId } from "@/lib/security/path";
import { errorBody } from "@/lib/errors";
import { jobStore } from "@/lib/jobs/store";
import { outputFile } from "@/lib/storage/files";
import { logEvent } from "@/lib/logging/logger";

export const runtime = "nodejs";

/** Secure streaming download. Verifies ownership, expiry, and streams (no full buffering). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  // RFC 5987 filename* for unicode titles.
  const ascii = job.output.filename.replace(/[^\x20-\x7E]/g, "").slice(0, 100) || "audio.mp3";
  return new Response(webStream, {
    headers: {
      "content-type": "audio/mpeg",
      "content-length": String(stat.size),
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(job.output.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
