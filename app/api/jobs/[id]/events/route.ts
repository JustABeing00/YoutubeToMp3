import { NextRequest } from "next/server";
import { assertJobId } from "@/lib/security/path";
import { jobStore } from "@/lib/jobs/store";
import { publicJob, subscribe } from "@/lib/jobs/manager";

export const runtime = "nodejs";

/** Server-Sent Events stream of job updates. Falls back to polling client-side. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    assertJobId(id);
  } catch {
    return new Response("not found", { status: 404 });
  }
  const job = await jobStore.get(id);
  if (!job) return new Response("not found", { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (j: typeof job) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(publicJob(j))}\n\n`));
        if (["completed", "failed", "cancelled", "expired"].includes(j.status)) {
          controller.enqueue(enc.encode(`event: done\ndata: ok\n\n`));
          controller.close();
          unsub();
        }
      };
      const unsub = subscribe(id, send);
      send(job);
      // heartbeat keeps proxies from killing idle connections
      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          clearInterval(hb);
        }
      }, 15000);
      // hard cap: close after 15 min (client re-polls if still running)
      setTimeout(() => {
        clearInterval(hb);
        try {
          controller.close();
        } catch {}
        unsub();
      }, 15 * 60_000);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      // no-store (not just no-cache) so Render + Cloudflare edge never buffer it.
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    },
  });
}
