import dns from "node:dns/promises";
import net from "node:net";
import { isBlockedHost } from "./hosts";

export { isBlockedHost };

/**
 * SSRF protection, layered:
 *  1. isBlockedHost() — sync check for literal IPs / localhost names (client + server).
 *  2. assertUrlSafe() — server-side DNS resolution; rejects private/loopback/link-local.
 *
 * Never fetch user URLs without calling assertUrlSafe() first.
 */

/** Resolve hostname and ensure no address is private. Throws on failure. */
export async function assertUrlSafe(normalizedUrl: string): Promise<void> {
  const url = new URL(normalizedUrl);
  const host = url.hostname.toLowerCase();
  if (isBlockedHost(host)) throw Object.assign(new Error("blocked-host"), { code: "INVALID_URL" });
  if (net.isIP(host)) return; // already checked above
  let records: string[];
  try {
    records = await dns.resolve4(host).catch(() => []);
    const v6 = await dns.resolve6(host).catch(() => []);
    records = [...records, ...v6];
  } catch {
    throw Object.assign(new Error("dns-failed"), { code: "SOURCE_UNAVAILABLE" });
  }
  if (records.length === 0) return; // let the downloader surface NXDOMAIN naturally
  for (const ip of records) {
    if (isBlockedHost(ip)) {
      throw Object.assign(new Error(`resolved-to-private:${ip}`), { code: "INVALID_URL" });
    }
  }
}
