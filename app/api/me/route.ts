import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
