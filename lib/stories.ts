export const TIMING = {
  setupMs: 4000, // setup beat duration
  revealMs: 10000, // public reveal duration
  personalRevealMs: 11000, // personal reveal duration
  momentsMs: 15000, // story 2 reveal (photo cycle needs longer)
  peopleMs: 37000, // story 4 reveal (chaptered credits with per-cast cadence, §11.6 amended)
  storyFadeMs: 240, // crossfade between stories/phases
  countUpMs: 1200, // number roll-up
  staggerMs: 120, // list item stagger
} as const;

export const SPRING = {
  default: { type: "spring", stiffness: 260, damping: 30 } as const,
  stamp: { type: "spring", stiffness: 420, damping: 22 } as const, // story 6 slam
  flip: { type: "spring", stiffness: 190, damping: 24 } as const, // story 8 card flip
  photo: { type: "spring", stiffness: 300, damping: 28 } as const, // story 2 flick
};

export type StoryId =
  | "the-year"
  | "moments"
  | "built"
  | "people"
  | "your-events"
  | "standing"
  | "your-chapter"
  | "your-club"
  | "whats-next"
  | "summary";

export interface StoryDef {
  id: StoryId;
  index: number; // 0-based order
  personal: boolean; // needs snapshot (or renders invitation/guest variant)
  accent: "blue" | "red" | "yellow" | "green" | "club"; // "club" = story 8 resolves at runtime
  field: "ink" | "cream"; // background field
  setupMs: number; // TIMING.setupMs unless noted
  revealMs: number; // per-story reveal duration (TIMING values)
  label: string; // chapter-grid + progress caption, e.g. "The Year"
}

export const STORIES: StoryDef[] = [
  { id: "the-year", index: 0, personal: false, accent: "blue", field: "ink", setupMs: 5500, revealMs: 10000, label: "The Year" },
  { id: "moments", index: 1, personal: false, accent: "red", field: "cream", setupMs: 4000, revealMs: 15000, label: "The Moments" },
  { id: "built", index: 2, personal: false, accent: "blue", field: "ink", setupMs: 4000, revealMs: 11000, label: "What We Built" },
  { id: "people", index: 3, personal: false, accent: "yellow", field: "cream", setupMs: 4000, revealMs: 37000, label: "The People" },
  { id: "your-events", index: 4, personal: true, accent: "blue", field: "ink", setupMs: 4000, revealMs: 10000, label: "Your Events" },
  { id: "standing", index: 5, personal: true, accent: "red", field: "cream", setupMs: 4000, revealMs: 10000, label: "Your Standing" },
  { id: "your-chapter", index: 6, personal: true, accent: "green", field: "ink", setupMs: 4000, revealMs: 10000, label: "Your Chapter" },
  { id: "your-club", index: 7, personal: true, accent: "club", field: "ink", setupMs: 4500, revealMs: 12000, label: "Your Club" },
  { id: "whats-next", index: 8, personal: false, accent: "green", field: "cream", setupMs: 3500, revealMs: 9000, label: "What's Next" },
  { id: "summary", index: 9, personal: true, accent: "green", field: "ink", setupMs: 0, revealMs: 0, label: "Your Card" },
];

export function getGuestStoryIndexes(): number[] {
  // Guests see: 0,1,2,3 public, 4 (guest variant), skip 5/6, 7 (guest variant), 8, 9 (guest variant)
  return [0, 1, 2, 3, 4, 7, 8, 9];
}
