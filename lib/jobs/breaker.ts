import { getConfig } from "@/lib/config";

/**
 * In-memory circuit breaker for YouTube egress. After BREAKER_THRESHOLD
 * consecutive upstream failures (403s, timeouts, unavailable), new YouTube
 * jobs fail fast with a clear cooldown message instead of hammering an
 * endpoint that is already rejecting us — hammering deepens throttling.
 * Any success resets the breaker. Resets on restart (fail-open by design).
 */

let consecFails = 0;
let trippedUntil = 0;

export function _resetBreaker(): void {
  consecFails = 0;
  trippedUntil = 0;
}

export function breakerAllows(now = Date.now()): boolean {
  return now >= trippedUntil;
}

/** For status/debug only. */
export function breakerState(now = Date.now()): { consecFails: number; tripped: boolean; retryInMs: number } {
  return { consecFails, tripped: now < trippedUntil, retryInMs: Math.max(0, trippedUntil - now) };
}

export function breakerReport(success: boolean, now = Date.now()): void {
  if (success) {
    consecFails = 0;
    trippedUntil = 0;
    return;
  }
  consecFails++;
  const cfg = getConfig();
  if (consecFails >= cfg.BREAKER_THRESHOLD) {
    trippedUntil = now + cfg.BREAKER_COOLDOWN_MIN * 60_000;
  }
}
