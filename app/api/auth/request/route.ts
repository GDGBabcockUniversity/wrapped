import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signMagicToken } from "@/lib/session";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkMagicLinkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  // A missing secret makes jose throw deep inside signMagicToken — surface
  // it as a named, loggable config error instead of a raw 500 (§11.1 ops).
  if (!process.env.WRAPPED_SESSION_SECRET) {
    console.error("[wrapped] WRAPPED_SESSION_SECRET is not set — cannot sign magic links.");
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkMagicLinkRateLimit(email, ip)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a bit." },
      { status: 429 }
    );
  }

  try {
    const token = await signMagicToken(email);
    await sendMagicLinkEmail(email, token);
  } catch (err) {
    console.error("[wrapped] magic link request failed:", err);
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  // Always the same response whether or not the email belongs to a member —
  // no enumeration.
  return NextResponse.json({ ok: true }, { status: 202 });
}
