# GDG Wrapped — build5: the story pass (product receipts, the group chat, human credits)

This document AMENDS `build.md`, `build2.md`, `build3.md`, and `build4.md`.
Everything in those files stays in force — especially the prime directive:

> **DO NOT INVENT.** Every design token, animation value, copy line, formula,
> and threshold you need is specified. If something seems missing, re-read the
> spec; if it is genuinely missing, stop and ask — do not fill the gap with
> your own idea.

Where this file conflicts with earlier build docs, **this file wins**.
Specifically superseded by this pass:

- build4 §10A.2 (product stats slamming inside the index row cycle) — stats
  now live in per-product saga chapters (§3 here); the index cycle shortens.
- build4 §10B.3 item 1 (media subteam chips inside one grid) — MEDIA becomes
  five separate chapters (§6.4 here); the chips-in-one-grid layout is dead.
- build4 §10B.3 item 5 (two special-thanks slides) — special thanks is now a
  four-chapter arc (§6.6 here).
- The lead ring + lead size-step in the credits (build4 §10B.1) — removed
  (§6.2 here). Leads keep their position in the order, nothing else.

Git conventions are unchanged from build.md §1: work **directly on `main`**,
**no feature branches**, unsigned commits, single author, no co-author
trailers, one commit per numbered step in §9 with exactly the message given
there, `git push -u origin main` after each (network-retry backoff per
build.md §1.1).

---

## 0. What the owner said, and what the data says

The owner reviewed the current build against a fresh recording of the real
Spotify Wrapped 2025 flow (both recordings were frame-extracted and studied
for this pass) and supplied the main community group's WhatsApp export
(`main_chat.txt`). The verdict, distilled:

1. Motion and interactivity are getting close. The remaining gap is
   **story**: Wrapped must *tell the year* — what the products did, what the
   group chat was like, who the humans were — not just show screens.
2. Spotify's own progress chrome is nearly invisible ("by the side and you
   can barely see it"). Ours is a loud top bar. Fix: §2.
3. The product story must carry receipts: Radar's articles/most-read/games,
   BabcockVotes' elections, and a full ORBIT stat arc (companies visited,
   students to Lagos, career fair, summit, speakers, sponsors, headline
   sponsor teased before it's shown). **Unverifiable numbers are pipeline
   placeholders, never blockers.** Fix: §3.
4. The group chat deserves its own story: fun summaries, most active
   subgroup, word stats. Subgroup exports are still coming — plan for them.
   Fix: §4 + §5.
5. The credits are boring: pictures too small, roles missing, leads
   circled, everything symmetrical. Media team crammed on one page. Track
   names abbreviated. Fix: §6.
6. The Moments frames (ORBIT / DEVFEST) are boring. Fix: §7.
7. Sponsors now have a real source of truth: the ORBIT repo. Special thanks
   restructures into advisors + MVPs + the design special force. Fix: §6.5–6.6.

### 0.1 The data ledger — what is VERIFIED vs PIPELINE-PENDING

Verified values below were read directly from the ORBIT repo
(`src/lib/constants.ts`), the Radar repo (`app/lib/games.ts`), or computed
from the real `main_chat.txt` export on 2026-07-19. Use them as literals.
Everything marked **TBD** renders NOTHING until a lead fills it (build.md §15
rule: no blanks, no zeros, the beat is skipped) — and each TBD is printed by
the pipeline report (§5.3) so filling it is a paste, not a hunt.

| Fact | Value | Status |
|---|---|---|
| ORBIT tickets issued / checked in | 547 / 252 | VERIFIED (build4 §10A) |
| ORBIT industry-visit companies | 5 — Paystack, Digital Encode, Rise, Nithub, Cubbes | VERIFIED (orbit repo) |
| ORBIT speakers on stage | 12 (+2 panel moderators) | VERIFIED (orbit repo) |
| ORBIT sponsors & partners | 23 across 9 tiers | VERIFIED (orbit repo) |
| ORBIT headline sponsor | Moniepoint | VERIFIED (orbit repo) |
| Students taken to Lagos | — | TBD (pipeline) |
| Career fair turnout | — | TBD (pipeline) |
| Summit-day turnout | — | TBD (pipeline; 252 checked-in may be it — owner confirms) |
| Radar games shipped | 7 — Signal, Crosslinks, Cryptic, Rapid Fire, New Year New Lies, Valentine's Match, Find Your Track | VERIFIED (radar repo) |
| Radar articles published | — | TBD (pipeline; Sanity count) |
| Radar most-read article | — | TBD (pipeline) |
| Radar total reads / game plays | — | TBD (pipeline; Redis) |
| BabcockVotes elections run | — | TBD (pipeline) |
| BabcockVotes votes cast | — | TBD (pipeline) |
| Main-chat messages parsed | 10,201 | VERIFIED (computed; floor — see §4.1) |
| Most active subgroup | — | TBD (awaiting subgroup exports, §5.2) |

---

## 1. Two laws added to build4's seven

8. **The chrome whispers.** Navigation and progress exist for the visitor's
   thumb, not their eyes. If a first-time viewer *notices* the progress bar,
   it is too loud. The story is the interface.
