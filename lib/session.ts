import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.WRAPPED_SESSION_SECRET!);

// magic-link token: 15 min
export async function signMagicToken(email: string) {
  return new SignJWT({ email, purpose: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("wrapped")
    .sign(secret());
}

/**
 * How long a delivered Wrapped link stays good. Long, because it has to be:
 * nobody opens a broadcast the minute it lands, and a link that dies before
 * the recipient gets to their inbox is the same as never sending it.
 */
export const DELIVERY_TOKEN_TTL = "90d";

/**
 * The link we MAIL OUT, as opposed to one somebody asked for.
 *
 * Deliberately a separate purpose with a separate lifetime, because the two
 * are not the same credential. A magic link is typed into a box by whoever is
 * sitting at the keyboard, so it stays at 15 minutes: the address is a claim,
 * not a fact. A delivery token is minted against an address already on the
 * membership record and never travels anywhere but that inbox, so the thing
 * it has to survive is a week of not checking email, not an attacker.
 *
 * It is still a bearer token in a mailbox. It unlocks one person's read-only
 * Wrapped — events attended, standing, club, RADAR reads — and nothing else:
 * no account, no writes, no other member's data. Forwarding the email hands
 * that over, which is the accepted cost of sending it at all.
 */
export async function signDeliveryToken(email: string) {
  return new SignJWT({ email, purpose: "delivery" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DELIVERY_TOKEN_TTL)
    .setIssuer("wrapped")
    .sign(secret());
}

// session token: 30 days
export async function signSessionToken(email: string, member: boolean) {
  return new SignJWT({ email, member, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setIssuer("wrapped")
    .sign(secret());
}

export type TokenPurpose = "magic" | "delivery" | "session";

/** `purpose` may be a list — the verify route accepts a requested link and a
    delivered one at the same door, and nothing else. Never widen this to skip
    the check: the purpose claim is what stops a 90-day delivery token being
    replayed as a session, or a session cookie as a login link. */
export async function verifyToken(token: string, purpose: TokenPurpose | TokenPurpose[]) {
  const { payload } = await jwtVerify(token, secret(), { issuer: "wrapped" });
  const allowed = Array.isArray(purpose) ? purpose : [purpose];
  if (!allowed.includes(payload.purpose as TokenPurpose)) throw new Error("wrong purpose");
  return payload as { email: string; member?: boolean };
}

export const SESSION_COOKIE = "wrapped_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
