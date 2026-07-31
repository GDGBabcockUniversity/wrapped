import { beforeAll, describe, expect, it } from "vitest";
import {
  signMagicToken,
  signDeliveryToken,
  signSessionToken,
  verifyToken,
} from "./session";

beforeAll(() => {
  process.env.WRAPPED_SESSION_SECRET = "test-secret-not-used-anywhere-real";
});

const EMAIL = "ada@b.edu";

describe("token purposes", () => {
  it("a delivered link opens the door the verify route guards", async () => {
    const token = await signDeliveryToken(EMAIL);
    const payload = await verifyToken(token, ["magic", "delivery"]);
    expect(payload.email).toBe(EMAIL);
  });

  it("a requested link still opens that same door", async () => {
    const token = await signMagicToken(EMAIL);
    const payload = await verifyToken(token, ["magic", "delivery"]);
    expect(payload.email).toBe(EMAIL);
  });

  it("a session cookie cannot be replayed as a login link", async () => {
    const token = await signSessionToken(EMAIL, true);
    await expect(verifyToken(token, ["magic", "delivery"])).rejects.toThrow();
  });

  it("a 90-day delivery token cannot be used as a session", async () => {
    // This is the one that matters most: delivery tokens are long-lived and
    // sit in inboxes. If the session check accepted them, forwarding the
    // email would hand over a session rather than a one-time login.
    const token = await signDeliveryToken(EMAIL);
    await expect(verifyToken(token, "session")).rejects.toThrow();
  });

  it("a magic token is not a session either", async () => {
    const token = await signMagicToken(EMAIL);
    await expect(verifyToken(token, "session")).rejects.toThrow();
  });

  it("a single purpose stays exact — delivery is not magic", async () => {
    const token = await signDeliveryToken(EMAIL);
    await expect(verifyToken(token, "magic")).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signDeliveryToken(EMAIL);
    process.env.WRAPPED_SESSION_SECRET = "a-completely-different-secret-value";
    await expect(verifyToken(token, ["magic", "delivery"])).rejects.toThrow();
    process.env.WRAPPED_SESSION_SECRET = "test-secret-not-used-anywhere-real";
  });

  it("outlives a magic link by a wide margin", async () => {
    const decode = (t: string) =>
      JSON.parse(Buffer.from(t.split(".")[1]!, "base64url").toString());
    const magic = decode(await signMagicToken(EMAIL));
    const delivery = decode(await signDeliveryToken(EMAIL));
    const magicLife = magic.exp - magic.iat;
    const deliveryLife = delivery.exp - delivery.iat;
    expect(magicLife).toBe(15 * 60);
    expect(deliveryLife).toBe(90 * 24 * 60 * 60);
    expect(deliveryLife).toBeGreaterThan(magicLife);
  });
});
