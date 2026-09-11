import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Job, JobStore, JobStatus } from "./types";

/**
 * SQLite job store on Node's BUILT-IN node:sqlite (no native build tools,
 * works on Windows/macOS/Linux as-is). Stores metadata ONLY — media files
 * live on the filesystem (see lib/storage). Table is created on first use
 * so there is no separate migration step (scripts/migrate.ts reuses this).
 */

function dbPathFromUrl(url: string): string {
  if (url.startsWith("file:")) {
    const p = url.slice("file:".length);
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  }
  return path.resolve(process.cwd(), "./data/jobs.db");
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const raw = process.env.DATABASE_URL ?? "file:./data/jobs.db";
  const file = dbPathFromUrl(raw);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT '',
      sourceUrl TEXT NOT NULL,
      source TEXT NOT NULL,
      bitrate INTEGER NOT NULL,
      ip TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      errorCode TEXT,
      errorMessage TEXT,
      input TEXT,
      output TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_ip ON jobs(ip);
  `);
  return db;
}

/** Test-only: point the singleton at a fresh temp DB. */
export function _resetDbForTests() {
  try {
    db?.close();
  } catch {}
  db = null;
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    status: row.status as JobStatus,
    progress: row.progress as number,
    stage: (row.stage as string) ?? "",
    sourceUrl: row.sourceUrl as string,
    source: row.source as string,
    bitrate: row.bitrate as number,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
    expiresAt: row.expiresAt as number,
    errorCode: (row.errorCode as string) ?? undefined,
    errorMessage: (row.errorMessage as string) ?? undefined,
    input: row.input ? (JSON.parse(row.input as string) as Job["input"]) : undefined,
    output: row.output ? (JSON.parse(row.output as string) as Job["output"]) : undefined,
  };
}

export class SqliteJobStore implements JobStore {
  async create(job: Job & { ip?: string }): Promise<void> {
    getDb()
      .prepare(
        `INSERT INTO jobs (id,status,progress,stage,sourceUrl,source,bitrate,ip,createdAt,updatedAt,expiresAt,errorCode,errorMessage,input,output)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        job.id,
        job.status,
        job.progress,
        job.stage,
        job.sourceUrl,
        job.source,
        job.bitrate,
        (job as { ip?: string }).ip ?? "",
        job.createdAt,
        job.updatedAt,
        job.expiresAt,
        job.errorCode ?? null,
        job.errorMessage ?? null,
        job.input ? JSON.stringify(job.input) : null,
        job.output ? JSON.stringify(job.output) : null
      );
  }

  async get(id: string): Promise<Job | null> {
    const row = getDb().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? rowToJob(row) : null;
  }

  async update(id: string, patch: Partial<Job>): Promise<Job | null> {
    const cur = await this.get(id);
    if (!cur) return null;
    const next: Job = { ...cur, ...patch, id: cur.id, updatedAt: patch.updatedAt ?? Date.now() };
    getDb()
      .prepare(
        `UPDATE jobs SET status=?, progress=?, stage=?, errorCode=?, errorMessage=?, input=?, output=?, updatedAt=?, expiresAt=? WHERE id=?`
      )
      .run(
        next.status,
        Math.max(0, Math.min(100, Math.round(next.progress))),
        next.stage,
        next.errorCode ?? null,
        next.errorMessage ?? null,
        next.input ? JSON.stringify(next.input) : null,
        next.output ? JSON.stringify(next.output) : null,
        next.updatedAt,
        next.expiresAt,
        id
      );
    return next;
  }

  async listActive(): Promise<Job[]> {
    const rows = getDb()
      .prepare(
        `SELECT * FROM jobs WHERE status IN ('queued','analyzing','retrieving','processing','finalizing') ORDER BY createdAt ASC`
      )
      .all() as Record<string, unknown>[];
    return rows.map(rowToJob);
  }

  async countActiveByIp(ip: string): Promise<number> {
    const row = getDb()
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE ip = ? AND status IN ('queued','analyzing','retrieving','processing','finalizing')`)
      .get(ip) as unknown as { n: number };
    return row.n;
  }

  async countRecentByIp(ip: string, sinceMs: number): Promise<number> {
    const row = getDb().prepare(`SELECT COUNT(*) as n FROM jobs WHERE ip = ? AND createdAt >= ?`).get(ip, sinceMs) as unknown as {
      n: number;
    };
    return row.n;
  }

  async listExpired(now = Date.now(), limit = 100): Promise<Job[]> {
    const rows = getDb().prepare(`SELECT * FROM jobs WHERE expiresAt <= ? AND status != 'expired' LIMIT ?`).all(now, limit) as Record<
      string,
      unknown
    >[];
    return rows.map(rowToJob);
  }

  async delete(id: string): Promise<void> {
    getDb().prepare(`DELETE FROM jobs WHERE id = ?`).run(id);
  }
}

export const jobStore = new SqliteJobStore();
