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

// session token: 30 days
export async function signSessionToken(email: string, member: boolean) {
  return new SignJWT({ email, member, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setIssuer("wrapped")
    .sign(secret());
}

export async function verifyToken(token: string, purpose: "magic" | "session") {
  const { payload } = await jwtVerify(token, secret(), { issuer: "wrapped" });
  if (payload.purpose !== purpose) throw new Error("wrong purpose");
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
