import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateUrl } from "@/lib/validation/url";
import { assertUrlSafe } from "@/lib/security/ssrf";
import { checkRate, clientIp } from "@/lib/rate-limit/limiter";
import { getConfig, isAllowedBitrate } from "@/lib/config";
import { errorBody } from "@/lib/errors";
import { jobStore } from "@/lib/jobs/store";
import { enqueue, publicJob } from "@/lib/jobs/manager";
import { pickAdapter } from "@/lib/media/youtube-adapter";
import { logEvent } from "@/lib/logging/logger";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().min(1).max(2048),
  bitrate: z.number().int().optional().default(192),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(errorBody("INVALID_URL"), { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json(errorBody("INVALID_URL"), { status: 400 });
  if (!isAllowedBitrate(parsed.data.bitrate)) return NextResponse.json(errorBody("INVALID_URL", "bad bitrate"), { status: 400 });

  const cfg = getConfig();
  const ip = clientIp(req.headers);

  const hourly = checkRate(`jobs:${ip}`, cfg.JOBS_PER_HOUR_PER_IP, 3_600_000);
  if (!hourly.allowed) {
    logEvent("rate-limit", { route: "jobs.create" });
    return NextResponse.json(errorBody("RATE_LIMITED"), { status: 429 });
  }
  const activeForIp = await jobStore.countActiveByIp(ip);
  if (activeForIp >= cfg.MAX_JOBS_PER_IP) {
    return NextResponse.json(errorBody("RATE_LIMITED", "too many active conversions"), { status: 429 });
  }
  const active = await jobStore.listActive();
  if (active.length >= cfg.MAX_CONCURRENT_JOBS * 3) {
    return NextResponse.json(errorBody("RATE_LIMITED", "server busy, try again shortly"), { status: 429 });
  }

  const v = validateUrl(parsed.data.url);
  if (!v.ok || !v.normalizedUrl || !v.source) {
    return NextResponse.json(errorBody(v.code === "UNSUPPORTED_SOURCE" ? "UNSUPPORTED_SOURCE" : "INVALID_URL"), { status: 400 });
  }
  try {
    await assertUrlSafe(v.normalizedUrl);
  } catch {
    return NextResponse.json(errorBody("INVALID_URL"), { status: 400 });
  }

  // Attach fresh metadata when cheap so the worker can skip re-fetching display data.
  let input = undefined;
  try {
    const meta = await pickAdapter(v.normalizedUrl).getMetadata(v.normalizedUrl);
    if (meta.duration != null && meta.duration > cfg.MAX_INPUT_DURATION_SEC) {
      return NextResponse.json(errorBody("OUTPUT_TOO_LARGE"), { status: 400 });
    }
    input = { title: meta.title, duration: meta.duration, thumbnail: meta.thumbnail, source: meta.source, author: meta.author };
  } catch {
    // Non-fatal: the worker will retry metadata and surface a proper error state.
    input = undefined;
  }

  const job = await enqueue({
    sourceUrl: v.normalizedUrl,
    source: v.source,
    bitrate: parsed.data.bitrate,
    ip,
    input,
  });
  return NextResponse.json({ job: publicJob(job) }, { status: 201 });
}
