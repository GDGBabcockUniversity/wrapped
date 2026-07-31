/**
 * Who gets mailed their Wrapped on this run. Kept pure and separate from the
 * script glue so the policy is unit-testable — the same split as
 * lib/magic-send.ts, and for the same reason: this decides who receives an
 * email that cannot be recalled, so it should be provable without a database
 * and without sending anything.
 */

export interface SendListOptions {
  /** Restrict to one address (already lowercased). */
  only?: string;
  /** Include people already sent to. */
  force?: boolean;
  /** Take at most this many, AFTER every other filter. */
  limit?: number;
}

export function selectRecipients(
  all: string[],
  delivered: Set<string>,
  { only, force, limit }: SendListOptions = {}
): string[] {
  let targets = only ? all.filter((e) => e === only) : all;
  // --force means "send again", so it lifts the already-delivered filter and
  // nothing else. It must never widen the list beyond the snapshots we hold:
  // an address with no Wrapped has nothing to be sent.
  if (!force) targets = targets.filter((e) => !delivered.has(e));
  // The cap goes last, so `--limit 5` is five people who will actually be
  // mailed rather than five candidates that mostly get skipped.
  if (limit !== undefined && limit >= 0) targets = targets.slice(0, limit);
  return targets;
}
