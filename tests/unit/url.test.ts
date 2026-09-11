import { describe, expect, it } from "vitest";
import { validateUrl, extractYoutubeId } from "@/lib/validation/url";

describe("validateUrl", () => {
  it("accepts standard watch URLs and normalizes them", () => {
    const r = validateUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=WL");
    expect(r.ok).toBe(true);
    expect(r.normalizedUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r.source).toBe("youtube");
  });

  it("accepts youtu.be, shorts, embed, music hosts", () => {
    expect(validateUrl("https://youtu.be/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateUrl("https://www.youtube.com/embed/dQw4w9WgXcQ").ok).toBe(true);
    expect(validateUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(true);
  });

  it("rejects malformed and non-http URLs", () => {
    expect(validateUrl("").ok).toBe(false);
    expect(validateUrl("not a url").ok).toBe(false);
    expect(validateUrl("ftp://example.com/x").ok).toBe(false);
    expect(validateUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateUrl("file:///etc/passwd").ok).toBe(false);
  });

  it("rejects unsupported domains", () => {
    const r = validateUrl("https://vimeo.com/12345");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("UNSUPPORTED_SOURCE");
  });

  it("rejects missing video ids", () => {
    expect(validateUrl("https://www.youtube.com/watch").ok).toBe(false);
    expect(validateUrl("https://www.youtube.com/").ok).toBe(false);
  });

  it("blocks SSRF-ish hosts synchronously", () => {
    expect(validateUrl("http://localhost:3000/x").ok).toBe(false);
    expect(validateUrl("http://127.0.0.1/video").ok).toBe(false);
    expect(validateUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateUrl("http://10.0.0.5/v").ok).toBe(false);
    expect(validateUrl("http://192.168.1.1/v").ok).toBe(false);
  });

  it("rejects credentials in URL and shell metachars", () => {
    expect(validateUrl("https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ").ok).toBe(false);
    expect(validateUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ; rm -rf /").ok).toBe(false);
  });
});

describe("extractYoutubeId", () => {
  it("parses all supported shapes", () => {
    expect(extractYoutubeId(new URL("https://youtu.be/dQw4w9WgXcQ"))).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId(new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId(new URL("https://www.youtube.com/shorts/dQw4w9WgXcQ?x=1"))).toBe("dQw4w9WgXcQ");
  });
});
