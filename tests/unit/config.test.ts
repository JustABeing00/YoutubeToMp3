import { describe, expect, it, afterEach } from "vitest";
import { getConfig, _resetConfigCache, ALLOWED_BITRATES } from "@/lib/config";

describe("config parsing", () => {
  afterEach(() => {
    delete process.env.MAX_CONCURRENT_JOBS;
    _resetConfigCache();
  });

  it("applies defaults", () => {
    _resetConfigCache();
    const c = getConfig();
    expect(c.MAX_CONCURRENT_JOBS).toBe(2);
    expect(c.JOB_EXPIRATION_MINUTES).toBe(30);
  });

  it("parses env overrides and rejects garbage", () => {
    process.env.MAX_CONCURRENT_JOBS = "4";
    _resetConfigCache();
    expect(getConfig().MAX_CONCURRENT_JOBS).toBe(4);
    process.env.MAX_CONCURRENT_JOBS = "not-a-number";
    _resetConfigCache();
    expect(() => getConfig()).toThrow();
  });

  it("pins the bitrate allowlist", () => {
    expect([...ALLOWED_BITRATES]).toEqual([128, 192, 256, 320]);
  });
});
