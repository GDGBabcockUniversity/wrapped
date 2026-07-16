import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signMagicToken } from "@/lib/session";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkMagicLinkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
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

  const token = await signMagicToken(email);
  await sendMagicLinkEmail(email, token);

  // Always the same response whether or not the email belongs to a member —
  // no enumeration.
  return NextResponse.json({ ok: true }, { status: 202 });
}
