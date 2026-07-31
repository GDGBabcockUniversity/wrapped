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

// The overture's three setup beats (2026-07-20): a legible COVER title card
// first — the old opener dropped visitors straight into the warp-field
// numeral belt, which read as "the first page is…?" — then the drive-through,
// then the calm two-line beat. the-year's setupMs must equal cover + drive +
// calm. Shared here because player.tsx times the warp-field shader window
// off the same numbers.
//
// Retimed 2026-07-31 (owner: the first story "is like 3 seconds"). The
// overture was the fastest-cut passage in the whole deck and it sat at the
// one moment nobody is oriented yet: cover 2000 and calm 2000, against
// moments' 3800 pages, built's 3200 stat floor and group-chat's 3600-4400
// (itself widened in build7 §6 to "calm down, this is a journey"). Five
// pieces of text went past in 7.4s, so the deck opened at roughly half the
// tempo it then settled into — hurried first, relaxed after, which is
// backwards. These now sit inside the deck's own established rhythm.
export const OVERTURE = {
  coverMs: 3400,
  driveMs: 4000,
  calmMs: 3400,
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
  | "your-radar"
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
  // setupMs = OVERTURE.coverMs + driveMs + calmMs (cover beat added 2026-07-20).
  // revealMs stays 8000: the receipt's clip wipe, row stagger and count-ups
  // all settle by ~2s, so the reveal already holds for six seconds. The
  // opener's problem was never this beat.
  { id: "the-year", index: 0, personal: false, accent: "blue", field: "ink", setupMs: 10800, revealMs: 8000, label: "The Year" },
  // revealMs 46000 (full slate, 2026-07-20): 11 stylised pages × PAGE_MS
  // 3800 = 41,800ms scripted, then the last page's hold hands off via
  // onComplete — so revealMs is a backstop above the scripted total, no
  // dead air.
  { id: "moments", index: 1, personal: false, accent: "red", field: "cream", setupMs: 3000, revealMs: 46000, label: "The Moments" },
  // revealMs re-derived 2026-07-20 with build6 §2.5 beat floors and every
  // saga stat now owner-confirmed: rollcall 4500 + RADAR 13600 (issues 3200
  // + reads 3200 + most-read 3200 + games 4000) + VOTES 6400 + ORBIT 27600
  // (2200+4000+3200+3200+3200+3200+3200+2200+3200) + BABCOCK100 3200 =
  // 55,300 scripted, plus the guess game's worst case (6000ms wait + 2400ms
  // post-answer hold) with the 80% rule's headroom:
  // (55300 + 6000 + 2400) / 0.8 = 79,625, rounded up. A future website
  // stat adds one 3200ms beat inside this margin.
  { id: "built", index: 2, personal: false, accent: "blue", field: "ink", setupMs: 3200, revealMs: 80000, label: "What We Built" },
  // revealMs 42000 (build6 §6.3): the topics engine adds 4 beats (topics,
  // vocabulary, emoji podium, starters) at 2600ms each — +10,400ms over
  // build5 §4.4's 9-beat, 22,800ms baseline = 33,200ms scripted worst
  // case; 33200/0.8 = 41,500, rounded up.
  // build7 §6 supersedes: beats re-timed to breathe (~3800–4400ms each, was
  // ~2200–2800) — "calm down, this is a journey." 13 beats ~52,600ms scripted,
  // then onComplete hands off after the final beat's hold; revealMs 56000 is
  // the backstop above that.
  { id: "group-chat", index: 3, personal: false, accent: "green", field: "ink", setupMs: 3200, revealMs: 56000, label: "The Group Chat" },
  // revealMs 64000 → 103000 (build5 §6.7): the sponsor wall (real ORBIT
  // data) plus the four-chapter closer arc (advisors/MVPs/special force)
  // replace the old two-slide special thanks — cards 23,100ms + content
  // 58,950ms = 82,050ms scripted; 82050/0.8 = 102,562.5, rounded up.
  { id: "people", index: 4, personal: false, accent: "yellow", field: "cream", setupMs: 3500, revealMs: 103000, label: "The People" },
  { id: "your-events", index: 5, personal: true, accent: "blue", field: "ink", setupMs: 3200, revealMs: 8500, label: "Your Events" },
  // Sits with your-events because it's the other half of "what you actually
  // did". revealMs 9500: up to 4 beats (reads, games, streak, top game) at
  // the build6 §2.5 stat floor of 3200 would be 12,800 scripted worst case,
  // but the story renders them as one composed board rather than sequential
  // beats — 9500 matches its siblings and leaves the same headroom.
  { id: "your-radar", index: 6, personal: true, accent: "red", field: "ink", setupMs: 3200, revealMs: 9500, label: "Your RADAR" },
  { id: "standing", index: 7, personal: true, accent: "red", field: "cream", setupMs: 3200, revealMs: 8500, label: "Your Standing" },
  { id: "your-chapter", index: 8, personal: true, accent: "green", field: "ink", setupMs: 3200, revealMs: 8500, label: "Your Chapter" },
  { id: "your-club", index: 9, personal: true, accent: "club", field: "ink", setupMs: 3500, revealMs: 10000, label: "Your Club" },
  { id: "whats-next", index: 10, personal: false, accent: "green", field: "cream", setupMs: 3000, revealMs: 8000, label: "What's Next" },
  { id: "summary", index: 11, personal: true, accent: "green", field: "ink", setupMs: 0, revealMs: 0, label: "Your Card" },
];

export function getGuestStoryIndexes(): number[] {
  // Guests see: 0,1,2,3 public (the-year/moments/built/group-chat), 4
  // (people, public), 5 (your-events guest variant), skip 6/7/8 (your-radar,
  // standing, your-chapter — members only), 9 (your-club guest variant), 10,
  // 11 (summary guest variant).
  return [0, 1, 2, 3, 4, 5, 9, 10, 11];
}

/**
 * Stories a signed-in member still skips because the snapshot has nothing to
 * show. RADAR is opt-in — plenty of members never opened it, and an empty
 * "you read 0 things" slide is worse than no slide (same null-skip contract
 * as the chapter beats in lib/content/chapter.ts).
 */
export function skipsForSnapshot(snapshot: { radar?: unknown } | null): StoryId[] {
  if (!snapshot) return [];
  return snapshot.radar ? [] : ["your-radar"];
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
  // Rides moments' branch (1) — its red accent walks the same runner, so the
  // new story needs no new GLSL, the way group-chat reuses branch 0.
  "your-radar": 1,
  standing: 5,
  "your-chapter": 6,
  "your-club": 7,
  "whats-next": 8,
  summary: 9,
};
