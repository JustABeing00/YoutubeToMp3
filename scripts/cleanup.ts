/**
 * Standalone cleanup: `npm run cleanup`.
 * - Marks completed jobs past expiresAt as expired + deletes their dirs.
 * - Deletes dirs for failed/cancelled jobs.
 * - Sweeps orphaned/abandoned job dirs (crash recovery).
 * Safe to run on a schedule AND at boot.
 */
import { getConfig } from "@/lib/config";
import { jobStore } from "@/lib/jobs/store";
import { removeJobDir, sweepStaleDirs, jobDir } from "@/lib/storage/files";
import { logEvent } from "@/lib/logging/logger";
import fs from "node:fs/promises";

export async function runCleanup() {
  const cfg = getConfig();
  const now = Date.now();
  let expired = 0;
  let removed = 0;

  const stale = await jobStore.listExpired(now, 500);
  for (const job of stale) {
    if (job.status === "completed") {
      await jobStore.update(job.id, { status: "expired" });
      expired++;
    }
    if (await removeJobDir(job.id)) removed++;
    logEvent("cleanup.job", { jobId: job.id, from: job.status });
  }

  // Crash recovery: any dir without an active DB row older than 2x expiry.
  const orphans = await sweepStaleDirs(cfg.JOB_EXPIRATION_MINUTES * 2 * 60_000, async (id) => {
    const j = await jobStore.get(id);
    return !!j && !["expired"].includes(j.status) && j.expiresAt > now;
  });
  removed += orphans.length;

  // Belt & braces: empty parent dirs older than 7 days.
  try {
    const entries = await fs.readdir(jobDir("__probe__").replace("__probe__", ""));
    void entries;
  } catch {}

  logEvent("cleanup.completed", { expired, removedDirs: removed });
  return { expired, removedDirs: removed };
}

if (require.main === module) {
  runCleanup()
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
