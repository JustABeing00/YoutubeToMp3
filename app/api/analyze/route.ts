import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateUrl } from "@/lib/validation/url";
import { assertUrlSafe } from "@/lib/security/ssrf";
import { pickAdapter, AdapterError } from "@/lib/media/youtube-adapter";
import { checkRate, clientIp } from "@/lib/rate-limit/limiter";
import { getConfig } from "@/lib/config";
import { errorBody } from "@/lib/errors";
import { logEvent, logError } from "@/lib/logging/logger";

export const runtime = "nodejs";

const Body = z.object({ url: z.string().min(1).max(2048) });

export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(errorBody("INVALID_URL"), { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json(errorBody("INVALID_URL"), { status: 400 });

  const cfg = getConfig();
  const ip = clientIp(req.headers);
  const rl = checkRate(`analyze:${ip}`, cfg.ANALYZE_PER_MIN_PER_IP, 60_000);
  if (!rl.allowed) {
    logEvent("rate-limit", { ip: "[redacted]", route: "analyze" });
    return NextResponse.json(errorBody("RATE_LIMITED"), { status: 429 });
  }

  const v = validateUrl(parsed.data.url);
  if (!v.ok || !v.normalizedUrl || !v.source) {
    return NextResponse.json(errorBody(v.code === "UNSUPPORTED_SOURCE" ? "UNSUPPORTED_SOURCE" : "INVALID_URL"), {
      status: v.code === "UNSUPPORTED_SOURCE" ? 400 : 400,
    });
  }

  try {
    await assertUrlSafe(v.normalizedUrl);
  } catch (e) {
    const code = (e as { code?: string })?.code === "SOURCE_UNAVAILABLE" ? "SOURCE_UNAVAILABLE" : "INVALID_URL";
    return NextResponse.json(errorBody(code as "INVALID_URL"), { status: 400 });
  }

  try {
    const adapter = pickAdapter(v.normalizedUrl);
    const meta = await adapter.getMetadata(v.normalizedUrl);
    if (meta.duration != null && meta.duration > cfg.MAX_INPUT_DURATION_SEC) {
      return NextResponse.json(errorBody("OUTPUT_TOO_LARGE", `max ${Math.floor(cfg.MAX_INPUT_DURATION_SEC / 60)} min`), {
        status: 400,
      });
    }
    logEvent("metadata.retrieved", { source: v.source, durationMs: Date.now() - started });
    return NextResponse.json({
      normalizedUrl: v.normalizedUrl,
      source: v.source,
      metadata: {
        title: meta.title,
        duration: meta.duration,
        thumbnail: meta.thumbnail,
        source: meta.source,
        author: meta.author,
        available: meta.available,
      },
    });
  } catch (e) {
    if (e instanceof AdapterError) {
      const map: Record<string, "METADATA_UNAVAILABLE" | "AUTH_REQUIRED" | "SOURCE_UNAVAILABLE" | "SERVER_ERROR" | "TIMEOUT"> = {
        METADATA_UNAVAILABLE: "METADATA_UNAVAILABLE",
        AUTH_REQUIRED: "AUTH_REQUIRED",
        SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
        SERVER_ERROR: "SERVER_ERROR",
        TIMEOUT: "TIMEOUT",
      };
      const code = map[e.code] ?? "METADATA_UNAVAILABLE";
      logError("analyze.failed", e, { code });
      const status = code === "SERVER_ERROR" ? 500 : code === "TIMEOUT" ? 504 : 400;
      return NextResponse.json(errorBody(code), { status });
    }
    logError("analyze.failed", e, {});
    return NextResponse.json(errorBody("SERVER_ERROR"), { status: 500 });
  }
}
