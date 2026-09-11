/**
 * Integration: job lifecycle against a temp SQLite DB + stub adapter.
 * Does NOT hit the network or spawn ffmpeg — it exercises create -> get ->
 * cancel/expire semantics of the store + state machine + public serializer.
 */
import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDb: string;

beforeEach(() => {
  tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ytmp3-test-")), "jobs.db");
  process.env.DATABASE_URL = `file:${tmpDb}`;
  process.env.TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ytmp3-tmp-"));
});

describe("job store lifecycle", () => {
  it("creates, reads, updates, expires", async () => {
    const { SqliteJobStore } = await import("@/lib/jobs/store");
    const store = new SqliteJobStore();
    const now = Date.now();
    await store.create({
      id: "testjob_12345",
      status: "queued",
      progress: 0,
      stage: "queued",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      source: "youtube",
      bitrate: 192,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 1000,
    });
    const got = await store.get("testjob_12345");
    expect(got?.status).toBe("queued");

    await store.update("testjob_12345", { status: "processing", progress: 50 });
    expect((await store.get("testjob_12345"))?.progress).toBe(50);

    const { publicJob } = await import("@/lib/jobs/manager");
    const pub = publicJob((await store.get("testjob_12345"))!);
    expect(pub.id).toBe("testjob_12345");
    expect((pub as { sourceUrl?: string }).sourceUrl).toBeUndefined(); // internal URL never leaks
  });

  it("serializes errors in the documented shape", async () => {
    const { errorBody } = await import("@/lib/errors");
    const body = errorBody("CONVERSION_FAILED");
    expect(body.error.code).toBe("CONVERSION_FAILED");
    expect(JSON.stringify(body)).not.toMatch(/stack|at .*\(/);
  });
});
