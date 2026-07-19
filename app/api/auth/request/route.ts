import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signMagicToken } from "@/lib/session";
import { sendMagicLinkEmail } from "@/lib/email";
import { checkMagicLinkRateLimit } from "@/lib/rate-limit";
import { snapshotExistsByEmail, claimMagicSendSlot } from "@/lib/db";
import { decideMagicSend } from "@/lib/magic-send";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ email: z.string().email() });

// At most one link per email per this window, DB-backed (survives serverless
// cold starts, unlike the in-memory rate limiter). Conserves Resend quota
// against refresh-spam.
const IDEMPOTENCY_COOLDOWN_MS = 10 * 60 * 1000;

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

    // Quota safety: we only actually email people we have a wrapped for, and
    // only once per idempotency window. Both checks fail OPEN — a DB blip
    // should never lock a real member out of their link; an occasional extra
    // send is the safer failure than silent lockout.
    let isMember = true;
    try {
      isMember = await snapshotExistsByEmail(email);
    } catch (err) {
      console.warn("[wrapped] snapshot existence check failed — failing open (will send):", err);
      isMember = true;
    }

    let slotClaimed = false;
    if (isMember) {
      try {
        slotClaimed = await claimMagicSendSlot(email, IDEMPOTENCY_COOLDOWN_MS);
      } catch (err) {
        console.warn("[wrapped] idempotency claim failed — failing open (will send):", err);
        slotClaimed = true;
      }
    }

    const decision = decideMagicSend(isMember, slotClaimed);
    if (decision === "send") {
      await sendMagicLinkEmail(email, token, req.nextUrl.origin);
    } else {
      // Named, greppable log so an owner can see WHY nothing arrived — the
      // most common one, skip-nonmember, means "no snapshot for this email
      // yet: run the pipeline (or scripts/pipeline/seed-one.ts) first."
      console.log(`[wrapped] magic link for ${email} not sent (${decision})`);
    }
  } catch (err) {
    console.error("[wrapped] magic link request failed:", err);
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  // Always the same response whether or not the email belongs to a member,
  // and whether or not we actually sent — no enumeration.
  return NextResponse.json({ ok: true }, { status: 202 });
}
