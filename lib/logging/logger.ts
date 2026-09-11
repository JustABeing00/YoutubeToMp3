import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  // Never log full URLs with tracking params, secrets, or request bodies.
  // Callers must pass { jobId, event, ... } explicitly.
  base: { service: "videotomp3" },
});

export function logEvent(event: string, fields: Record<string, unknown> = {}) {
  logger.info({ event, ...redact(fields) });
}

export function logError(event: string, err: unknown, fields: Record<string, unknown> = {}) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ event, errorMessage: message, ...redact(fields) });
}

function redact(fields: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (/token|secret|cookie|auth/i.test(k)) continue;
    if (k === "url" && typeof v === "string") {
      try {
        const u = new URL(v);
        out[k] = `${u.hostname}${u.pathname}`; // strip query — may contain tracking IDs
      } catch {
        out[k] = "[unparseable-url]";
      }
      continue;
    }
    out[k] = v;
  }
  return out;
}
