import { describe, expect, it } from "vitest";
import {
  DECK,
  MAX_ORG_RUN,
  MOVEMENT_AUDIO,
  orgRuns,
  runtimeSec,
  timeline,
  violations,
} from "./deck";
import { TRACKS } from "./tempo";

describe("the running order", () => {
  it("breaks none of its own rules", () => {
    // The braid, the handoffs, the one-way movement order and the interaction
    // budget, all at once. This is the test that fails when someone adds a
    // chapter without asking who it is about.
    expect(violations()).toEqual([]);
  });

  it("never runs more than two org beats before a personal one", () => {
    for (const { run, length } of orgRuns()) {
      expect(length, run.join(" -> ")).toBeLessThanOrEqual(MAX_ORG_RUN);
    }
  });

  it("makes every org montage hand off to a personal number", () => {
    for (const b of DECK) {
      if (b.audience === "org" && b.shape === "MONTAGE") {
        expect(b.handsOff, `${b.id} must hand off`).toBe(true);
      }
    }
  });

  it("gives every content-carrying beat the time its content needs", () => {
    // The runtime is an OUTPUT of the content, not a budget the content is
    // squeezed into. Enforcing 2:42 here is what truncated the credits to
    // 41% of the roster: the test passed and most of the team vanished.
    // Scripted lengths, from each story component's own sequence.
    const needs: Record<string, number> = {
      built: 63.7,
      moments: 41.8,
      "group-chat": 52.6,
      people: 82.05,
    };
    for (const b of timeline()) {
      const need = needs[b.id];
      if (need) expect(b.durationSec, `${b.id} truncates its content`).toBeGreaterThanOrEqual(need);
    }
  });

  it("ships exactly two interactions", () => {
    // Club guesses, title reveals. A third dilutes both (§7).
    expect(DECK.filter((b) => b.interactive).map((b) => b.id)).toEqual(["title", "club"]);
  });

  it("gives every beat a whole or half bar", () => {
    // A beat ending mid-bar puts the next one's opening frame off the grid.
    for (const b of DECK) {
      expect((b.bars * 2) % 1, `${b.id} = ${b.bars} bars`).toBe(0);
    }
  });

  it("lays the deck out with no gaps and no overlaps", () => {
    const t = timeline();
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!.atSec).toBeCloseTo(t[i - 1]!.atSec + t[i - 1]!.durationSec, 6);
    }
  });

  it("enters each movement once and never returns to it", () => {
    const order = DECK.map((b) => b.movement);
    const firstSeen = [...new Set(order)];
    expect(order).toEqual(
      firstSeen.flatMap((m) => order.filter((x) => x === m))
    );
  });

  it("opens personal and closes personal", () => {
    // Movement I has to land "this is about me" before any org receipt, and
    // the last thing before the card is not a chapter stat.
    expect(DECK[1]!.audience).toBe("personal");
    expect(DECK.at(-1)!.audience).not.toBe("org");
  });

  it("keeps every movement inside the track that carries it", () => {
    for (const [movement, audio] of Object.entries(MOVEMENT_AUDIO)) {
      const track = TRACKS[audio.track];
      const need = timeline()
        .filter((b) => b.movement === movement)
        .reduce((a, b) => a + b.durationSec, 0);
      expect(audio.fromSec + need, `${movement} from ${audio.track}`).toBeLessThanOrEqual(
        track.durationSec
      );
    }
  });

  it("marks borrowed audio as borrowed", () => {
    // Three movements want tracks that do not exist yet. A stand-in that is
    // not flagged is a placeholder that ships by accident.
    const standIns = Object.entries(MOVEMENT_AUDIO)
      .filter(([, a]) => a.standIn)
      .map(([m]) => m);
    expect(standIns).toEqual(["proof", "recognition", "identity"]);
    for (const [, a] of Object.entries(MOVEMENT_AUDIO)) {
      if (a.standIn) expect(a.wants).toMatch(/T[234]/);
    }
  });
});

describe("violations() catches what it claims to", () => {
  it("flags three org beats in a row", () => {
    const bad = DECK.map((b) =>
      b.id === "moments" ? { ...b, audience: "org" as const, handsOff: true } : b
    );
    expect(violations(bad).some((v) => v.includes("in a row"))).toBe(true);
  });

  it("flags an org montage with no handoff", () => {
    const bad = DECK.map((b) => (b.id === "the-year" ? { ...b, handsOff: false } : b));
    expect(violations(bad).some((v) => v.includes("never hands off"))).toBe(true);
  });

  it("flags a movement that is re-entered", () => {
    const bad = [...DECK, { ...DECK[2]!, id: "encore" }];
    expect(violations(bad).some((v) => v.includes("re-entered"))).toBe(true);
  });

  it("flags a third interaction", () => {
    const bad = DECK.map((b) => (b.id === "rooms" ? { ...b, interactive: true } : b));
    expect(violations(bad).some((v) => v.includes("dilute"))).toBe(true);
  });
});
