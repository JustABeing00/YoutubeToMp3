/**
 * YouTube oEmbed metadata: free, unlimited, and never IP-blocked (it is the
 * same endpoint that powers video embeds on millions of sites). Used as the
 * first source for Analyze so title/author/thumbnail work even when yt-dlp
 * extraction is throttled. Duration is not provided by oEmbed — yt-dlp fills
 * that in when reachable.
 */

export interface OEmbedData {
  title: string;
  author: string | null;
  thumbnail: string | null;
}

export function oembedUrl(videoId: string): string {
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
}

/** Pure parser, tested. Returns null for malformed payloads. */
export function parseOEmbed(data: unknown): OEmbedData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.title !== "string" || !d.title.trim()) return null;
  const author = typeof d.author_name === "string" && d.author_name.trim() ? d.author_name.trim().slice(0, 200) : null;
  const thumbnail =
    typeof d.thumbnail_url === "string" && d.thumbnail_url.startsWith("https://") ? d.thumbnail_url : null;
  return { title: d.title.trim().slice(0, 300), author, thumbnail };
}

/** Fetch oEmbed for a validated 11-char video id. Null on any failure. */
export async function fetchOEmbed(videoId: string, timeoutMs = 10_000): Promise<OEmbedData | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(oembedUrl(videoId), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { accept: "application/json", "user-agent": "videotomp3/1.0" },
    });
    if (!res.ok) return null;
    return parseOEmbed((await res.json()) as unknown);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
