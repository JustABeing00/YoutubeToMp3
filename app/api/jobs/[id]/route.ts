import { NextRequest, NextResponse } from "next/server";
import { assertJobId } from "@/lib/security/path";
import { errorBody } from "@/lib/errors";
import { jobStore } from "@/lib/jobs/store";
import { publicJob } from "@/lib/jobs/manager";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    assertJobId(id);
  } catch {
    return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  }
  const job = await jobStore.get(id);
  if (!job) return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  if (job.status === "completed" && Date.now() > job.expiresAt) {
    return NextResponse.json(errorBody("EXPIRED"), { status: 410 });
  }
  return NextResponse.json(
    { job: publicJob(job) },
    { headers: { "cache-control": "no-store" } }
  );
}
