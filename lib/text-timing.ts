/**
 * Shared timing math for animated type (build7 §1). "Texts render half"
 * happens when a beat swaps while `PopLetters` is still drawing its letters
 * in — so the entrance duration must be knowable, and long strings must not
 * take forever to finish. One source of truth for both the primitive and the
 * schedulers that decide how long a beat holds.
 */
export type PopProfile = "default" | "fast";

const RAW_STAGGER: Record<PopProfile, number> = { default: 45, fast: 24 };
// No headline should take longer than this to fully draw — long strings scale
// their per-letter stagger down so the last letter still lands in time.
const MAX_ENTRANCE_MS = 900;
const MIN_STAGGER_MS = 12;
// The per-letter spring (stiffness 500 / damping 18) settles in ~0.4s.
const SPRING_SETTLE_MS = 420;
// Time to actually read a beat after it finishes drawing, before it may swap.
export const READ_FLOOR_MS = 1400;

function letterCount(text: string): number {
  return text.replace(/\s+/g, "").length || 1;
}

/** Per-letter stagger, clamped so a long string finishes within
    MAX_ENTRANCE_MS instead of typewriter-ing past its own beat. */
export function popLettersStaggerMs(text: string, profile: PopProfile = "default"): number {
  const n = letterCount(text);
  const raw = RAW_STAGGER[profile];
  return Math.min(raw, Math.max(MIN_STAGGER_MS, Math.round(MAX_ENTRANCE_MS / n)));
}

/** How long the full per-letter entrance takes, start to settled. */
export function popLettersEntranceMs(text: string, profile: PopProfile = "default"): number {
  const n = letterCount(text);
  return (n - 1) * popLettersStaggerMs(text, profile) + SPRING_SETTLE_MS;
}

/** The floor a beat containing this text must hold for: long enough to fully
    draw AND be read. Schedulers raise any shorter beat to this. */
export function minBeatHoldMs(text: string, profile: PopProfile = "default"): number {
  return popLettersEntranceMs(text, profile) + READ_FLOOR_MS;
}
