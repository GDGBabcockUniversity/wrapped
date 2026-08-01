import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";
import { FIXTURES } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const debug = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEBUG;
  if (debug) {
    const fixture = req.nextUrl.searchParams.get("fixture");
    // Named fixture, or a default one. Without the default, a local run with
    // no session falls through to the guest path, which drops every personal
    // beat — so the deck someone is trying to look at is mostly not there,
    // and nothing on screen explains why.
    const snapshot = (fixture && FIXTURES[fixture]) || (!fixture && FIXTURES.top1);
    if (snapshot) {
      return NextResponse.json(
        { member: true, snapshot },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (!cookie) {
    return NextResponse.json(
      { member: false },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let email: string;
  try {
    const payload = await verifyToken(cookie, "session");
    email = payload.email;
  } catch {
    return NextResponse.json(
      { member: false },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const snapshot = await getSnapshotByEmail(email);
    if (!snapshot) {
      return NextResponse.json(
        { member: false },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    return NextResponse.json(
      { member: true, snapshot },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { member: false, degraded: true },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
