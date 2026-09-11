import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";

export function jobsRoot(): string {
  const { TEMP_DIR } = getConfig();
  return path.resolve(process.cwd(), TEMP_DIR, "jobs");
}

export function jobDir(jobId: string): string {
  return path.join(jobsRoot(), jobId);
}

export function sourceDir(jobId: string): string {
  return path.join(jobDir(jobId), "source");
}

export function outputDir(jobId: string): string {
  return path.join(jobDir(jobId), "output");
}

export function outputFile(jobId: string, filename: string): string {
  // filename is always produced by sanitizeFilename(), never user input.
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("unsafe filename");
  }
  return path.join(outputDir(jobId), filename);
}

export async function ensureJobDirs(jobId: string): Promise<void> {
  await fs.mkdir(sourceDir(jobId), { recursive: true });
  await fs.mkdir(outputDir(jobId), { recursive: true });
}

/** Best-effort recursive delete — cleanup must never throw. */
export async function removeJobDir(jobId: string): Promise<boolean> {
  try {
    await fs.rm(jobDir(jobId), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function removeSourceFiles(jobId: string): Promise<void> {
  try {
    await fs.rm(sourceDir(jobId), { recursive: true, force: true });
  } catch {}
}

export async function outputExists(jobId: string, filename: string): Promise<string | null> {
  try {
    const p = outputFile(jobId, filename);
    const st = await fs.stat(p);
    if (!st.isFile() || st.size === 0) return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Crash-resilient sweeper: removes job dirs whose DB row is terminal/expired
 * or whose mtime is older than maxAgeMs (abandoned uploads / killed workers).
 */
export async function sweepStaleDirs(maxAgeMs: number, isKnownJob?: (id: string) => Promise<boolean>): Promise<string[]> {
  const removed: string[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(jobsRoot());
  } catch {
    return removed;
  }
  const now = Date.now();
  for (const id of entries) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) continue;
    const dir = jobDir(id);
    try {
      if (isKnownJob && (await isKnownJob(id))) continue;
      const st = await fs.stat(dir);
      if (now - st.mtimeMs > maxAgeMs) {
        await fs.rm(dir, { recursive: true, force: true });
        removed.push(id);
      }
    } catch {
      continue;
    }
  }
  return removed;
}
