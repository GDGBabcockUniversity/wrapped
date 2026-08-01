import { STORIES, SHADER_STORY, type StoryId } from "@/lib/stories";
import type { Beat } from "@/lib/deck";
import type { Phase } from "@/components/story-engine/use-story-state";

/**
 * What each beat of the new running order LOOKS like.
 *
 * The twelve story components in components/stories carry the whole visual
 * system — the shader field branch, the overture's warp drive, the receipt
 * that prints, the polaroid flick, the club card flip, the credits crawl.
 * Re-cutting the running order was never a reason to abandon them, and
 * rendering the new deck as centred text on a fade threw away every bit of it.
 *
 * So the deck drives the existing components. Ten of the twelve beats map onto
 * one directly; the two genuinely new beats get a treatment built from the
 * same primitives rather than a plainer one.
 */
export interface BeatVisual {
  /** The story component that renders this beat, if one fits. */
  story?: StoryId;
  /** Which of that component's two beats to show. */
  phase: Phase;
  /** Shader branch, accent and field come from the mapped story unless set. */
  field?: "ink" | "cream";
  accent?: "blue" | "red" | "yellow" | "green" | "club";
  shader?: number;
}

export const BEAT_VISUALS: Record<string, BeatVisual> = {
  // The overture, unchanged: cover card, numeral drive-through over the warp
  // field, calm resolve.
  "cold-open": { story: "the-year", phase: "setup" },
  // Built, not borrowed: the era stamp is new writing and your-chapter has
  // no idea it exists.
  arrival: { phase: "reveal", field: "ink", accent: "blue", shader: SHADER_STORY["your-chapter"] },
  // NOT the receipt. §02: "Never five numbers on one screen. One number per
  // screen is the whole difference between a recap and a dashboard." The
  // receipt is a lovely object that puts all five on one till roll.
  "the-year": { phase: "reveal", field: "ink", accent: "blue", shader: SHADER_STORY["the-year"] },
  built: { story: "built", phase: "reveal" },
  moments: { story: "moments", phase: "reveal" },
  "group-chat": { story: "group-chat", phase: "reveal" },
  // New. Built from SlamStat and PopLetters, on group-chat's shader branch so
  // it reads as part of the same movement.
  "loudest-day": { phase: "reveal", field: "ink", accent: "green", shader: SHADER_STORY["group-chat"] },
  // The social graph. your-events renders an attendance record, which is a
  // different beat wearing similar numbers.
  rooms: { phase: "reveal", field: "ink", accent: "blue", shader: SHADER_STORY["your-events"] },
  // standing renders a percentile. This beat is a name, and the engine that
  // assigns it had no way onto the screen at all.
  title: { phase: "reveal", field: "cream", accent: "red", shader: SHADER_STORY.standing },
  // OBSERVER and SPRINTER are gone; the guess, the definition, the role and
  // the because-line are all new (§09).
  club: { phase: "reveal", field: "ink", accent: "club", shader: SHADER_STORY["your-club"] },
  people: { story: "people", phase: "reveal" },
  handover: { phase: "reveal", field: "cream", accent: "green", shader: SHADER_STORY["whats-next"] },
};

const BY_ID = new Map(STORIES.map((s) => [s.id, s]));

export interface ResolvedVisual {
  story?: StoryId;
  phase: Phase;
  field: "ink" | "cream";
  accent: "blue" | "red" | "yellow" | "green" | "club";
  shader: number;
}

export function visualFor(beat: Beat): ResolvedVisual {
  const v = BEAT_VISUALS[beat.id] ?? { phase: "reveal" as Phase };
  const def = v.story ? BY_ID.get(v.story) : undefined;
  return {
    story: v.story,
    phase: v.phase,
    field: v.field ?? def?.field ?? "ink",
    accent: v.accent ?? def?.accent ?? "blue",
    shader: v.shader ?? (v.story ? SHADER_STORY[v.story] : 0),
  };
}

/**
 * Where the next screen travels in from. Stories live on a plane and advancing
 * whips the camera across it; a deck that always slides the same way reads as
 * a slideshow. Index i is the boundary between beat i and i+1.
 */
export const CAMERA_PATH: [number, number][] = [
  [0, 1],  // cold-open -> arrival        down
  [1, 0],  // arrival -> the-year         across
  [1, 1],  // the-year -> built           diagonal
  [-1, 1], // built -> moments            diagonal back
  [0, 1],  // moments -> group-chat       down
  [1, 0],  // group-chat -> loudest-day   across
  [0, 1],  // loudest-day -> rooms        down
  [-1, 1], // rooms -> title              diagonal
  [1, 0],  // title -> club               across
  [1, 1],  // club -> people              diagonal, out of the identity high
  [0, 1],  // people -> handover          down, the exhale
];

export function vectorBetween(fromIndex: number, toIndex: number): [number, number] {
  const boundary = Math.min(fromIndex, toIndex);
  const [x, y] = CAMERA_PATH[boundary] ?? [0, 1];
  return toIndex >= fromIndex ? [x, y] : [-x, -y];
}
