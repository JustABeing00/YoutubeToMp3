import { NextResponse } from "next/server";
import { getDb } from "@/lib/jobs/store";

export const runtime = "nodejs";

/** Minimal observability: totals for a future metrics dashboard. No PII. */
export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(`SELECT status, COUNT(*) as n FROM jobs GROUP BY status`)
      .all() as Array<{ status: string; n: number }>;
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = r.n;
    const active = db
      .prepare(`SELECT COUNT(*) as n FROM jobs WHERE status IN ('queued','analyzing','retrieving','processing','finalizing')`)
      .get() as { n: number };
    return NextResponse.json(
      {
        total: rows.reduce((a, r) => a + r.n, 0),
        active: active.n,
        byStatus,
        at: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ total: 0, active: 0, byStatus: {} });
  }
}
