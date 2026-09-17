import { NextRequest, NextResponse } from "next/server";

/**
 * Edge -> origin guard for the Workers + Render split.
 * The Cloudflare Worker sends X-Origin-Token on every /api/* forward;
 * direct hits to xxxx.onrender.com without it are rejected so attackers
 * can't bypass edge rate-limits / cold-start shielding.
 * /api/metrics stays open (Render's own health check has no token).
 * Empty ORIGIN_TOKEN = enforcement off (local dev).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname === "/api/metrics") return NextResponse.next();

  const expected = process.env.ORIGIN_TOKEN ?? "";
  if (!expected) return NextResponse.next();

  if (req.headers.get("x-origin-token") === expected) return NextResponse.next();
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
}

export const config = { matcher: ["/api/:path*"] };
