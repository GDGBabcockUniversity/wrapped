import { TRACKS, bars, type Track, type TrackId } from "@/lib/tempo";

/**
 * The running order (build spec §4), written the way the spec insists it be
 * written: in BARS, against a measured tempo. Nothing here is a second-count.
 *
 * The braid is the rule that breaks every tie — never more than two org beats
 * before a personal one, and every org stat hands off to a personal number.
 * `audience` below is what makes that checkable rather than aspirational, and
 * lib/deck.test.ts fails the build if the order ever violates it.
 */

export type Shape =
  | "COLD"
  | "SNAP"
  | "HOLD"
  | "MONTAGE"
  | "GATE"
  | "STOP"
  | "DROP"
  | "REST"
  | "ROLL";

/** Five movements, five tracks. A track change means a new act — which only
    reads as meaningful because there are five of them and not thirteen. */
export type Movement = "arrival" | "proof" | "recognition" | "identity" | "succession";

export const MOVEMENTS: Record<Movement, { numeral: string; feeling: string }> = {
  arrival: { numeral: "I", feeling: "oh, this is about me" },
  proof: { numeral: "II", feeling: "we actually did that" },
  recognition: { numeral: "III", feeling: "they were watching" },
  identity: { numeral: "IV", feeling: "that's what I am" },
  succession: { numeral: "V", feeling: "it keeps going" },
};

/**
 * Which track carries which movement, and from where in it.
 *
 * Movements II, III and IV are STAND-INS. The spec asks for three tracks from
 * during the academic year and those files do not exist yet, so each borrows a
 * different section of a track that does. They are marked rather than hidden:
 * a stand-in that looks like a decision is how a placeholder ships.
 *
 * Swapping one in later is a change to this table and nothing else — the deck
 * below is written in bars, so a new tempo re-derives every duration.
 */
export interface MovementAudio {
  track: TrackId;
  /** Seconds into the source file where this movement's audio starts. */
  fromSec: number;
  /** True while this is borrowed audio rather than the intended track. */
  standIn: boolean;
  /** What the spec asks for here. */
  wants: string;
}

export const MOVEMENT_AUDIO: Record<Movement, MovementAudio> = {
  // The cold open and the arrival HOLD, exactly as scored in §8.2: the intro
  // carries the three cold-open lines and the wordless refrain at 0:16.96
  // carries the text-heavy arrival beat, because sung vowels with no lexical
  // content do not compete with reading.
  arrival: { track: "mcbh", fromSec: 0, standIn: false, wants: "MCBH" },
  // §8.2's own suggested option: hold MCBH into the year montage, where
  // "Proper, we gon' prosper" sits under the org receipts.
  proof: { track: "mcbh", fromSec: 33.83, standIn: true, wants: "T2 — from during the year" },
  recognition: { track: "mcbh", fromSec: 66.0, standIn: true, wants: "T3 — from during the year" },
  identity: { track: "gratitude", fromSec: 96.0, standIn: true, wants: "T4 — from during the year" },
  succession: { track: "gratitude", fromSec: 0, standIn: false, wants: "Gratitude" },
};

/** Who a beat is about. The braid is enforced against this. */
export type Audience = "org" | "personal" | "both";

export interface Beat {
  id: string;
  shape: Shape;
  movement: Movement;
  audience: Audience;
  /** Length in bars. Every duration in the deck comes from here. */
  bars: number;
  label: string;
  /** Org beats that must end on a personal number (§1). */
  handsOff?: boolean;
  /** Waits for a tap rather than a timer. */
  interactive?: boolean;
  /** Skipped when the member has no data for it. */
  optional?: boolean;
}

/**
 * Bar lengths are the spec's second-counts converted at 114 BPM (bar =
 * 2.1053s) and rounded to the nearest half bar, because a beat ending mid-bar
 * puts the next one's opening frame off the grid.
 *
 * Rounding goes DOWN where it is a coin flip. Rounding each beat up
 * independently looks harmless and cost four seconds across twelve beats,
 * which is the kind of overrun that gets taken out of the handover later
 * because it is the last thing in the deck.
 */
