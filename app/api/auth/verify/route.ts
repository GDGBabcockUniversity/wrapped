import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/?error=expired`);
  }

  let email: string;
  try {
    const payload = await verifyToken(token, "magic");
    email = payload.email;
  } catch {
    return NextResponse.redirect(`${origin}/?error=expired`);
  }

  let member = false;
  try {
    member = (await getSnapshotByEmail(email)) !== null;
  } catch {
    // DB unreachable — fall back to guest session rather than blocking login
    member = false;
  }

  const sessionToken = await signSessionToken(email, member);
  const response = NextResponse.redirect(`${origin}/wrapped`);
  response.cookies.set(SESSION_COOKIE, sessionToken, SESSION_COOKIE_OPTIONS);
  return response;
}
