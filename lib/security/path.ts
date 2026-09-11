import path from "node:path";

/** Prevent path traversal: job files must stay inside the job directory. */
export function safeJoin(base: string, ...segments: string[]): string {
  const resolved = path.resolve(base, ...segments);
  const baseResolved = path.resolve(base);
  if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) {
    throw Object.assign(new Error("path-traversal"), { code: "NOT_FOUND" });
  }
  return resolved;
}

export function assertJobId(id: string): void {
  // nanoid-style: 8-64 chars, URL-safe alphabet only.
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    throw Object.assign(new Error("bad-job-id"), { code: "NOT_FOUND" });
  }
}
