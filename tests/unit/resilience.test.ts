import { describe, expect, it } from "vitest";
import { parseOEmbed } from "@/lib/media/oembed";
import { cacheKey, videoIdOf } from "@/lib/jobs/cache";
import { _resetBreaker, breakerAllows, breakerReport, breakerState } from "@/lib/jobs/breaker";
import { _resetConfigCache } from "@/lib/config";

describe("oembed parsing", () => {
  it("parses a valid payload", () => {
    expect(
      parseOEmbed({ title: "  Song  ", author_name: "Artist", thumbnail_url: "https://i.ytimg.com/vi/x/hqdefault.jpg" })
    ).toEqual({ title: "Song", author: "Artist", thumbnail: "https://i.ytimg.com/vi/x/hqdefault.jpg" });
  });

  it("rejects garbage", () => {
    expect(parseOEmbed(null)).toBeNull();
    expect(parseOEmbed({})).toBeNull();
    expect(parseOEmbed({ title: "   " })).toBeNull();
    expect(parseOEmbed({ title: "T", thumbnail_url: "http://insecure/x.jpg" })?.thumbnail).toBeNull();
  });
});

describe("cache keys", () => {
  it("builds safe keys", () => {
    expect(cacheKey("aqz-KE-bpKQ", 192)).toBe("aqz-KE-bpKQ-192k.mp3");
  });

  it("rejects bad inputs", () => {
    expect(cacheKey("short", 192)).toBeNull();
    expect(cacheKey("../evil_______", 192)).toBeNull();
    expect(cacheKey("aqz-KE-bpKQ", 0)).toBeNull();
    expect(cacheKey("aqz-KE-bpKQ", 1.5)).toBeNull();
  });

  it("extracts ids from normalized urls", () => {
    expect(videoIdOf("https://www.youtube.com/watch?v=aqz-KE-bpKQ")).toBe("aqz-KE-bpKQ");
    expect(videoIdOf("not a url")).toBeNull();
  });
});

describe("breaker", () => {
  it("trips after threshold and recovers on success", () => {
    _resetConfigCache();
    _resetBreaker();
    process.env.BREAKER_THRESHOLD = "3";
    process.env.BREAKER_COOLDOWN_MIN = "30";
    _resetConfigCache();
    expect(breakerAllows()).toBe(true);
    breakerReport(false);
    breakerReport(false);
    expect(breakerAllows()).toBe(true);
    breakerReport(false);
    expect(breakerAllows()).toBe(false);
    expect(breakerState().tripped).toBe(true);
    breakerReport(true);
    expect(breakerAllows()).toBe(true);
    delete process.env.BREAKER_THRESHOLD;
    delete process.env.BREAKER_COOLDOWN_MIN;
    _resetConfigCache();
    _resetBreaker();
  });
});
