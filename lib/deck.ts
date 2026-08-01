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
  // Starts on the DROP at 0:18, not the intro (owner). MCBH's first seventeen
  // seconds are three spoken phrases over almost nothing, and opening a
  // Wrapped on them asks for patience before it has earned any. 0:16.96 is
  // where the wordless refrain lands, so 18s puts the first frame on the hook.
  //
  // It also happens to be the best copy bed on the track: sung vowels with no
  // lexical content, so the text-heavy opening beats do not compete with a
  // lyric for the same attention.
  arrival: { track: "mcbh", fromSec: 18, standIn: false, wants: "MCBH" },
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
 * Bar lengths are what the CUT content needs (lib/deck-cuts.ts), converted at
 * the carrying track's measured tempo and rounded up to the half bar.
 *
 * The first cut of this took the spec's second-counts literally — 12s for
 * "what we built", 34s for the credits — and that silently truncated every
 * beat backed by a story component that scripts its own sequence. `people`
 * reached 41% of its roster before the beat ended, so most of the team, the
 * sponsor wall, the MVPs and the design force were simply never drawn.
 * `group-chat` reached 16%. Nothing was removed; the beats just stopped
 * early, which looks exactly the same from the outside.
 *
 * Both halves have to move together. The spec shortens these beats AND cuts
 * what they show; taking only the durations truncates, and taking only the
 * content leaves the deck padded. Every length below is the measured schedule
 * of the CUT sequence, so each beat plays to its last frame:
 *
 *   built        18.5 bars   12 beats of the saga, 38.0s
 *   moments        10 bars   5 photo pages, 19.0s
 *   group-chat      8 bars   4 beats, 15.8s
 *   people         29 bars   12 chapters, the roster with faces
 *
 * Trim further by cutting content in deck-cuts.ts and re-deriving these.
 * Never by shortening a beat and leaving its sequence alone.
 */
export const DECK: Beat[] = [
  { id: "cold-open", shape: "COLD", movement: "arrival", audience: "both", bars: 8, label: "Cold open" },
  { id: "arrival", shape: "HOLD", movement: "arrival", audience: "personal", bars: 8, label: "Your arrival" },

  { id: "the-year", shape: "MONTAGE", movement: "proof", audience: "org", bars: 5, label: "The year", handsOff: true },
  { id: "built", shape: "MONTAGE", movement: "proof", audience: "org", bars: 18.5, label: "What we built", handsOff: true },
  { id: "moments", shape: "MONTAGE", movement: "proof", audience: "both", bars: 10, label: "The moments" },

  { id: "group-chat", shape: "MONTAGE", movement: "recognition", audience: "org", bars: 8, label: "The group chat", handsOff: true },
  { id: "loudest-day", shape: "DROP", movement: "recognition", audience: "personal", bars: 5, label: "Your loudest day" },
  { id: "rooms", shape: "HOLD", movement: "recognition", audience: "personal", bars: 5.5, label: "Your rooms", optional: true },

  { id: "title", shape: "GATE", movement: "identity", audience: "personal", bars: 5, label: "Your title", interactive: true },
  { id: "club", shape: "STOP", movement: "identity", audience: "personal", bars: 5, label: "Your club", interactive: true },

  { id: "people", shape: "ROLL", movement: "succession", audience: "org", bars: 29, label: "The people" },
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
