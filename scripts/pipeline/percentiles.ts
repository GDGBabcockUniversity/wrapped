/** Fraction of xs strictly below x. */
export function pct(xs: number[], x: number): number {
  if (xs.length === 0) return 0;
  let below = 0;
  for (const v of xs) if (v < x) below++;
  return below / xs.length;
}

export interface ActivityInput {
  messagesMatched: boolean;
  messages: number;
  checkins: number;
}

export function activityScore(
  m: ActivityInput,
  allLogMessages: number[],
  allCheckins: number[]
): number {
  if (m.messagesMatched) {
    return 0.6 * pct(allLogMessages, Math.log1p(m.messages)) + 0.4 * pct(allCheckins, m.checkins);
  }
  return pct(allCheckins, m.checkins);
}

export type Tier = "top1" | "top5" | "top10" | "top25" | "member";

export function tierFromPercentile(p: number): Tier {
  if (p <= 1) return "top1";
  if (p <= 5) return "top5";
  if (p <= 10) return "top10";
  if (p <= 25) return "top25";
  return "member";
}

/**
 * percentile(m) = max(1, ceil(100 * (1 - rankFraction)))
 * rankFraction = fraction of members with a strictly lower score than m
 * (so the single highest score always lands at percentile 1; ties share the
 * better percentile since rankFraction only counts strictly-lower scores).
 */
export function computePercentiles(scores: number[]): number[] {
  const total = scores.length;
  return scores.map((score) => {
    let lower = 0;
    for (const s of scores) if (s < score) lower++;
    // (total - lower) computed as an integer first, then a single division —
    // avoids the floating-point precision loss of `1 - lower/total` landing
    // just above an integer boundary (e.g. 1.0000000000000002) and pushing
    // an exact top-percentile score into the next bucket after ceil().
    return Math.max(1, Math.ceil((100 * (total - lower)) / total));
  });
}
