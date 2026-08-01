import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";
import { FIXTURES } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

/** A fixture by key, by first name, or the default. Only ever null when the
    caller explicitly asks for the guest deck. */
function resolveFixture(asked: string | null) {
  if (asked === "guest" || asked === "none") return null;
  if (!asked) return FIXTURES.top1;
  const key = asked.toLowerCase();
  if (FIXTURES[key]) return FIXTURES[key];
  const byName = Object.values(FIXTURES).find(
    (f) => f.firstName.toLowerCase() === key || f.name.toLowerCase().startsWith(key)
  );
  return byName ?? FIXTURES.top1;
}

export async function GET(req: NextRequest) {
  const debug = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEBUG;
  if (debug) {
    const asked = req.nextUrl.searchParams.get("fixture");
    // Resolve by key OR by the person's name, and NEVER fall through to guest
    // on a miss. The fixture keyed `top1` is a member called Ada Lovelace, so
    // ?fixture=ada is the obvious thing to type and used to return the guest
    // deck in silence — four beats missing, nothing on screen saying why.
    const snapshot = resolveFixture(asked);
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
