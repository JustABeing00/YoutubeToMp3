/**
 * Pure hostname blocklist — NO node: imports, safe for client + server bundles.
 * DNS-resolution checks live in ssrf.ts (server-only).
 */

const LOCAL_NAMES = new Set(["localhost", "ip6-localhost"]);

export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (LOCAL_NAMES.has(h)) return true;
  if (h === "metadata.google.internal") return true;
  if (h === "169.254.169.254") return true;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return true;
  // IPv4 literal?
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const parts = v4.slice(1).map(Number);
    if (parts.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a >= 224) return true;
    return false;
  }
  // IPv6 literal (bracketless as URL.hostname strips brackets)?
  if (h.includes(":")) {
    const low = h.toLowerCase();
    if (low === "::1" || low === "::ffff:127.0.0.1" || low === "::") return true;
    if (low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") || low.startsWith("fec0")) return true;
    return false;
  }
  return false;
}
