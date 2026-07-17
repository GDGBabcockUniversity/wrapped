import { describe, it, expect } from "vitest";
import { pct, computePercentiles, tierFromPercentile, activityScore } from "./percentiles";

describe("pct", () => {
  it("computes the fraction of values strictly below x", () => {
    expect(pct([1, 2, 3, 4, 5], 3)).toBeCloseTo(2 / 5);
  });
  it("returns 0 for an empty array", () => {
    expect(pct([], 5)).toBe(0);
  });
});

describe("computePercentiles", () => {
  it("gives the highest score percentile 1 at real chapter scale", () => {
    // percentile = max(1, ceil(100*(1-rankFraction))) can only reach 1 when
    // rankFraction is close enough to 1 — i.e. only at a population large
    // enough for "top 1%" to be a meaningful statement (100 members here).
    const scores = Array.from({ length: 100 }, (_, i) => i); // 0..99, strictly increasing
    const percentiles = computePercentiles(scores);
    expect(percentiles.at(-1)).toBe(1); // the single highest score (99)
  });

  it("gives a small population's top scorer the lowest (best) percentile in the group", () => {
    const scores = [10, 5, 1];
    const percentiles = computePercentiles(scores);
    expect(percentiles[0]).toBeLessThan(percentiles[1]!);
    expect(percentiles[1]).toBeLessThan(percentiles[2]!);
  });

  it("gives the lowest score the highest percentile number", () => {
    const scores = [10, 5, 1];
    const percentiles = computePercentiles(scores);
    expect(percentiles[2]).toBe(100);
  });

  it("matches exact percentiles on a known small array", () => {
    // 4 members, scores ascending: [1,2,3,4] -> ranks (fraction lower): 0, .25, .5, .75
    // percentile = max(1, ceil(100*(1-rankFraction)))
    const scores = [1, 2, 3, 4];
    const percentiles = computePercentiles(scores);
    expect(percentiles).toEqual([100, 75, 50, 25]);
  });

  it("tames a hyperactive outlier — a 4000-message member does not push a 300-message member below top25", () => {
    // 20 members: one outlier at 4000 "messages" (as log1p-transformed scores already),
    // the rest spread reasonably; the near-top member should still land <=25.
    const outlier = Math.log1p(4000);
    const midHigh = Math.log1p(300);
    const rest = Array.from({ length: 18 }, (_, i) => Math.log1p(5 + i * 10));
    const scores = [outlier, midHigh, ...rest];
    const percentiles = computePercentiles(scores);
    expect(percentiles[1]).toBeLessThanOrEqual(25);
  });
});

describe("tierFromPercentile", () => {
  it("buckets percentiles into the correct tier", () => {
    expect(tierFromPercentile(1)).toBe("top1");
    expect(tierFromPercentile(5)).toBe("top5");
    expect(tierFromPercentile(10)).toBe("top10");
    expect(tierFromPercentile(25)).toBe("top25");
    expect(tierFromPercentile(26)).toBe("member");
    expect(tierFromPercentile(100)).toBe("member");
  });
});

describe("activityScore", () => {
  it("uses checkins-only for unmatched members (never treats messages as zero)", () => {
    const allCheckins = [1, 2, 3, 4, 5];
    const score = activityScore(
      { messagesMatched: false, messages: 0, checkins: 4 },
      [],
      allCheckins
    );
    expect(score).toBeCloseTo(pct(allCheckins, 4));
  });

  it("blends message and checkin percentiles 60/40 for matched members", () => {
    const allMessages = [Math.log1p(10), Math.log1p(50), Math.log1p(100)];
    const allCheckins = [1, 2, 3];
    const score = activityScore(
      { messagesMatched: true, messages: 50, checkins: 2 },
      allMessages,
      allCheckins
    );
    const expected = 0.6 * pct(allMessages, Math.log1p(50)) + 0.4 * pct(allCheckins, 2);
    expect(score).toBeCloseTo(expected);
  });
});
