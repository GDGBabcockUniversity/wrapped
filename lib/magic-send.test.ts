import { describe, it, expect } from "vitest";
import { decideMagicSend } from "./magic-send";

describe("decideMagicSend — quota-safe policy", () => {
  it("sends when the email has a wrapped and the idempotency slot is free", () => {
    expect(decideMagicSend(true, true)).toBe("send");
  });

  it("never sends to an email we have no wrapped for (quota + only-members)", () => {
    expect(decideMagicSend(false, true)).toBe("skip-nonmember");
    expect(decideMagicSend(false, false)).toBe("skip-nonmember");
  });

  it("suppresses a repeat send inside the idempotency window", () => {
    expect(decideMagicSend(true, false)).toBe("skip-idempotent");
  });

  it("checks membership before idempotency (a non-member never reaches the slot)", () => {
    // isMember false wins even if a slot somehow reads claimed — we must not
    // burn a send on someone with nothing to show.
    expect(decideMagicSend(false, true)).toBe("skip-nonmember");
  });
});
