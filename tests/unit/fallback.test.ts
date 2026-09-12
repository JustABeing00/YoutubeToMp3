import { describe, expect, it } from "vitest";
import { pickInvidiousAudio, pickPipedAudio } from "@/lib/media/fallback";

describe("piped stream picking", () => {
  it("prefers proxied hosts over direct googlevideo URLs", () => {
    const url = pickPipedAudio({
      audioStreams: [
        { url: "https://rr1---sn-googlevideo.com/videoplayback?x=1", bitrate: 160000 },
        { url: "https://pipedproxy-abc.example.net/audio?x=2", bitrate: 48000 },
      ],
    });
    expect(url).toBe("https://pipedproxy-abc.example.net/audio?x=2");
  });

  it("picks highest bitrate when all are proxied", () => {
    const url = pickPipedAudio({
      audioStreams: [
        { url: "https://pipedproxy-a.example.net/low", bitrate: 48000 },
        { url: "https://pipedproxy-b.example.net/high", bitrate: 128000 },
      ],
    });
    expect(url).toBe("https://pipedproxy-b.example.net/high");
  });

  it("falls back to googlevideo when nothing else exists", () => {
    const url = pickPipedAudio({
      audioStreams: [{ url: "https://rr1---sn-googlevideo.com/videoplayback?x=1", bitrate: 128000 }],
    });
    expect(url).toBe("https://rr1---sn-googlevideo.com/videoplayback?x=1");
  });

  it("returns null for missing/garbage payloads", () => {
    expect(pickPipedAudio(null)).toBeNull();
    expect(pickPipedAudio({})).toBeNull();
    expect(pickPipedAudio({ audioStreams: [{ url: "http://insecure/x" }] })).toBeNull();
    expect(pickPipedAudio({ audioStreams: [{ url: 42 }] })).toBeNull();
  });
});

describe("invidious stream picking", () => {
  it("keeps audio-only formats and prefers proxied hosts", () => {
    const url = pickInvidiousAudio({
      adaptiveFormats: [
        { url: "https://rr1---sn-googlevideo.com/videoplayback?v=1", bitrate: 200000, type: "video/mp4" },
        { url: "https://rr1---sn-googlevideo.com/videoplayback?a=1", bitrate: 160000, type: "audio/webm" },
        { url: "https://proxy.example.net/audio?a=2", bitrate: 64000, type: "audio/mp4" },
      ],
    });
    expect(url).toBe("https://proxy.example.net/audio?a=2");
  });

  it("returns null when no audio formats exist", () => {
    expect(pickInvidiousAudio({ adaptiveFormats: [] })).toBeNull();
    expect(pickInvidiousAudio({})).toBeNull();
  });
});
