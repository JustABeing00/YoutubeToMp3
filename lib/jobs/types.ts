export type JobStatus =
  | "queued"
  | "analyzing"
  | "retrieving"
  | "processing"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface InputMetadata {
  title: string;
  duration: number | null;
  thumbnail: string | null;
  source: string;
  author: string | null;
}

export interface OutputMetadata {
  filename: string;
  bytes: number;
  duration: number | null;
  bitrate: number;
  /** mp3 = re-encoded; m4a/opus = stream copy. Defaults to mp3 for old rows. */
  format: "mp3" | "m4a" | "opus";
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  stage: string; // human-readable status text
  sourceUrl: string; // normalized URL (query stripped by logger)
  source: string; // youtube | direct
  bitrate: number;
  /** Output container. Optional for backward compat (old rows = mp3). */
  format?: "mp3" | "m4a" | "opus";
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  errorCode?: string;
  errorMessage?: string;
  input?: InputMetadata;
  output?: OutputMetadata;
}

export interface JobStore {
  create(job: Job): Promise<void>;
  get(id: string): Promise<Job | null>;
  update(id: string, patch: Partial<Job>): Promise<Job | null>;
  listActive(): Promise<Job[]>;
  countActiveByIp(ip: string): Promise<number>;
  delete(id: string): Promise<void>;
}

/** Legal state transitions — enforced in one place, tested by unit tests. */
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ["analyzing", "retrieving", "cancelled", "failed"],
  analyzing: ["retrieving", "failed", "cancelled"],
  retrieving: ["processing", "failed", "cancelled"],
  processing: ["finalizing", "failed", "cancelled"],
  finalizing: ["completed", "failed", "cancelled"],
  completed: ["expired"],
  failed: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const TERMINAL = new Set<JobStatus>(["completed", "failed", "cancelled", "expired"]);

export function stageText(status: JobStatus): string {
  switch (status) {
    case "queued":
      return "Waiting for a processing slot…";
    case "analyzing":
      return "Analyzing video…";
    case "retrieving":
      return "Retrieving source…";
    case "processing":
      return "Processing audio…";
    case "finalizing":
      return "Finalizing audio…";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
  }
}
