import { describe, expect, it, beforeEach } from "vitest";
import { isBlockedHost } from "@/lib/security/hosts";
import { safeJoin, assertJobId } from "@/lib/security/path";
import { checkRate, _resetRateLimits } from "@/lib/rate-limit/limiter";

describe("SSRF host blocking", () => {
  it("blocks loopback, private, link-local, metadata", () => {
    for (const h of ["localhost", "127.0.0.1", "::1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "169.254.169.254", "0.0.0.0"]) {
      expect(isBlockedHost(h), h).toBe(true);
    }
  });

  it("allows public hosts", () => {
    expect(isBlockedHost("www.youtube.com")).toBe(false);
    expect(isBlockedHost("youtu.be")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
  });
});

describe("path traversal", () => {
  it("rejects ../ escapes", () => {
    expect(() => safeJoin("/tmp/jobs/abc", "../../etc/passwd")).toThrow();
    expect(() => safeJoin("/tmp/jobs/abc", "/etc/passwd")).toThrow();
    expect(safeJoin("/tmp/jobs/abc", "output", "song.mp3")).toContain("song.mp3");
  });

  it("rejects malformed job ids", () => {
    expect(() => assertJobId("../../etc")).toThrow();
    expect(() => assertJobId("a")).toThrow();
    expect(() => assertJobId("ok-id_123ABC")).not.toThrow();
  });
});

describe("rate limiter", () => {
  beforeEach(() => _resetRateLimits());

  it("allows up to the limit then blocks", () => {
    for (let i = 0; i < 5; i++) expect(checkRate("k", 5, 60_000).allowed).toBe(true);
    expect(checkRate("k", 5, 60_000).allowed).toBe(false);
  });

  it("isolates keys", () => {
    checkRate("a", 1, 60_000);
    expect(checkRate("b", 1, 60_000).allowed).toBe(true);
  });
});

describe("command injection shape", () => {
  it("documents the invariant: user input never becomes shell", async () => {
    // The adapters use spawn(cmd, argsArray) — there is no shell string to test.
    // This test pins the validation side: hostile URLs are rejected before spawn.
    const { validateUrl } = await import("@/lib/validation/url");
    expect(validateUrl("https://www.youtube.com/watch?v=x$(whoami)").ok).toBe(false);
    expect(validateUrl("https://www.youtube.com/watch?v=x`id`").ok).toBe(false);
  });
});
