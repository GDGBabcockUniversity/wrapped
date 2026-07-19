export const TIMING = {
  setupMs: 3200, // setup beat duration
  revealMs: 10000, // public reveal duration
  personalRevealMs: 11000, // personal reveal duration
  momentsMs: 13000, // story 2 reveal
  peopleMs: 60000, // story 4 reveal — 46.5s credit schedule / 0.8 (build4 §10B)
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
  | "group-chat"
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
  { id: "the-year", index: 0, personal: false, accent: "blue", field: "ink", setupMs: 5600, revealMs: 8000, label: "The Year" },
  // revealMs 30000 (build7 §4): 7 stylised pages × PAGE_MS 3800 = 26,600ms
  // scripted, then the last page's hold hands off via onComplete — so
  // revealMs is a backstop above the scripted total, no dead air.
  { id: "moments", index: 1, personal: false, accent: "red", field: "cream", setupMs: 3000, revealMs: 30000, label: "The Moments" },
  // revealMs covers the product saga's fully-filled worst case (build5 §3.2):
  // rollcall 4500 + RADAR-full 5400 + VOTES-full 3400 + ORBIT-full 16000
  // (1400+2200+1800+1800+2400+1600+1600+1400+1800) + quick beats 5200 =
  // 34500 scripted, plus the guess game's worst case — a full 6000ms wait
  // (visitor-paced, exempt from the 80% rule per build4 §8.2) plus its
  // mandatory 2400ms post-answer hold, which DOES need the rule's headroom:
  // (34500 + 6000 + 2400) / 0.8 = 53625, rounded up. Null-skipped TBDs only
  // ever shorten the actual run.
  { id: "built", index: 2, personal: false, accent: "blue", field: "ink", setupMs: 3200, revealMs: 54000, label: "What We Built" },
  // revealMs 42000 (build6 §6.3): the topics engine adds 4 beats (topics,
  // vocabulary, emoji podium, starters) at 2600ms each — +10,400ms over
  // build5 §4.4's 9-beat, 22,800ms baseline = 33,200ms scripted worst
  // case; 33200/0.8 = 41,500, rounded up.
  { id: "group-chat", index: 3, personal: false, accent: "green", field: "ink", setupMs: 3200, revealMs: 42000, label: "The Group Chat" },
  // revealMs 64000 → 103000 (build5 §6.7): the sponsor wall (real ORBIT
  // data) plus the four-chapter closer arc (advisors/MVPs/special force)
  // replace the old two-slide special thanks — cards 23,100ms + content
  // 58,950ms = 82,050ms scripted; 82050/0.8 = 102,562.5, rounded up.
  { id: "people", index: 4, personal: false, accent: "yellow", field: "cream", setupMs: 3500, revealMs: 103000, label: "The People" },
  { id: "your-events", index: 5, personal: true, accent: "blue", field: "ink", setupMs: 3200, revealMs: 8500, label: "Your Events" },
  { id: "standing", index: 6, personal: true, accent: "red", field: "cream", setupMs: 3200, revealMs: 8500, label: "Your Standing" },
  { id: "your-chapter", index: 7, personal: true, accent: "green", field: "ink", setupMs: 3200, revealMs: 8500, label: "Your Chapter" },
  { id: "your-club", index: 8, personal: true, accent: "club", field: "ink", setupMs: 3500, revealMs: 10000, label: "Your Club" },
  { id: "whats-next", index: 9, personal: false, accent: "green", field: "cream", setupMs: 3000, revealMs: 8000, label: "What's Next" },
  { id: "summary", index: 10, personal: true, accent: "green", field: "ink", setupMs: 0, revealMs: 0, label: "Your Card" },
];

export function getGuestStoryIndexes(): number[] {
  // Guests see: 0,1,2,3 public (the-year/moments/built/group-chat), 4
  // (people, public), 5 (your-events guest variant), skip 6/7 (standing,
  // your-chapter — members only), 8 (your-club guest variant), 9, 10
  // (summary guest variant).
  return [0, 1, 2, 3, 4, 5, 8, 9, 10];
}

// Shader figure branch per story (build5 §4.4) — branches live in
// components/gl/shaders.ts and keep their historical numbering (the
// overture's warp field is branch 10; player.tsx overrides to it for
// the-year's setup window). group-chat rides the-year's diagonal stripe
// band (branch 0) — its green accent walks the same runner, no new GLSL.
export const SHADER_STORY: Record<StoryId, number> = {
  "the-year": 0,
  moments: 1,
  built: 2,
  "group-chat": 0,
  people: 3,
  "your-events": 4,
  standing: 5,
  "your-chapter": 6,
  "your-club": 7,
  "whats-next": 8,
  summary: 9,
};
