import { NextRequest, NextResponse } from "next/server";
import { assertJobId } from "@/lib/security/path";
import { errorBody } from "@/lib/errors";
import { cancelJob, publicJob } from "@/lib/jobs/manager";
import { jobStore } from "@/lib/jobs/store";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    assertJobId(id);
  } catch {
    return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  }
  const cur = await jobStore.get(id);
  if (!cur) return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  const next = await cancelJob(id);
  if (!next) return NextResponse.json(errorBody("NOT_FOUND"), { status: 404 });
  return NextResponse.json({ job: publicJob(next) });
}
