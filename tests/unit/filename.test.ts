import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "@/lib/validation/filename";

describe("sanitizeFilename", () => {
  it("keeps normal titles and appends .mp3", () => {
    expect(sanitizeFilename("My Video Title")).toBe("My Video Title.mp3");
  });

  it("strips illegal chars and traversal", () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain("/");
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("abcdefghij.mp3");
    expect(sanitizeFilename('a:b*c?d').endsWith(".mp3")).toBe(true);
  });

  it("handles unicode, spaces, long titles", () => {
    const jp = sanitizeFilename("日本語タイトル with spaces  test");
    expect(jp).toBe("日本語タイトル with spaces test.mp3");
    const long = sanitizeFilename("a".repeat(500));
    expect(long.length).toBeLessThanOrEqual(124);
    expect(long.endsWith(".mp3")).toBe(true);
  });

  it("handles empty / dot-only / reserved names", () => {
    expect(sanitizeFilename("")).toBe("audio.mp3");
    expect(sanitizeFilename("...")).toBe("audio.mp3");
    expect(sanitizeFilename("CON")).toBe("_CON.mp3");
  });

  it("strips control characters", () => {
    expect(sanitizeFilename("a\u0000b\u001fc")).toBe("abc.mp3");
  });
});