9. **Numbers are characters, not decoration.** Every stat beat is one
   number with one consequence ("1,140 messages — one game night went
   completely off the rails"). A number without a story line attached does
   not ship; a story line without a verified number waits in the pipeline.

---

## 2. The whisper rail — progress chrome rebuild

Rebuild `components/story-engine/progress-bar.tsx`. The top segmented bar,
the persistent story label, and the top-row layout are all removed. What
replaces them:

### 2.1 The rail

- A **vertical** rail hugging the RIGHT edge: `absolute right-[6px] z-20`,
  spanning `top: max(24px, env(safe-area-inset-top) + 12px)` to
  `bottom: max(24px, env(safe-area-inset-bottom) + 12px)`, laid out as a
  flex column with `gap: 4px`.
- One segment per story (same `total` / `currentPos` props): each segment
  `flex-1`, `width: 2px`, `rounded-full`, track color `bg-cream/20` on ink
  fields / `bg-ink/15` on cream (quieter than today's 25/20).
- Fill: same imperative rAF paint loop, same beat math (setup 0→30%,
  reveal 30→100%) — but the fill scales **scaleY** with `origin-top`
  (vertical bars fill downward). Keep the "React never writes these
  transforms" rule from the current file's comment block verbatim.
- The active segment (and only it) is `width: 3px` with the fill at full
  field color (`bg-cream` / `bg-ink`); past segments' fills render at 55%
  opacity. Future segments stay empty. No accent color — the rail is
  monochrome (law 2: accent belongs to moving story elements, and law 8:
  this must not compete).

### 2.2 Idle behavior — dim, never vanish

- Replace the hide/show opacity flip: idle (same `IDLE_MS = 1800`) dims the
  rail to `opacity 0.35`; interaction restores `opacity 0.8` (it never
  reaches 1 — whisper). Same 400ms/150ms transitions.
- The corner buttons (below) dim to 0.3 when idle, 0.6 when awake.

### 2.3 The corner chrome

- Top-right corner (`right-3`, `top: max(12px, safe-area)`), a row with
  `gap-3`: the share chip slot (unchanged mount rules + the 2.2s delay from
  build4 §5.2), the MuteButton, the ⊞ grid button. All rendered at
  `text-base` (down from `text-lg`), field text color, opacity per §2.2.
- The story **label is deleted from persistent chrome**. It lives on in the
  chapter grid (unchanged) — a viewer who wants orientation opens the grid.
- The PAUSED toast in `player.tsx` moves from `top-16 left-1/2` to
  `bottom-20 left-1/2` (the top belongs to nothing now).
- Reduced motion: rail always at awake opacity (discoverability rule from
  the current file stands).

`player.tsx` keeps passing the same props; `label` becomes unused — remove
the prop end-to-end. Verify back-navigation still repaints past/future
fills correctly (the imperative loop already guarantees it).

---

## 3. What We Built becomes the product saga

`03-built.tsx` currently: bars cycle 9000ms → guess game. That structure
stays as the OPEN and the CLOSE, but between them the story now walks
through the products with receipts. This is the owner's "we're supposed to
be telling a story, with the products."

### 3.1 The data (`lib/content/chapter.ts`)

Replace `PRODUCT_STATS` and its `ProductStat` interface (build4 §10A shape)
with the saga block below — `SagaStat` is a structural superset (`value:
number | string` instead of `number`, to carry the headline sponsor's name),
so nothing else needs a parallel type. Add a `productHeadlineStat(name)`
helper alongside it (one representative stat per product — radar picks
`articles` if set else `games`; votes picks `elections`; orbit picks
`tickets`; website/babcock100 pick their own beat) for `BuiltCard` (§3.2
point 5) to source from, replacing its old `PRODUCT_STATS[p.name]` lookup:

```ts
// Product saga beats (build5 §3) — every `null` beat is SKIPPED at render
// (no blank, no zero). The pipeline report (build5 §5.3) prints this whole
// block with real values filled where it can, for paste-back before freeze.
export interface SagaStat {
  value: number | string; // slam numeral or string (e.g. "MONIEPOINT")
  label: string;          // small-caps label
  detail?: string;        // optional second line
}
export const PRODUCT_SAGA = {
  radar: {
    articles: null as SagaStat | null,      // TBD { value, label: "ARTICLES PUBLISHED" }
    mostRead: null as SagaStat | null,      // TBD { value: "<title>", label: "MOST READ" }
    reads: null as SagaStat | null,         // TBD { value, label: "TOTAL READS" }
    games: { value: 7, label: "GAMES SHIPPED" } as SagaStat, // VERIFIED
    gameNames: [
      "SIGNAL", "CROSSLINKS", "CRYPTIC", "RAPID FIRE",
      "NEW YEAR, NEW LIES", "VALENTINE'S MATCH", "FIND YOUR TRACK",
    ],
  },
  votes: {
    elections: null as SagaStat | null,     // TBD { value, label: "ELECTIONS RUN" }
    votesCast: null as SagaStat | null,     // TBD { value, label: "VOTES CAST" }
    fallbackLine: "Democracy, but make it digital.", // shown only if BOTH null
  },
  orbit: {
    intro: "ONE FLAGSHIP. THREE DAYS.",
    companies: { value: 5, label: "COMPANIES VISITED" } as SagaStat, // VERIFIED
    companyNames: ["PAYSTACK", "DIGITAL ENCODE", "RISE", "NITHUB", "CUBBES"],
    lagos: null as SagaStat | null,         // TBD { value, label: "STUDENTS TO LAGOS" }
    careerFair: null as SagaStat | null,    // TBD { value, label: "AT THE CAREER FAIR" }
    summit: null as SagaStat | null,        // TBD { value, label: "AT THE SUMMIT" }
    speakers: { value: 12, label: "SPEAKERS ON STAGE", detail: "and 2 moderators keeping them honest" } as SagaStat, // VERIFIED
    tickets: { value: 547, label: "TICKETS ISSUED", detail: "252 checked in" } as SagaStat, // VERIFIED
    sponsors: { value: 23, label: "SPONSORS & PARTNERS" } as SagaStat,   // VERIFIED
    headlineTease: "And one led the charge.",
    headline: { value: "MONIEPOINT", label: "HEADLINE SPONSOR" } as SagaStat, // VERIFIED
  },
  website: null as SagaStat | null,         // TBD (site analytics)
  babcock100: null as SagaStat | null,      // TBD
} as const;
```

### 3.2 The choreography (`03-built.tsx`)

Reveal timeline, in order (each beat is a full-screen moment inside the
story, crossfading `opacity 0→1 / y 12→0, 250ms easeOut` in, `opacity→0,
200ms` out; the ONE ambient system remains the story's stripe-circle shader
figure — law 1):

1. **The roll-call (4500ms).** The existing redacted-bar product list, but
   the active-row cycle drops from 1800ms to **900ms** per row — a fast
   roll-call, no stats attached anymore (supersedes build4 §10A.2). The
   bars/LIVE chips/active-swell mechanics are otherwise untouched.
2. **RADAR chapter (up to 5400ms).** Chapter header: the product name as a
   redacted bar in `t-display` with its accent, top-left, tilted -2°
   (sticker-chip mount animation from build4 §7.2). Beats, each 1800ms,
   null-skipped:
   - `radar.articles` — SlamStat + label (three-beat layering per build4 §5).
   - `radar.mostRead` — the title on a sticker chip (`t-editorial` size),
     label beneath. Strings don't slam; the chip slaps (stamp spring).
   - `radar.games` — SlamStat "7", label, and the seven `gameNames` as a
     one-line marquee of mini sticker chips (translateX loop, 26s linear,
     duplicated content for seamless wrap — compositor-only). VERIFIED, so
     this beat ALWAYS renders: Radar never shows up empty-handed.
3. **BABCOCKVOTES chapter (3400ms).** Same header treatment. Beats:
   `votes.elections` (1800ms), `votes.votesCast` (1600ms). If BOTH are
   null: one 1800ms beat with `votes.fallbackLine` in `t-editorial`.
4. **ORBIT chapter (up to 16000ms) — the centerpiece.** Beats in exactly
   this order (null-skipped where TBD):
   - `orbit.intro` line, PopLetters fast — 1400ms
   - `orbit.companies` slam + the five `companyNames` as sticker chips
     scattering in (stagger 90ms, rotate cycle -3/2/-1/3/-2°) — 2200ms
   - `orbit.lagos` slam — 1800ms
   - `orbit.careerFair` slam — 1800ms
   - `orbit.summit` slam, and 600ms later `orbit.speakers` lands beside it
     at half scale (two stats, one composition; layering per build4 §5.2)
     — 2400ms. If `summit` is null, `speakers` takes the slam alone.
   - `orbit.tickets` slam — 1600ms
   - `orbit.sponsors` slam — 1600ms
   - `orbit.headlineTease` — the sponsor number EXITS, the line lands alone
     on the field, `t-editorial`, one beat of stillness — 1400ms
   - `orbit.headline` — "MONIEPOINT" slams in `t-monument` sizing with the
     HEADLINE SPONSOR sticker chip beneath. Haptic `vibrate(10)`. — 1800ms
5. **Quick beats (up to 5200ms).** `website` (2600ms) and `babcock100`
   (2600ms) as single-stat beats with their product-name headers,
   null-skipped (today both null → this section renders nothing).
6. **The guess game** (build4 §8) — unchanged mechanics, still the finale,
   still auto-advances via `onComplete`.

Registry (`lib/stories.ts`): built `revealMs 22000 → 54000` — scripted
worst case 4500+5400+3400+16000+5200 = 34,500ms; plus the game's 6000ms
wait + 2400ms hold; (34500+6000+2400)/0.8 = 53,625, rounded up to
**revealMs 54000**. (Show your work in the commit body if any beat
count changes; the formula is (scripted + wait + hold) / 0.8, rounded up
to the next 1000.) The null-skips only ever SHORTEN the run — revealMs is
sized for the fully-filled block, and the guess game's `onComplete`
advances early regardless.

Share card: `BuiltCard` keeps its per-product stat lines — source them
from the saga block's headline number per product (radar → `games` if
`articles` is null, else `articles`; votes → `elections`; orbit →
`tickets`; website/babcock100 → their beat or nothing). Null renders
nothing (unchanged rule).

---

## 4. The Group Chat — a NEW story

The owner: "fun summaries from the whatsapp main group, most active sub
group, fun word stats all of that." This is a new public story between
What We Built and The People.

### 4.1 The data (`lib/content/chapter.ts`) — REAL numbers, computed 2026-07-19

Computed from the real `main_chat.txt` export (iOS dialect, 13,433 raw
lines → 10,097 counted messages after excluding 104 deleted-message bodies,
389 unique senders, 2025-09-09 → 2026-07-18). **The export is missing
roughly three months** (October and November 2025 entirely; September is
3 messages) — every number is a floor, and the copy owns that out loud.
The numbers below are the pipeline's (build5 §5.1's `computeGroupChatStats`)
own output, run against the real export — not a one-off script; a re-run
on a fuller export reprints this exact block, ready to paste. Add:

```ts
// Main-group-chat fun stats (build5 §4) — computed by the pipeline's
// group-stats.ts from the real export, 2026-07-19. The export is PARTIAL
// (missing ~3 months), so these are floors; the copy says so. Re-run the
// pipeline (§5) on a fuller export and paste the reprinted block here.
// Display names are the raw WhatsApp display names — TBD-review: the
// owner may remap any of them before freeze (e.g. "Habibi" -> a preferred
// name).
export const GROUP_CHAT = {
  messages: 10097,
  senders: 389,
  monthsMissing: 3,
  topYappers: [
    { name: "Habibi", count: 1606 },
    { name: "Ekundayo", count: 982 },
    { name: "Chido Offor", count: 667 },
    { name: "Timi Adedayo", count: 510 },
    { name: "Ayomide Agunbiade", count: 452 },
  ],
  busiestDay: { label: "FEB 22", count: 1133, line: "One game night went completely off the rails." },
  peakHourLabel: "9PM", // the 21:00-22:00 bucket
  afterMidnight: 757,   // messages 00:00–04:59
  stickers: 1017,
  deleted: 104,
  laughs: 765, // 😂 + 💀 + 🤣 across the year
  dialect: [
    { word: "sha", count: 114 },
    { word: "dey", count: 91 },
    { word: "abeg", count: 45 },
    { word: "una", count: 38 },
    { word: "omo", count: 37 },
  ],
  streakDays: 29, // consecutive days with messages, starting Jun 8
  topSubgroup: null as { name: string; messages: number } | null, // TBD — §5.2
} as const;
```

(Provenance, for the curious: the busiest-day line is earned — the Feb 22
transcript is a points-scored game night; "9pm guys" is in it. Unsaved
contacts — senders whose display name starts with "~" — are excluded from
the yapper leaderboard; two of them would otherwise chart. The `deleted`
count only became accurate once §5.1's `cleanBody` fix landed — the
original exact-string match missed WhatsApp's real "This message was
deleted." trailing period and its admin-deletion variant entirely, which
also nudged `messages` down from an earlier rough estimate.)

### 4.2 Copy (`lib/copy.ts`)

```ts
groupChat: {
  setup: "We need to talk about the group chat.",
  revealLabel: "THE MAIN CHAT · 25/26",
  messagesLabel: "MESSAGES SENT",
  messagesDetail: "and that's with {monthsMissing} months missing",
  yappersTitle: "The loudest among us.",
  busiestLabel: "MESSAGES IN ONE DAY",
  nightTitle: "Peak hour: {peakHourLabel}.",
  nightSub: "{afterMidnight} messages after midnight. Sleep is a suggestion.",
  stickersLabel: "STICKERS DEPLOYED",
  deletedSub: "{deleted} messages deleted. We saw nothing.",
  dialectTitle: "Chapter dialect, by the numbers.",
  laughsLabel: "LAUGHS ON RECORD",
  laughsSub: "😂 💀 🤣 — the year was funny.",
  streakLabel: "DAYS WITHOUT SILENCE",
  streakSub: "Not one quiet day since June 8.",
  subgroupTitle: "Most active subgroup.",
  subgroupSub: "{messages} messages. They never stopped.",
},
```

Add to `copy.grid`: `"group-chat": "The main chat, audited."`

### 4.3 The story (`components/stories/11-group-chat.tsx`)

New file; register in `components/stories/index.ts`. Ink field. Setup:
the setup line via PopLetters (standard 3200ms). Reveal beats (same
in/out crossfade spec as §3.2; three-beat layering on every slam):

1. `messages` SlamStat + `messagesLabel` + `messagesDetail` (fmt) — 2200ms
2. `yappersTitle` headline + the five `topYappers` as redacted bars
   (build4 §7.1 style: name on filled bar, count outside in
   `text-cream/40` tabular-nums), popping in one-by-one, widths
   proportional to count (`width: 40 + (count / topYappers[0].count) * 60%`
   of the list column) — 3600ms
3. `busiestDay.count` slam + `busiestLabel` + `busiestDay.label` as a
   sticker chip + `busiestDay.line` as the caption beat — 2600ms
4. `nightTitle` (fmt) headline + `nightSub` caption — 2400ms
5. `stickers` slam + `stickersLabel`, then `deletedSub` lands as the
   caption beat — 2600ms
6. `dialectTitle` + the five `dialect` words as redacted bars with counts,
   same treatment as beat 2 — 2800ms
7. `laughs` slam + `laughsLabel` + `laughsSub` — 2000ms
8. `streakDays` slam + `streakLabel` + `streakSub` — 2200ms
9. `topSubgroup` — ONLY if non-null: `subgroupTitle` headline, the group
   name slams as a string on a sticker chip, `subgroupSub` (fmt) caption
   — 2400ms. Null today → beat skipped, story ends on the streak.

Scripted total (all beats) = 22,800ms → **revealMs 29000** ((22800)/0.8 =
28,500, next 1000). With the subgroup TBD it runs 20,400ms — still within
the 80% rule against 29000? 20,400 ≤ 23,200 ✓.

### 4.4 Registry surgery (`lib/stories.ts`, shaders, guests)

Insert after `built`:

```ts
{ id: "group-chat", index: 3, personal: false, accent: "green", field: "ink", setupMs: 3200, revealMs: 29000, label: "The Group Chat" },
```

- `StoryId` union gains `"group-chat"`. Every later story's `index`
  increments by one (people 4 … summary 10). Do this by renumbering the
  literal array — nothing else derives indexes.
- `getGuestStoryIndexes()` becomes `[0, 1, 2, 3, 4, 5, 8, 9, 10]`
  (guests see the group chat; still skip standing (6) and your-chapter
  (7); your-events (5), your-club (8), whats-next (9), summary (10) keep
  their guest variants).
- **Shader branches are keyed by the OLD indices** — inserting a story
  breaks the `storyIndex → u_story` coupling. Fix it properly: add to
  `lib/stories.ts`:

  ```ts
  // Shader figure branch per story (branches live in components/gl/
  // shaders.ts and keep their historical numbering; the overture is 10).
  export const SHADER_STORY: Record<StoryId, number> = {
    "the-year": 0, moments: 1, built: 2, "group-chat": 0, people: 3,
    "your-events": 4, standing: 5, "your-chapter": 6, "your-club": 7,
    "whats-next": 8, summary: 9,
  };
  ```

  `player.tsx` computes `shaderStory` from `SHADER_STORY[def.id]` (the
  overture override for the-year's setup window stays). The group chat
  reuses branch 0's diagonal stripe band — its green accent rides the
  runner; no new GLSL. `ASSET_MANIFEST`, preloader, chapter grid, and the
  progress rail all read lengths from the registry and need no edits
  beyond what compiles.

---

## 5. Pipeline: group-chat stats + subgroup plans

### 5.1 New module `scripts/pipeline/group-stats.ts`

Computes exactly the §4.1 shape from parsed messages. Reuse
`parse-whatsapp.ts` internals (export its line-parsing helper if it isn't
already). Signature:

```ts
export function computeGroupChatStats(
  exports: { name: string; text: string }[], // name = filename sans .txt
  yearStart: Date, yearEnd: Date
): { main: GroupChatStats; perGroup: { name: string; messages: number }[] }
```

Rules (deterministic, unit-tested):

- Messages counted = parsed sender messages within [yearStart, yearEnd),
  excluding system lines and deleted-message bodies (same exclusions the
  parser already applies), but media messages ("omitted") DO count as
  messages (they were sent).
- `topYappers`: top 5 by count, **excluding** senders whose display name
  starts with `~` (unsaved contacts) and phone-number senders.
- `busiestDay`: max daily count; label formatted `MMM D` upper-cased.
- `peakHourLabel`: max hourly bucket, 12-hour label ("9PM").
- `afterMidnight`: hours 0–4 inclusive.
- `stickers` / `deleted`: substring counts "sticker omitted" / the
  parser's deleted set.
- `laughs`: total occurrences of 😂, 💀, 🤣.
- `dialect`: counts for the fixed word list `["sha","dey","abeg","una",
  "omo"]`, whole-word, case-insensitive, media lines excluded.
- `streakDays`: longest run of consecutive calendar days with ≥1 message.
- `perGroup`: message totals per export file; `main` is the file named
  `main*.txt`; the top non-main group becomes the `topSubgroup`
  suggestion.

Tests in `group-stats.test.ts` mirroring `parse-whatsapp.test.ts`'s
fixture style: a small synthetic export exercising every rule above
(include a `~ someone` sender, a sticker, a deleted message, an
after-midnight message, a two-day streak).

### 5.2 Subgroup exports — the plan (owner will upload more chats)

Convention: `data/exports/` already holds member exports; subgroup chats
go in **`data/exports/groups/`**, one `.txt` per group, filename = the
group's display name kebab-cased (e.g. `data-and-ai.txt`,
`media-team.txt`, `main.txt` for the main chat). `run.ts` reads the
directory (same pattern as `readExportFiles()`), passes
`{name, text}` pairs to §5.1, and keeps feeding the flat member exports
to the existing personal-stats path untouched. Nothing under `data/` is
ever committed (build.md rule stands).

### 5.3 Report (`scripts/pipeline/report.ts`)

Print a `GROUP CHAT` section that emits the **exact §4.1 literal** with
computed values filled in — paste-ready for `chapter.ts` — plus a
`PRODUCT SAGA` section listing every §3.1 TBD by name (radar.articles,
radar.mostRead, radar.reads, votes.elections, votes.votesCast,
orbit.lagos, orbit.careerFair, orbit.summit, website, babcock100) with
`— fill from <source>` hints (Sanity studio count, ORBIT admin dashboard,
BabcockVotes admin). The report is the single place a lead looks before
copy-freeze.

---

## 6. The credits, rebuilt human

All in `04-people.tsx` + `lib/content/chapter.ts` + `lib/copy.ts`.

### 6.1 Full track names

`SECTION_TITLES` becomes (owner: "use the full track names"):

```ts
CORE: "CORE TEAM",
SOFTWARE: "SOFTWARE DEVELOPMENT & ENGINEERING",
DATA: "DATA & AI",
INFRASTRUCTURE: "INFRASTRUCTURE & SECURITY",
DESIGN: "DESIGN & MANAGEMENT",
DEV: "DEV TEAM",
EVENTS: "EVENTS PLANNING",
```

(MEDIA's umbrella title disappears — §6.4.) The chapter-card slam sizes
down to fit the long names: `clamp(1.4rem, 8cqw, 2.6rem)`, two-line wrap
allowed, `text-balance`.

### 6.2 Person tiles — bigger, roled, unringed, asymmetric

Replace the circle `Avatar` + tiny name with a photo TILE. This is the
owner's list verbatim: pictures bigger, roles show, no lead circle, no
symmetry.

- **Tile**: rounded-rect photo, `aspect-[4/5]`, `rounded-lg`,
  `overflow-hidden`, `object-cover`. Width cycles deterministically by
  index — chapters with more than 5 people use
  `[92, 74, 84, 70, 96, 78][i % 6]`px; chapters with 5 or fewer use
  `[128, 104, 116, 100, 122][i % 5]`px (fewer faces earn bigger frames).
- **Scatter**: per-tile `rotate: [-5, 3, -2, 6, -4, 2][i % 6]°` and
  `translateY: [0, 10, -6, 14, 4, -10][i % 6]`px, applied on the tile
  wrapper. The flex-wrap grid keeps `justify-center` but `items-start` —
  the offsets do the de-gridding. No two adjacent tiles share size or
  tilt (the cycles are coprime-ish by construction; do not "fix" them).
- **Caption**: under each tile, the name (`font-bold`, `0.62rem`,
  `text-ink/80`, `line-clamp-1`) and the ROLE (`0.5rem`, `text-ink/55`,
  `line-clamp-1`, letter-spacing 0.04em, upper-cased). Every person shows
  a role — for DEV/MEDIA members whose roster role is just "Member"/
  "Lead", show the `subteam` instead (e.g. "FRONTEND", "RADAR");
  a lead shows `subteam + " LEAD"` (e.g. "BACKEND LEAD").
- **Leads**: delete `RING_HEX`, the ring style, and the 84/68px lead
  sizing branch. Leads keep only their position (first in the order) —
  visually identical citizens.
- Mount animation unchanged (spring pop + the sine bob), InitialsAvatar
  fallback stays for missing photos (rendered square in the tile at the
  tile's width).

### 6.3 Chapter cards that aren't a title on a wall

The accent-panel card keeps its slam + editorial line, but gains a
backdrop and loses its symmetry:

- Backdrop: TWO photos of people from that chapter (indices 0 and 2 of
  the chapter's roster; if the chapter has <3 people, indices 0 and 1;
  skip missing photos) rendered at monument scale (`55cqw` width each),
  `grayscale`, `opacity-20`, `rounded-xl`, rotated -8° and 5°, positioned
  bleeding off opposite corners (`-top-[8%] -left-[12%]` /
  `-bottom-[10%] -right-[14%]`). They mount with the card (no extra
  animation — the card's skew-in carries them; law 1).
- The title block anchors `items-start text-left pl-8` with a standing
  2° tilt on the title only — off-center, not centered.
- Special/sponsor/MVP cards (§6.5–6.6) use the same card shell.

### 6.4 Media: one page per subteam — like the tracks

Delete the single MEDIA chapter and `LABELED_MEDIA_SUBTEAMS`. In
`CHAPTERS`, where MEDIA was, emit five chapters in roster subteam order,
each `kind: "cast"`, each with its own card + grid:

| id | title | accent | editorial line (add to `copy.people.transitions`) |
|---|---|---|---|
| media-photo | PHOTOGRAPHERS | yellow | "Caught every moment on sight." |
| media-content | CONTENT CREATORS | red | "Made the feed worth scrolling." |
| media-design | GRAPHIC DESIGNERS | blue | "Every flyer you saved. Them." |
| media-video | VIDEO EDITORS | green | "Cut the year into highlights." |
| media-radar | RADAR | red | "The newsroom that never slept." |

People filter: `section === "MEDIA" && subteam === <name>`. These five
use a compressed card beat: **CARD_MS 1100** (main sections keep 1600) —
`Chapter` gains an optional `cardMs` field, default 1600. DEV stays one
flat page (owner: "you can leave the dev team on one page since theyre
small").

### 6.5 The sponsor wall — real data from the ORBIT repo

The two "Partner 1/2" placeholder PEOPLE rows die. Sponsors become their
own content block + a wall treatment.

**Assets**: copy every file from the ORBIT repo
`public/images/sponsors/*` into wrapped `public/sponsors/` (17 files,
keep names). Also copy ORBIT's
`public/images/webps/emmanuel-oladosu.webp` → wrapped
`public/people/emmanuel-oladosu.webp` (§6.6 needs his real photo; update
the ADVISORS path accordingly and delete the old placeholder path).

**Data** (`chapter.ts`) — transcribed from the ORBIT repo's
`SPONSOR_TIERS` (VERIFIED):

```ts
export interface SponsorTier { tier: string; sponsors: { name: string; logo: string }[] }
export const SPONSOR_WALL: SponsorTier[] = [
  { tier: "HEADLINE SPONSOR", sponsors: [{ name: "Moniepoint", logo: "/sponsors/moniepoint.jpeg" }] },
  { tier: "GOLD SPONSORS", sponsors: [
    { name: "AICL", logo: "/sponsors/aicl.webp" },
    { name: "Patron Luxury Apartment", logo: "/sponsors/patron.webp" } ] },
  { tier: "RAFFLE DRAW SPONSOR", sponsors: [
    { name: "Gadget Cartel", logo: "/sponsors/gadget-cartel.webp" },
    { name: "Glass Finance Ltd", logo: "/sponsors/glass.webp" } ] },
  { tier: "INDUSTRY VISIT HOSTS", sponsors: [
    { name: "Paystack", logo: "/sponsors/paystack.png" },
    { name: "Digital Encode Limited", logo: "/sponsors/digital-encode.jpg" },
    { name: "Rise", logo: "/sponsors/risevest.jpg" },
    { name: "Nithub", logo: "/sponsors/nithub.jpg" },
    { name: "Cubbes", logo: "/sponsors/cubbes.png" } ] },
  { tier: "HOSPITALITY SPONSORS", sponsors: [
    { name: "His Grace", logo: "/sponsors/his-grace.webp" },
    { name: "Eben Nuts", logo: "/sponsors/eben-nuts.png" },
    { name: "Waffledom", logo: "/sponsors/waffledom.jpg" } ] },
  { tier: "CAREER FAIR PARTNERS", sponsors: [
    { name: "Stanbic IBTC", logo: "/sponsors/stanbic-ibtc.png" },
    { name: "GTB", logo: "/sponsors/gtbank.png" } ] },
  { tier: "STUDENT SPONSORS", sponsors: [
    { name: "Postra", logo: "/sponsors/postra.webp" },
    { name: "Jules Luxury", logo: "/sponsors/jules-luxury.webp" } ] },
  { tier: "MEDIA PARTNERS", sponsors: [
    { name: "Rahkindstudios", logo: "/sponsors/rahmon.webp" },
    { name: "Sorethegrapher", logo: "/sponsors/sorefunmi.webp" } ] },
  { tier: "ASSOCIATE COMMUNITIES", sponsors: [
    { name: "GDG on Campus Caleb", logo: "/sponsors/gdg-caleb.jpg" },
    { name: "GDG on Campus OOU", logo: "/sponsors/gdg-oou.jpg" },
    { name: "GDG on Campus Lautech", logo: "/sponsors/gdg-lautech.webp" },
    { name: "GDG on Campus UI", logo: "/sponsors/gdg-ui.jpg" } ] },
];
```

**Wall choreography** (replaces the SPONSORS cast chapter; card line
stays `transitions.sponsors`): after the card, a 6400ms three-beat wall:

1. **Moniepoint alone** (2000ms): logo on a paper chip (`bg-paper p-3
   rounded-lg`, max-w 180px, stamp-spring mount, -2° tilt), the
   HEADLINE SPONSOR sticker chip above it.
2. **Beat two** (2200ms): GOLD + RAFFLE + INDUSTRY VISIT HOSTS — 9 logos
   as smaller paper chips (max-w 92px) in the §6.2 scatter treatment,
   tier labels as tiny sticker chips leading each cluster.
3. **Beat three** (2200ms): the remaining 13 (hospitality 3, career fair 2,
   student 2, media 2, communities 4), same treatment.

Logos load with `Image` + `object-contain`; a failed load falls back to
the sponsor's name in `t-label` on the chip (never a broken image).
`ASSET_MANIFEST.people` adds all 17 logo paths + the Oladosu photo.

### 6.6 Special thanks — the four-chapter closer arc

Replace the two SPECIAL_THANKS chapters with this arc (data first):

```ts
export const ADVISORS = [
  { name: "Emmanuel Oladosu", role: "ALUMNI SPONSOR", photo: "/people/emmanuel-oladosu.webp" },
  { name: "Dr. Ernest Onuiri", role: "CAMPUS ADVISOR", photo: "/people/dr-ernest.jpg" },
] as const;
// Owner-declared, 2026-07-19. Photos resolve from the existing PEOPLE
// roster by name — do not re-add these people to PEOPLE.
export const MVPS = {
  core: [
    { name: "Lawal Sharon", photo: "/people/sharon-lawal.jpg" },
    { name: "Habeeb Muhammed", photo: "/people/habeeb-abayomi.jpg" },
    { name: "Victor Ibironke", photo: "/people/victor-ibironke.jpg" },
    { name: "Efegherimoni Oghenetejiri", photo: "/people/efegherimoni-oghenetejiri.jpeg" },
  ],
  media: [
    { name: "Olamide Fatunase", photo: "/people/olamide-fatunase.jpeg" },
    { name: "Oyebajo Olaimide", photo: "/people/oyebajo-olaimide.jpg" },
    { name: "Agunbiade Ayomide Obanijesu", photo: "/people/agunbiade-ayomide-obanijesu.jpeg" },
    { name: "Umaru Victor Oshioke", photo: "/people/umaru-victor-oshioke.jpeg" },
  ],
  track: "DATA & AI",
} as const;
// The design special force behind the products (owner-declared). Photos
// TBD-owner except Xavier's and Daddy D's (already in /public/people —
// "Daddy D the Designer" is Oluwadayomisi Osisanya, the Design & Mgmt
// Track Lead already in PEOPLE; reuse his existing photo path here rather
// than re-adding him to PEOPLE — this is a second, nickname appearance).
export const SPECIAL_FORCE = [
  { name: "Alli Akinpelu", photo: null },
  { name: "Bassey Saviour", photo: null },
  { name: "Okpalannajiaku Xavier", photo: "/people/xavier-okpalannajiaku.png" },
  { name: "Deborah Onabanjo", photo: null },
  { name: "Daddy D the Designer", photo: "/people/oluwadayomisi-osisanya.jpg" },
] as const;
```

Remove the four SPONSORS/SPECIAL_THANKS placeholder entries from
`PEOPLE` (the `Person["section"]` union drops both values).

The chapters, in order after the sponsor wall (copy lines go in
`copy.people.transitions`):

1. **SPECIAL THANKS** (card 1600ms; line: "The two who bet on us early.")
   → content 3200ms: the two ADVISORS as large §6.2 tiles (128px), their
   ROLE on a sticker chip under each name. This is the owner's slide one:
   Oladosu as alumni sponsor, Dr. Ernest as campus advisor.
2. **THE MVPS** (card 1600ms; line: "The ones who wouldn't log off.") →
   three sub-beats totaling 8000ms:
   - CORE (2800ms): sticker header "MOST ACTIVE CORE TEAM", the four
     `MVPS.core` as 104px tiles.
   - MEDIA (2800ms): sticker header "MOST ACTIVE MEDIA TEAM", the four
     `MVPS.media`, same treatment.
   - TRACK (2400ms): "MOST ACTIVE TRACK" label, then `MVPS.track` slams
     in `t-display`, with the caption — exact line: **"They never
     stopped talking. Or building."**
3. **THE SPECIAL FORCE** (card 1600ms, accent red; line: "The design
   team behind every product you just saw.") → content 3400ms: the five
   `SPECIAL_FORCE` as 104px tiles (initials tiles where photo is null).
4. The existing closer line beat (`transitions.closer`) — unchanged.

### 6.7 Cadence + registry recompute

Content formula becomes `min(2400 + 150 × count, 5600)`ms (bigger tiles
earn longer looks); cards 1600ms (media subteams 1100ms per §6.4).
Chapter schedule:

| chapter | card | content |
|---|---|---|
| CORE (10) | 1600 | 3900 |
| SOFTWARE DEV & ENG (8) | 1600 | 3600 |
| DATA & AI (5) | 1600 | 3150 |
| INFRA & SECURITY (4) | 1600 | 3000 |
| DESIGN & MGMT (3) | 1600 | 2850 |
| DEV TEAM (5) | 1600 | 3150 |
| PHOTOGRAPHERS (2) | 1100 | 2700 |
| CONTENT CREATORS (2) | 1100 | 2700 |
| GRAPHIC DESIGNERS (3) | 1100 | 2850 |
| VIDEO EDITORS (2) | 1100 | 2700 |
| RADAR (7) | 1100 | 3450 |
| EVENTS (10) | 1600 | 3900 |
| SPONSOR WALL | 1600 | 6400 |
| SPECIAL THANKS | 1600 | 3200 |
| THE MVPS | 1600 | 8000 |
| SPECIAL FORCE | 1600 | 3400 |

Total = 23,100 (cards) + 58,950 (content) = **82,050ms**. Registry:
people `revealMs 64000 → 103000` (82,050 / 0.8 = 102,562, next 1000).
Yes, the credits are long — that is the point of a credits roll, and §2's
whisper rail is what makes a long story feel fine. The hold-to-pause and
tap-to-skip affordances are unchanged and remain the viewer's out.

---

## 7. Moments, de-bored

The ORBIT/DEVFEST/GAMES frames read as empty cream with one small
polaroid (verified in the owner's recording — the DEVFEST and GAMES
polaroids are literally blank placeholders). Fixes in `02-moments.tsx`:

1. **Photo-forward layout.** The hero photo grows to `82cqw` / maxW 320
   (from 65cqw/240) and anchors center-stage; supporting photos keep
   their scatter but scale up 1.2×. The title moves ONTO the hero: the
   scene title in `t-display` overlapping the photo's bottom-left corner
   (`-bottom-4 -left-3`, -3° tilt, cream sticker-chip backing) — no more
   title marooned in the corner of an empty field.
2. **Stat stingers.** Each scene may carry one sticker chip pinned to a
   supporting photo's corner: ORBIT → "547 TICKETS" (VERIFIED); DEVFEST →
   none; GAMES & SPACES → "1,140 MESSAGES IN ONE NIGHT" (from §4.1 —
   cross-referencing the group chat is the connective tissue). Chip mounts
   with the stamp spring 400ms after its photo lands.
3. **Fill the frames.** The scene definitions expect these files —
   currently devfest/games ship blanks. Owner drop-list (report §5.3 also
   prints it): `public/moments/orbit/01-03.jpg` (present),
   `devfest/01-02.jpg`, `games/01-02.jpg`, `spaces/01.jpg` — REPLACE the
   placeholder images with real photos; the code needs no change to pick
   them up. A scene whose photos are still placeholders after the drop
   deadline gets CUT from `SCENES` at freeze (an honest two-scene story
   beats a blank-card three-scene one) — owner call, flagged in the
   report.
4. `SCENE_MS 4300 → 4800` (bigger compositions earn the extra beat);
   moments `revealMs 13000 → 15000` ((3 × 4800 + wipes) / 0.8).

---

## 8. Owner checklist (nothing here blocks a commit)

Printed by the pipeline report too (§5.3). Fill-ins land in
`chapter.ts` literals:

- Numbers: radar articles / most-read / reads; votes elections / votes
  cast; orbit lagos / career-fair / summit; website + babcock100 stats;
  `CHAPTER.totalCheckins` + `messagesParsed` (still TBD from build.md).
- Chats: fuller main-chat export (3 missing months), subgroup exports
  into `data/exports/groups/` (§5.2) → rerun pipeline → paste GROUP_CHAT
  block + `topSubgroup`.
- Names: review the §4.1 `topYappers` display names; confirm "Daddy D
  the Designer" identity.
- Photos: Dr. Ernest headshot (real one), the three missing
  SPECIAL_FORCE photos, real moments photos (§7.3).
- Copy: `GUESS_GAME.answerIndex` (still TBD from build4).

---

## 9. Sequencing — one commit per step, exactly these messages

Every step leaves the app shippable (`tsc && eslint && vitest && next
build` green before each commit):

1. `feat(chrome): the whisper rail` — §2 (rail, corner chrome, label
   removal, toast move).
2. `feat(content): product saga data and sponsor assets from orbit` —
   §3.1 block, §6.5 SPONSOR_WALL block + logo/photo asset copies,
   ADVISORS/MVPS/SPECIAL_FORCE blocks (§6.6 data only), PEOPLE
   placeholder removals, ASSET_MANIFEST updates.
3. `feat(stories): what we built — the product saga` — §3.2 + registry
   revealMs 54000.
4. `feat(pipeline): group chat stats and subgroup exports` — §5 module +
   tests + run.ts wiring + report sections.
5. `feat(stories): the group chat` — §4 story + copy + registry insertion
   + SHADER_STORY map + guest indexes.
6. `feat(stories): credits tiles — bigger, roled, unringed, scattered` —
   §6.2 + §6.3 card backdrops.
7. `feat(stories): credits chapters — full track names and media
   subteams` — §6.1 + §6.4 + new transition lines.
8. `feat(stories): sponsor wall and the closer arc` — §6.5 wall + §6.6
   chapters + §6.7 cadence/registry (revealMs 103000).
9. `feat(stories): moments de-bored` — §7 + registry (revealMs 15000).

Verification gates (after 3, 5, 8, 9): full local suite plus a
real-device pass checking, in order: the rail is legible but ignorable at
arm's length (law 8); every saga beat lands as number-then-consequence
(law 9); null TBD beats leave NO gaps at any position; the Moniepoint
tease reads as a held breath (number exits → line alone → slam); the
group-chat yapper bars match §4.1 exactly; credits tiles never clip a
role line; the five media pages advance with the compressed card rhythm;
reduced-motion end-to-end still shows every stat, tile, and logo
statically. Then re-run the §6.7 and §3.2 arithmetic against the shipped
beat counts and correct any registry number in the same commit that
changed the beats.

## 10. What this pass deliberately does not do

- No DB reads on the public path — the saga, group chat, sponsor wall,
  and credits are all static content (the pipeline fills literals; the
  zero-database guarantee from build.md stands).
- No new shader branches — the group chat rides branch 0; the whisper
  rail is DOM.
- No share-card redesigns beyond §3's BuiltCard stat sourcing swap.
- No re-choreography of your-events / standing / your-chapter / your-club
  / whats-next / summary — build4's motion pass on those stands.
- The subgroup story beat ships DARK (null) until the exports arrive —
  planned for, not faked.
