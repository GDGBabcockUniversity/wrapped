/**
 * Tempo and bar maths (build spec §3, §8).
 *
 * The spec's rule is that every duration is expressed in BARS and converted to
 * seconds from a MEASURED tempo, never hardcoded. The reason is arithmetic: a
 * 2.6% tempo error accumulates to most of a beat across a thirty-second
 * chapter, which is the difference between a reveal landing on the downbeat
 * and landing next to it — audible, and the kind of thing nobody can debug by
 * looking at the code.
 *
 * The numbers below were measured off the real files, not read off the album
 * (`npm run measure-tempo` re-derives them). Both were wrong in the sources
 * that were available before the audio was:
 *
 *   MCBH       album says 117 · MEASURED 114
 *   Gratitude  113 · MEASURED 113, confirmed
 *
 * 117 is not a close miss on MCBH, it is a different grid. Scoring a beat
 * grid against the track's own onsets: 114 fits at 1.000, 117 at 0.140. The
 * spec reached ~114 from LRC phrase spacing and was right.
 *
 * The measurement's raw winner for MCBH was 151.45 BPM, which is 114 × 4/3 —
 * a shuffle reading of the same grid, and the standard failure of
 * autocorrelation on Afrobeats. It is rejected on grid fit, and independently
 * by the spec's own structural claim: the refrain is said to run 0:16.96 to
 * 0:33.83, and that 16.87s span is 8.013 bars at 114 and 10.646 at 151.45.
 * Whole bars at 114. Nothing whole anywhere else.
 *
 * The useful consequence: 2.1053s and 2.1239s per bar is 0.88% apart, so both
 * bookends effectively share one grid and the crossfade between them needs no
 * tempo matching.
 */

export interface Track {
  id: string;
  /** Public path. */
  src: string;
  /** Beats per minute, measured from the file. */
  bpm: number;
  /** Beats in a bar. Both tracks are 4/4. */
  beatsPerBar: number;
  /** Seconds from file start to the first beat of the grid, measured. */
  firstBeatSec: number;
  /** File length in seconds, measured. */
  durationSec: number;
}

export const TRACKS = {
  mcbh: {
    id: "mcbh",
    src: "/audio/tracks/mcbh.mp3",
    bpm: 114,
    beatsPerBar: 4,
    firstBeatSec: 0.355,
    durationSec: 170.67,
  },
  gratitude: {
    id: "gratitude",
    src: "/audio/tracks/gratitude.mp3",
    bpm: 113,
    beatsPerBar: 4,
    firstBeatSec: 0.13,
    durationSec: 170.02,
  },
} as const satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;

/** Seconds in one beat. */
export function beatSec(track: Track): number {
  return 60 / track.bpm;
}

/** Seconds in one bar. */
export function barSec(track: Track): number {
  return (60 / track.bpm) * track.beatsPerBar;
}

/** Seconds for a length written in bars. Fractions are fine — the montage
    accelerates through half-bar SNAPs. */
export function bars(track: Track, n: number): number {
  return barSec(track) * n;
}

/** Milliseconds for a length in bars, which is what the player's timers want. */
export function barsMs(track: Track, n: number): number {
  return Math.round(bars(track, n) * 1000);
}

/**
 * The time of a bar line, counting from the track's measured first beat.
 * `barIndex` 0 is the first beat itself.
 */
export function barAt(track: Track, barIndex: number): number {
  return track.firstBeatSec + bars(track, barIndex);
}

/**
 * Snap a wanted time to the nearest bar line, so a cue that was written as a
 * rough second-count still lands musically. Returns the snapped time and how
 * far it moved, because a snap of more than half a beat usually means the
 * wanted time was wrong rather than merely imprecise.
 */
export function snapToBar(track: Track, seconds: number): { at: number; driftSec: number } {
  const index = Math.round((seconds - track.firstBeatSec) / barSec(track));
  const at = barAt(track, Math.max(0, index));
  return { at, driftSec: at - seconds };
}

/** Whole bars between two times, for checking a structural claim. */
export function barsBetween(track: Track, fromSec: number, toSec: number): number {
  return (toSec - fromSec) / barSec(track);
}

// ------------------------------------------------------------------ the deck

/** The shapes a beat can take (spec §3). Lengths are in BARS. */
export const SHAPE_BARS = {
  SNAP: 1,
  HOLD: 4.5,
  REST: 2,
  DROP: 5.5,
  ROLL: 16,
} as const;

/** The montage accelerates rather than running at one speed (spec §3). */
export const MONTAGE_BARS = [2, 2, 1, 1, 0.5] as const;

/**
 * Turn a run of bar-lengths into cumulative cue times on a track's grid.
 * Every cue lands on the grid by construction, which is the whole point of
 * writing the deck in bars.
 */
export function cueSheet(
  track: Track,
  segments: { id: string; bars: number }[],
  startSec = 0
): { id: string; atSec: number; durationSec: number; bars: number }[] {
  let cursor = startSec;
  return segments.map((s) => {
    const durationSec = bars(track, s.bars);
    const cue = { id: s.id, atSec: cursor, durationSec, bars: s.bars };
    cursor += durationSec;
    return cue;
  });
}
