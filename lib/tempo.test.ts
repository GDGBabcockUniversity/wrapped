import { describe, expect, it } from "vitest";
import {
  MONTAGE_BARS,
  SHAPE_BARS,
  TRACKS,
  barSec,
  barsBetween,
  bars,
  barsMs,
  barAt,
  beatSec,
  cueSheet,
  snapToBar,
} from "./tempo";

const MCBH = TRACKS.mcbh;
const GRATITUDE = TRACKS.gratitude;

describe("measured tempo", () => {
  it("uses the measured BPM, not the album's", () => {
    // The album says 117. Scoring a beat grid against the track's own onsets
    // puts 114 at 1.000 and 117 at 0.140, so 117 is a different grid rather
    // than a rounding difference.
    expect(MCBH.bpm).toBe(114);
    expect(MCBH.bpm).not.toBe(117);
    expect(GRATITUDE.bpm).toBe(113);
  });

  it("puts both bookends on effectively one grid", () => {
    // Under 1% apart, so the crossfade needs no tempo matching.
    const drift = Math.abs(barSec(GRATITUDE) - barSec(MCBH)) / barSec(MCBH);
    expect(drift).toBeLessThan(0.01);
  });

  it("makes the spec's refrain span come out in whole bars", () => {
    // The structural claim that independently confirms 114: the refrain runs
    // 0:16.96 to 0:33.83, and that span has to be a whole number of bars.
    const n = barsBetween(MCBH, 16.96, 33.83);
    expect(Math.abs(n - 8)).toBeLessThan(0.05);
  });

  it("rejects the tempi that do not produce whole bars over that span", () => {
    for (const bpm of [117, 151.45]) {
      const fake = { ...MCBH, bpm };
      const n = barsBetween(fake, 16.96, 33.83);
      expect(Math.abs(n - Math.round(n)), `${bpm} BPM`).toBeGreaterThan(0.1);
    }
  });
});

describe("bar maths", () => {
  it("converts beats and bars", () => {
    expect(beatSec(MCBH)).toBeCloseTo(0.52632, 5);
    expect(barSec(MCBH)).toBeCloseTo(2.10526, 5);
    expect(barSec(GRATITUDE)).toBeCloseTo(2.12389, 5);
  });

  it("handles the half-bar the montage accelerates into", () => {
    expect(bars(MCBH, 0.5)).toBeCloseTo(1.05263, 5);
  });

  it("gives whole milliseconds for the player's timers", () => {
    expect(barsMs(MCBH, 4)).toBe(8421);
    expect(Number.isInteger(barsMs(MCBH, 2.5))).toBe(true);
  });

  it("counts bar lines from the measured first beat, not from zero", () => {
    expect(barAt(MCBH, 0)).toBe(MCBH.firstBeatSec);
    expect(barAt(MCBH, 8)).toBeCloseTo(0.355 + 8 * 2.10526, 4);
  });
});

describe("snapping", () => {
  it("moves a rough time onto the grid", () => {
    const { at, driftSec } = snapToBar(MCBH, 10.0);
    expect(Math.abs(driftSec)).toBeLessThanOrEqual(barSec(MCBH) / 2);
    expect(barsBetween(MCBH, MCBH.firstBeatSec, at) % 1).toBeCloseTo(0, 6);
  });

  it("reports how far it had to move, so a bad cue is visible", () => {
    // A snap larger than half a beat usually means the wanted time is wrong,
    // not merely imprecise — worth surfacing rather than silently fixing.
    const { driftSec } = snapToBar(MCBH, MCBH.firstBeatSec + barSec(MCBH) * 3);
    expect(Math.abs(driftSec)).toBeLessThan(0.001);
  });

  it("never snaps behind the start of the track", () => {
    expect(snapToBar(MCBH, 0).at).toBeGreaterThanOrEqual(0);
  });
});

describe("cue sheets", () => {
  it("lays a montage out on the grid, accelerating", () => {
    const cues = cueSheet(
      MCBH,
      MONTAGE_BARS.map((b, i) => ({ id: `snap${i}`, bars: b }))
    );
    expect(cues).toHaveLength(5);
    // Each SNAP is no longer than the one before it — the montage speeds up.
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.durationSec).toBeLessThanOrEqual(cues[i - 1]!.durationSec);
    }
    const total = cues.at(-1)!.atSec + cues.at(-1)!.durationSec;
    expect(total).toBeCloseTo(bars(MCBH, 6.5), 5);
  });

  it("hands every cue a time derived from BPM, never a literal", () => {
    const cues = cueSheet(MCBH, [
      { id: "rest", bars: SHAPE_BARS.REST },
      { id: "hold", bars: SHAPE_BARS.HOLD },
    ]);
    expect(cues[0]!.durationSec).toBeCloseTo(barSec(MCBH) * 2, 6);
    expect(cues[1]!.atSec).toBeCloseTo(barSec(MCBH) * 2, 6);
  });

  it("starts where it is told, so a chapter can begin mid-track", () => {
    const cues = cueSheet(MCBH, [{ id: "a", bars: 1 }], 16.96);
    expect(cues[0]!.atSec).toBe(16.96);
  });

  it("keeps the whole deck inside the tracks that carry it", () => {
    // The roll is the longest single run in the spec; it has to fit.
    expect(bars(GRATITUDE, SHAPE_BARS.ROLL)).toBeLessThan(GRATITUDE.durationSec);
  });
});
