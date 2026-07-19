/**
 * The magic-link send decision (quota safety). Kept pure and separate from
 * the route glue so the policy is unit-testable: we only email people we
 * actually have a wrapped for, and never more than once per idempotency
 * window. The API response is identical regardless (anti-enumeration) — this
 * only governs whether an email is actually dispatched.
 */
export type MagicSendDecision = "send" | "skip-nonmember" | "skip-idempotent";

export function decideMagicSend(isMember: boolean, slotClaimed: boolean): MagicSendDecision {
  if (!isMember) return "skip-nonmember";
  if (!slotClaimed) return "skip-idempotent";
  return "send";
}