export const DECK: Beat[] = [
  { id: "cold-open", shape: "COLD", movement: "arrival", audience: "both", bars: 8, label: "Cold open" },
  { id: "arrival", shape: "HOLD", movement: "arrival", audience: "personal", bars: 8, label: "Your arrival" },

  { id: "the-year", shape: "MONTAGE", movement: "proof", audience: "org", bars: 5, label: "The year", handsOff: true },
  { id: "built", shape: "MONTAGE", movement: "proof", audience: "org", bars: 5.5, label: "What we built", handsOff: true },
  { id: "moments", shape: "MONTAGE", movement: "proof", audience: "both", bars: 4, label: "The moments" },

  { id: "group-chat", shape: "MONTAGE", movement: "recognition", audience: "org", bars: 4, label: "The group chat", handsOff: true },
  { id: "loudest-day", shape: "DROP", movement: "recognition", audience: "personal", bars: 5, label: "Your loudest day" },
  { id: "rooms", shape: "HOLD", movement: "recognition", audience: "personal", bars: 5.5, label: "Your rooms", optional: true },

  { id: "title", shape: "GATE", movement: "identity", audience: "personal", bars: 5, label: "Your title", interactive: true },
  { id: "club", shape: "STOP", movement: "identity", audience: "personal", bars: 4, label: "Your club", interactive: true },

  { id: "people", shape: "ROLL", movement: "succession", audience: "org", bars: 16, label: "The people" },
  { id: "handover", shape: "DROP", movement: "succession", audience: "both", bars: 6, label: "The handover" },
];

/** The card idles at the end and never auto-advances, so it has no bar length. */
export const CARD_ID = "card";

// ------------------------------------------------------------------ timings

export function trackFor(movement: Movement): Track {
  return TRACKS[MOVEMENT_AUDIO[movement].track];
}

export interface TimedBeat extends Beat {
  /** Seconds from the start of the deck. */
  atSec: number;
  durationSec: number;
  track: TrackId;
}

/**
 * The whole deck on a timeline. Durations come from each beat's own movement's
 * track, so a stand-in swapped for a track at a different tempo re-times
 * itself rather than drifting.
 */
export function timeline(deck: Beat[] = DECK): TimedBeat[] {
  let cursor = 0;
  return deck.map((beat) => {
    const track = trackFor(beat.movement);
    const durationSec = bars(track, beat.bars);
    const timed: TimedBeat = {
      ...beat,
      atSec: cursor,
      durationSec,
      track: MOVEMENT_AUDIO[beat.movement].track,
    };
    cursor += durationSec;
    return timed;
  });
}

export function runtimeSec(deck: Beat[] = DECK): number {
  return timeline(deck).reduce((a, b) => a + b.durationSec, 0);
}

/** Where each movement starts and ends on the deck timeline. */
export function movementSpans(deck: Beat[] = DECK) {
  const spans = new Map<Movement, { fromSec: number; toSec: number; beats: string[] }>();
  for (const b of timeline(deck)) {
    const span = spans.get(b.movement);
    if (span) {
      span.toSec = b.atSec + b.durationSec;
      span.beats.push(b.id);
    } else {
      spans.set(b.movement, { fromSec: b.atSec, toSec: b.atSec + b.durationSec, beats: [b.id] });
    }
  }
  return spans;
}

// -------------------------------------------------------------- the braid

/**
 * Runs of consecutive org beats. The spec allows two; three means the deck has
 * drifted into being about the chapter.
 */
export function orgRuns(deck: Beat[] = DECK): { run: string[]; length: number }[] {
  const runs: { run: string[]; length: number }[] = [];
  let current: string[] = [];
  for (const b of deck) {
    if (b.audience === "org") {
      current.push(b.id);
    } else if (current.length) {
      runs.push({ run: [...current], length: current.length });
      current = [];
    }
  }
  if (current.length) runs.push({ run: current, length: current.length });
  return runs;
}

export const MAX_ORG_RUN = 2;

/** Every way the running order can violate its own rules. Empty is passing. */
export function violations(deck: Beat[] = DECK): string[] {
  const out: string[] = [];

  for (const { run, length } of orgRuns(deck)) {
    if (length > MAX_ORG_RUN) {
      out.push(`${length} org beats in a row (${run.join(" -> ")}); the braid allows ${MAX_ORG_RUN}`);
    }
  }

  for (const b of deck) {
    if (b.audience === "org" && b.shape === "MONTAGE" && !b.handsOff) {
      out.push(`${b.id} is an org montage that never hands off to a personal number`);
    }
  }

  // The whole point of five tracks is that a change signifies an act change.
  const seen = new Set<Movement>();
  let last: Movement | null = null;
  for (const b of deck) {
    if (b.movement !== last) {
      if (seen.has(b.movement)) out.push(`movement ${b.movement} is re-entered after leaving it`);
      seen.add(b.movement);
      last = b.movement;
    }
  }

  const interactives = deck.filter((b) => b.interactive).length;
  if (interactives > 2) out.push(`${interactives} interactions; three dilute each other (§7)`);

  return out;
}
