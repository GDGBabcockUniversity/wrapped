import { describe, expect, it } from "vitest";
import {
  ALLOWED,
  DIMENSIONS,
  FLOOR_TITLE,
  MODIFIERS,
  NOUNS,
  assignTitle,
  isLegal,
  legalCompounds,
  meanStd,
  tierFor,
  zScore,
  type Modifier,
  type Noun,
} from "./titles";

describe("the legality rules", () => {
  it("rejects a compound that says one thing twice", () => {
    // Both presence. The spec's own example of the pairing that is hard to
    // catch by eye, which is the argument for a rule rather than a read.
    expect(isLegal("UNDEFEATED", "COMPLETIONIST")).toBe(false);
  });

  it("rejects two passive halves, which the axis rule alone lets through", () => {
    // presence + consumption are different axes, so the axis rule passes this.
    expect(MODIFIERS.RETURNING.axis).not.toBe(NOUNS.READER.axis);
    // It still fails, because nothing in it argues with anything else.
    expect(isLegal("RETURNING", "READER")).toBe(false);
  });

  it("accepts every compound the spec names as shippable", () => {
    const ship: [Modifier, Noun][] = [
      ["QUIET", "ARCHIVIST"],
      ["LATE", "OPENER"],
      ["WEEKEND", "REACTOR"],
      ["PATIENT", "RECRUITER"],
      ["SUDDEN", "BUILDER"],
    ];
    for (const [m, n] of ship) {
      expect(isLegal(m, n), `${m} ${n}`).toBe(true);
      expect(ALLOWED.has(`${m} ${n}`), `${m} ${n} on the ship list`).toBe(true);
    }
  });

  it("only ships compounds that pass the rules", () => {
    for (const compound of ALLOWED) {
      const [m, n] = compound.split(" ") as [Modifier, Noun];
      expect(MODIFIERS[m], `${compound}: unknown modifier`).toBeDefined();
      expect(NOUNS[n], `${compound}: unknown noun`).toBeDefined();
      expect(isLegal(m, n), `${compound} is on the ship list but illegal`).toBe(true);
    }
  });

  it("ships far fewer than it permits", () => {
    // The gate is not the shipping decision. If these ever converge, the
    // curation pass has stopped happening.
    expect(ALLOWED.size).toBeLessThan(legalCompounds().length / 2);
  });

  it("every noun stands alone, so the fallback is never a visible downgrade", () => {
    for (const noun of Object.keys(NOUNS)) {
      expect(`THE ${noun}`).toMatch(/^THE [A-Z]+$/);
    }
  });

  it("every dimension points at a real primitive", () => {
    for (const d of DIMENSIONS) {
      expect(NOUNS[d.noun], `${d.id} -> ${d.noun}`).toBeDefined();
      if (d.modifier) expect(MODIFIERS[d.modifier], `${d.id} -> ${d.modifier}`).toBeDefined();
      expect(d.evidence("top 4%")).toContain("top 4%");
    }
  });
});

describe("tiering", () => {
  it("splits the chapter 15 / 35 / 50", () => {
    expect(tierFor(1)).toBe("A");
    expect(tierFor(15)).toBe("A");
    expect(tierFor(16)).toBe("B");
    expect(tierFor(50)).toBe("B");
    expect(tierFor(51)).toBe("C");
    expect(tierFor(100)).toBe("C");
  });

  it("scores a member against their own tier, not the chapter", () => {
    // 40 messages is nothing against the core and remarkable among the quiet.
    // Same member, same number, opposite verdict — which is the entire point.
    const core = [400, 520, 610, 700, 880];
    const quiet = [2, 5, 8, 11, 14];
    expect(zScore(40, core)).toBeLessThan(0);
    expect(zScore(40, quiet)).toBeGreaterThan(1);
  });

  it("gives nobody a superlative when a tier has no spread", () => {
    expect(zScore(10, [10, 10, 10, 10])).toBe(0);
  });

  it("computes mean and deviation", () => {
    const { mean, std } = meanStd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBe(5);
    expect(std).toBe(2);
  });
});

describe("assigning a title", () => {
  it("names a member for what they are most unusual for", () => {
    const r = assignTitle({ z: { archive: 2.4, messages: 0.3 } });
    expect(r.title).toBe("THE ARCHIVIST");
    expect(r.kind).toBe("noun");
  });

  it("colours the headline trait with the second one, when we would say it", () => {
    const r = assignTitle({
      z: { archive: 2.4, reads: 1.8 },
      ranks: { archive: "top 3% of the quiet", reads: "all 7 issues" },
    });
    expect(r.title).toBe("THE QUIET ARCHIVIST");
    expect(r.kind).toBe("compound");
    expect(r.dimensions).toEqual(["archive", "reads"]);
  });

  it("falls back to the bare noun rather than shipping an unapproved compound", () => {
    // burst -> SUDDEN, plays -> PLAYER. Legal, but not a thing we say.
    const r = assignTitle({ z: { plays: 2.2, burst: 1.9 } });
    expect(isLegal("SUDDEN", "PLAYER")).toBe(true);
    expect(ALLOWED.has("SUDDEN PLAYER")).toBe(false);
    expect(r.title).toBe("THE PLAYER");
    expect(r.kind).toBe("noun");
  });

  it("does not colour a trait with a second reading of the same trait", () => {
    // Both checkins and attendanceRate are about turning up; pairing them
    // would produce a because-line arguing one point twice.
    const r = assignTitle({ z: { checkins: 2.5, attendanceRate: 2.1 } });
    expect(r.dimensions).toEqual(["checkins"]);
  });

  it("ignores a weak second trait", () => {
    const r = assignTitle({ z: { archive: 2.4, reads: 0.4 } });
    expect(r.title).toBe("THE ARCHIVIST");
  });

  it("gives the unremarkable member the floor, not nothing", () => {
    const r = assignTitle({ z: { messages: 0.4, checkins: -0.2, reads: 0.8 } });
    expect(r.title).toBe(FLOOR_TITLE);
    expect(r.kind).toBe("floor");
    expect(r.because).not.toBe("");
  });

  it("gives the floor to a member with no measurements at all", () => {
    expect(assignTitle({ z: {} }).title).toBe(FLOOR_TITLE);
  });

  it("counts being unusually low as being unusual", () => {
    // A strongly negative z is still a distinctive trait; abs() is what makes
    // the quiet tier's own extremes visible.
    const r = assignTitle({ z: { messages: -2.6 } });
    expect(r.kind).toBe("noun");
    expect(r.title).toBe("THE ESSAYIST");
  });

  it("always states the metric behind the claim", () => {
    const r = assignTitle({
      z: { checkins: 2.9 },
      ranks: { checkins: "9 of 31" },
      tier: "B",
    });
    expect(r.because).toContain("9 of 31");
    expect(r.because).toContain("the regulars");
  });

  it("is stable across runs for identical input", () => {
    // Two dimensions tied exactly. A title that changed between pipeline runs
    // reads to a member as the system guessing.
    const input = { z: { reads: 2.0, plays: 2.0 } };
    expect(assignTitle(input).title).toBe(assignTitle(input).title);
  });

  it("ignores dimensions it does not know about", () => {
    const r = assignTitle({ z: { notARealThing: 9.9, archive: 1.5 } });
    expect(r.title).toBe("THE ARCHIVIST");
  });
});
