# GDG Wrapped — build2: the multi-source member universe

This document AMENDS `build.md`. Everything in `build.md` stays in force —
especially its prime directive, repeated here because it is the whole method:

> **DO NOT INVENT.** Every design token, animation value, copy line, formula,
> and threshold you need is specified. If something seems missing, re-read the
> spec; if it is genuinely missing, stop and ask — do not fill the gap with
> your own idea.

(For the avoidance of doubt: `build.md` does not restrict animation — it
specifies every animation exactly so an implementer never has to design one.
The "only `transform` and `opacity`" rule in §1.2 is a 60fps compositor rule,
not a ban.)

Where this file and `build.md` conflict, **this file wins**. It supersedes:
`build.md` §11 (migration), parts of §12.1/§12.3 (pipeline data flow), and the
member-universe assumption throughout §12.

---

## 0. Why this amendment exists

`build.md` assumed the auth-hub Postgres was the source of truth for members
and event activity. In reality the chapter's operations run across FOUR
systems:

| System | What lives there | How we ingest it |
|---|---|---|
| auth-hub Postgres | ~500 accounts, some event tables, radar activity, WhatsApp numbers | SQL (unchanged, §12.1) |
| community.dev (Bevy) | the full 1500+ member roster, per-event attendance | CSV export → `data/sources/community/` |
| Luma | registrations + check-ins for events hosted there | CSV export → `data/sources/luma/` |
| ORBIT sheets | registration/check-in sheets for the ORBIT series | CSV → `data/sources/orbit/` |

**Decision (owner-approved): the member universe is the UNION of all four,
keyed by lowercased email.** Anyone who appears anywhere gets a Wrapped.
Radar reads and game plays already count (the `Prad` builder signal, §12.5) —
nothing changes there.

Non-negotiables inherited from `build.md` §15 apply to external members too:
a community.dev-only member with no matched WhatsApp is **unmatched, not
zero**; zero-checkin members get the invitation treatment, never a "0".

## 1. What the organizers must export (run-time inputs, never committed)

All files go under `data/sources/` (already gitignored — verify before ever
committing). Any nesting is allowed; every `*.csv` under it is read.

1. **community.dev roster**: Bevy dashboard → Members → Export CSV. Must
   contain an email column and ideally a join-date column. Save as
   `data/sources/community/members.csv`.
2. **community.dev attendance** (if used per event): one CSV per event, named
   `YYYY-MM-DD-event-name.csv` (the date prefix becomes the event date).
3. **Luma**: each event → Guests → Export CSV (contains `approval_status`,
   `registered_at`, `checked_in_at`). Name it `YYYY-MM-DD-event-name.csv`
   under `data/sources/luma/`.
4. **ORBIT registrations**: the data lives in ORBIT's own admin
   (orbit.gdgbabcock.com) which has NO CSV export UI yet — the owner will
   export it later (build an export or copy the table out). When it lands,
   drop it under `data/sources/orbit/` with an Email column and a check-in
   column/timestamp. Until then the confirmed headline numbers (read off
   the admin dashboard 2026-07-19: 547 tickets issued, 252 checked in for
   ORBIT 1.0) live in `PRODUCT_STATS` (chapter.ts) for display — but
   per-member ORBIT activity stays out of the stats until the real export
   exists.
5. **Membership form** (added after the first real uploads, 2026-07-18): the
   Google Forms "GDG Babcock Membership Form (25/26 session)" responses CSV,
   saved under `data/sources/forms/` with "member" in the filename (that's
   what classifies it as a roster). It is the richest roster we have —
   the real export carried 504 valid members, 100% with WhatsApp numbers —
   and the parser now reads: `Timestamp` as the join date (with per-column
   month-first/day-first detection, since Google Forms exports are
   month-first while local sheets are day-first — 313 of the real file's
   timestamps prove month-first), `Full name (First name first)` via a
   prefix match, and `Whatsapp number` into `ExternalMember.whatsapp`,
   which `universe.ts` feeds into WhatsApp matching whenever the auth DB
   has no number for that email (auth wins when both exist).

Real-export facts learned from the first uploads (parser handles all of
these — listed so nobody "fixes" them back): Bevy per-event exports put
check-in in `Checkin Date (UTC)` (no space) and registration in
`Paid date (UTC)`; Luma exports use `created_at` (not `registered_at`) and
signal check-in solely via a non-empty `checked_in_at`; form emails arrive
with trailing-dot typos ("x@gmail.com....") and embedded whitespace, which
`sanitizeEmail` strips before the address becomes an identity key. If an
event's date can't be proven from its own data (e.g. a Luma export with
zero check-ins), leave the filename date prefix OFF rather than guessing —
a null event date is handled; a wrong one corrupts consistency months.

The Bevy **members** export (`community/members.csv`, the since-inception
roster — 1,607 unique emails in the real 2026-07-18 export) stores its join
date in `created_date`, now mapped as a last-resort join-date pattern.
Caveats confirmed against the real file: 992 of its rows carry a 2024-09
`created_date` — the platform-migration batch, so that month means "member
since AT LEAST then" (earliest-join-wins across auth/form/Bevy already
handles it); and its `events_registered_count` column is deliberately NOT
ingested — it counts since inception and cannot be windowed to the chapter
year. Verified relationship between the two rosters: all 504 form members
are a strict subset of the Bevy 1,607 — the form marks who is ACTIVE in
the 25/26 tracks; Bevy holds the full historical universe.

## 2. Classification rules (`scripts/pipeline/sources.ts`)

A CSV is parsed with a header-sniffing column map. Write these regexes
verbatim (they match against lowercased headers with `[_-]` → space):

- email: `/^e?mail$/`, then `/e-?mail/` — **a file with no email column is
  skipped with a console.warn, never guessed.** Rows whose email lacks `@`
  are dropped.
- name: `/^(full )?name$/`, `/^attendee name$/`, `/^guest name$/`; else the
  pair `/^first name$/` + `/^last name$/`; else derive from the email local
  part (`no-name@x` → "No Name").
- join date: `/join(ed)?( date| at)?/`, `/member since/`, `/^date joined$/`
- checked in (boolean): `/^checked? in$/`, `/^attended$/`, `/check in status/`
- checked in at (timestamp): `/checked? in (at|time|date)/`
- rsvp status: `/approval status/`, `/rsvp status/`, `/^status$/`, `/^rsvp$/`
- registered at: `/regist(ered|ration)( at| date| time)?/`, `/rsvp (date|at)/`,
  `/created at/`, `/^added$/`
- event title/date columns: `/^event( name| title)?$/`, `/event (date|start)/`

**Roster vs attendance**: a file with NO event signal (no checked-in /
checked-in-at / rsvp-status / event column) that has a join-date column or a
`/member|roster|audience/i` filename is a **roster**. Everything else is
**attendance for exactly one event**, title from the event column per-row or
else from the filename (strip extension, strip `YYYY-MM-DD` prefix → event
date, `[-_]` → spaces).

**Row semantics (attendance)**:
- rsvp in {declined, not going, cancelled, canceled, waitlist, waitlisted,
  invited, rejected, pending} → row dropped entirely (never registered).
- checkedIn = checked-in-at parses to a date, OR the boolean column is truthy
  (anything except empty / no / false / 0 / n / not checked in / did not
  attend / no show / absent), OR checked-in-at is non-empty text.
- Dates parse as ISO or `Month D, YYYY`; slash dates are **DAY-FIRST**
  (`08/11/2025` = 8 November — chapter locale, same as the WhatsApp parser).
  Unparseable → null, never Invalid Date.

## 3. The universe (`scripts/pipeline/universe.ts`)

`buildUniverse(db, external, yearStart, yearEnd)` produces:

```ts
UniverseMember { email /* lowercased key */, userId: string|null,
                 fullName, whatsappNumber: string|null, joinDate, sources[] }
MemberActivity { checkins, registrations, titles[≤8], checkinMonthlyCounts,
                 checkinDailyCounts, radarSignal }
Universe { members, activity: Map<email, MemberActivity>, eventsRun }
```

Rules, in order:
1. Auth users seed the map (they alone carry `userId` + `whatsappNumber`).
2. Roster members merge in; **joinDate = earliest seen across all sources**;
   a real name replaces an email-derived one, never the reverse.
3. Auth checkins/registrations and external attendance collapse into per-email
   event records keyed by `normalizeTitleKey(title)` = lowercase, strip
   non-alphanumerics — so "DevFest Babcock" (auth) and `devfest-babcock.csv`
   (Luma) are ONE event. A check-in in any source marks the record checked-in
   (earliest timestamp kept); registration in any source marks it registered;
   a check-in implies registration.
4. Attendance rows create members who exist nowhere else (they registered for
   a chapter event; that is membership enough). Timestamp guard: a `seenAt`
   more than a year before `yearStart` or ≥ `yearEnd` drops the row.
5. `checkins` = COUNT of distinct checked-in events (not raw rows).
   Monthly/daily counts only from records WITH timestamps inside the window —
   a timestamp-less check-in counts toward totals but not burst/consistency.
6. Radar reads+plays map user_id → email; members with radar but no events
   still get an activity entry.
7. `eventsRun` = size of the union of normalized titles across
   `db.eventTitlesRun` and every attendance record.

## 4. Email is the key everywhere now

- `PipelineMember.userId: string | null`; `email` (lowercased) is the key.
- `matchMembers(senderStats, universe.members, mapping)` — phone auto-match
  still only reaches auth members (only source of numbers); `mapping.json`
  values may be an auth UUID **or an email**. `MatchResult.matched` is keyed
  by email.
- `ClubAssignment.email` replaces `.userId`; `assignClubs` returns a map
  keyed by email. Rebalance/zero-activity pinning unchanged.
- `computeSnapshots(members, eventsRun, yearStart, yearEnd, optedOutEmails)`
  — snapshots keyed by email; `chapterMeta.totalCheckins` = sum of deduped
  member checkins; `chapterMeta.eventsRun` from the universe union.
- `writeSnapshots` upserts `ON CONFLICT (email)`, `user_id` nullable.
- `fetch-db.ts`: registrations query now JOINs events for `title`; the
  events-run query returns `title` rows (`eventTitlesRun: string[]`).
- The app is untouched: `/api/me` and share cards already look up by email.

## 5. Migration v2 (supersedes build.md §11 — file already amended)

`auth/database/migrations/005_wrapped.sql` — email is the primary key;
`user_id` is a nullable unique FK with **ON DELETE SET NULL** (deleting an
auth account must not delete the person's Wrapped — they remain a community
member):

```sql
CREATE TABLE IF NOT EXISTS wrapped_snapshots (
  email       TEXT PRIMARY KEY,  -- lowercased by the pipeline
  user_id     UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  year        TEXT NOT NULL DEFAULT '2025-2026',
  data        JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

(`wrapped_meta` and the `lower(email)` index are unchanged.) The migration
has never been applied anywhere, so this is a rewrite of the unapplied file,
not an ALTER.

## 6. Seed + verification

`--seed` now also fabricates: a Bevy-style roster (60 community-only members
+ 80 overlapping auth members), a Luma export for DevFest where auth users
who ALREADY have a platform check-in for the same title must dedupe to one
event, one declined RSVP that must vanish, and an ORBIT Yes/No sheet with a
walk-in who exists in no roster. Synthetic CSVs run through the REAL
`parseSourceCsv` path and are also written to `data/sources/` for inspection.

Verify (all must pass before committing):
```bash
npx tsc --noEmit && npx eslint . && npx vitest run   # 61 tests
npm run pipeline -- --seed --dry-run
```
Expected report shape: `Universe: 361 members (300 auth-platform, 61
community/Luma/ORBIT-only), 10 distinct events` — the 10 proves cross-source
title dedupe; 361 = 300 + 60 community + 1 walk-in (ghost excluded); match
rate ≥ 80%; every club ≥ 8%.

## 7. Commit plan

| Repo | Message |
|---|---|
| auth | `fix(db): key wrapped snapshots by email for cross-platform members` |
| wrapped | `feat(pipeline): community.dev, luma and orbit ingestion with email-keyed universe` |
| wrapped | `feat(engine): vertical deck push, progress repaint, landing fit and perf` (§8) |

Same git rules as `build.md` §1.1: author `nekumartins <akpotohwoo@gmail.com>`,
unsigned, `type(scope): subject`, wrapped → `main` directly.

---

## 8. The critique pass — real-device findings and their exact fixes

Owner review on a real iPhone (deployed build) found four failures. Each fix
below is fully specified; implement them exactly. The unifying lesson is
§8.5 — read it before touching any animation code.

### 8.1 Story transitions: the vertical deck push

**Finding:** stories crossfaded in place (opacity + 12px drift). Spotify
Wrapped 2025 *pushes whole screens vertically* — the outgoing and incoming
screens travel together like cards in a deck. The crossfade reads static.

**Spec:**

1. The engine tracks navigation direction. Add to `EngineState`:
   `direction: 1 | -1` (1 = forward → screens push UP; -1 = backward →
   screens push DOWN). Set it in the reducer: `NEXT` (story change) → 1,
   `PREV` (story change) → -1, `GOTO` → `target >= current ? 1 : -1`,
   initial state → 1. Phase changes never touch it.
2. In `player.tsx`, define verbatim:
   ```ts
   const PUSH_SPRING = { type: "spring" as const, stiffness: 300, damping: 34 };
   const PUSH_VARIANTS = {
     enter: (direction: 1 | -1) => ({ y: direction > 0 ? "100%" : "-100%" }),
     center: { y: "0%", transition: { y: PUSH_SPRING } },
     exit: (direction: 1 | -1) => ({
       y: direction > 0 ? "-100%" : "100%",
       transition: { y: PUSH_SPRING },
     }),
   };
   const BACKDROP_VARIANTS = {
     enter: { opacity: 1 },
     center: { opacity: 0, transition: { delay: 0.15, duration: 0.3 } },
     exit: { opacity: 1, transition: { duration: 0 } },
   };
   ```
3. Structure (two nesting levels, exactly this):
   - OUTER `<AnimatePresence initial={false} custom={state.direction}>` —
     **never `mode="wait"`**: both screens must travel simultaneously.
     `custom` on AnimatePresence is what feeds the *fresh* direction to the
     exiting screen (its own render-time custom would be stale after a
     direction change).
   - Inside: `<motion.div key={def.id} custom={state.direction}
     variants={PUSH_VARIANTS} initial="enter" animate="center" exit="exit"
     className="absolute inset-0 z-10 will-change-transform">` — keyed by
     STORY ID ONLY (never phase; a story must not slide for its own
     second beat).
   - First child: the backdrop `<motion.div aria-hidden
     variants={BACKDROP_VARIANTS} className={absolute inset-0 +
     story field bg (bg-ink | bg-cream)} />`. **Why:** story screens are
     transparent (the §3.7 shader shows through them), so two overlapping
     transparent screens would double-expose mid-push. The backdrop is
     solid while traveling, fades out once settled (live shader shows
     through again), and snaps back solid instantly on exit. It reaches
     these states via variant-label propagation from the parent — it must
     NOT set its own `animate` prop, or propagation breaks.
   - Second child: the phase crossfade —
     `<AnimatePresence mode="wait" initial={false}>` around
     `<motion.div key={state.phase} initial={{opacity:0}}
     animate={{opacity:1}} exit={{opacity:0}}
     transition={{duration: TIMING.storyFadeMs / 1000}}>` wrapping the
     story component. `initial={false}` so a freshly pushed screen arrives
     FULLY DRAWN; only in-story setup→reveal changes crossfade.
4. The stage's `overflow-hidden` (§6.4) clips the traveling screens; the
   §3.7 shader keeps crossfading `u_fade` beneath — no shader changes.

### 8.2 Progress bar: stale fills on back-navigation

**Finding (screenshot-confirmed):** after navigating forward then back,
future bars kept ghost partial fills.

**Root cause — memorize this pattern:** the current bar's fill was written
imperatively (`node.style.transform` in rAF), but non-current bars were
reset declaratively (React inline style). React diffs against its own
previous VDOM, not the real DOM — it cannot see, and therefore never
clears, a mutation it didn't make. Never mix the two write paths on the
same property of the same element.

**Spec:** rewrite `progress-bar.tsx` so React NEVER writes the fill
transforms. Collect all fill nodes in a `useRef<(HTMLDivElement|null)[]>`
array via ref callbacks; one rAF loop paints every segment every frame:
`i < currentPos → scaleX(1)`, `i === currentPos → scaleX(beat)`,
`i > currentPos → scaleX(0)`. `currentPos`/`phase` are mirrored into refs
by a dependency-less effect so the loop never restarts. And implement the
§6.5 sub-beats that were previously skipped:
`beat = phase === "setup" ? p * 0.3 : 0.3 + p * 0.7` — one bar per story,
setup fills the first 30%, reveal the rest, no mid-story restart. The
component gains a `phase: Phase` prop (player passes `state.phase`).

### 8.3 Landing fit + first impression

**Findings (screenshot-confirmed):** the WRAPPED title clipped off BOTH
edges on a 390px phone; the backdrop marquee strip sat mid-screen colliding
with the subtitle; the page arrived static.

**Spec:**
1. Title size: `clamp(3.25rem, 17vw, 8rem)` — the math: 7 outline-tracked
   glyphs ≈ 4.9em wide; the column is 390 − 2×24px gutters = 342px;
   342/4.9 ≈ 70px ≈ 17vw. 22vw (the old value) needs ~600px. Title wrapper
   gets `w-full`; keep `viewTransitionName: "wrapped-title"`.
2. Marquee: `top-[8%]` (the empty band above the eyebrow), `text-[6rem]`,
   `opacity-[0.05]` — never mid-screen, never touching the copy column.
3. Entrance: stagger the column with
   `initial={{opacity:0, y:16}} animate={{opacity:1, y:0}}`,
   `transition={{duration:0.5, delay, ease:[0.22,1,0.36,1]}}`, delays
   0 / 0.08 / 0.16 / 0.24 / 0.32 for eyebrow / title block / subtitle /
   CTA block / footer.

### 8.4 The two remaining setState-per-frame leaks

**Finding:** "animations feel laggy" on device. Cause: React re-renders
inside per-frame/per-event hot paths.

1. `counter.tsx` called `setState` from `animate()`'s `onUpdate` — five
   receipt counters = ~300 React re-renders/second. Rewrite: hold a
   `useRef<HTMLSpanElement>`; `onUpdate` writes
   `node.textContent = Math.round(v).toLocaleString("en-US") + suffix`.
   Zero re-renders while rolling. SSR fallback text: final value when
   reduced-motion, else 0.
2. `08-your-club.tsx` FoilCard stored the sheen position in state, so every
   pointermove re-rendered the card. Rewrite: `sheenRef` +
   `sheenRef.current.style.backgroundPosition = \`${px*100}% ${py*100}%\``
   in the handler; the sheen div keeps a static initial
   `backgroundPosition: "50% 50%"`.

### 8.5 The rule behind all of §8 (add to your review checklist)

**Anything that changes every frame (or every pointer event) is written to
the DOM through a ref; React state is only for things that change per
BEAT** (story, phase, member, pause). One property, one writer: if a value
is ever written imperatively, React must never write that same property
declaratively. Existing compliant examples: the engine's `progressRef`, the
shader's uniform feed.

### 8.6 Verification (device-shaped, not just green checks)

1. `npx tsc --noEmit && npx eslint . && npx vitest run && npm run build`.
2. Playwright at 390×844:
   - landing `h1.getBoundingClientRect()` → `left >= 0 && right <= 390`;
   - navigate forward 4, back 6, then read every fill's computed transform:
     expect `[<current beat>, 0, 0, ...]` — any nonzero on a future bar is
     the §8.2 bug back;
   - screenshot mid-push (~180ms after a story tap): BOTH screens visible,
     opaque, traveling.
3. On a real phone after deploy: forward pushes up, back pushes down, grid
   jumps push in the right direction, no double-exposure, receipt count-up
   smooth, reduced-motion still instant.

---

## 9. The journey layer — continuous choreography

**Finding (owner, after §8 shipped):** even with the push, "it doesn't feel
like you're going on a journey." Correct diagnosis of the remaining gap:
Spotify Wrapped never *sits*. Every second of a story's duration is
choreographed; transitions feel like passage through space, not swaps; the
payoff elements keep living after they land. Our stories were two tableaus
with nice entrances and then seconds of stillness.

**The journey rule (non-negotiable, applies to every story you ever add):**
after the entrance settles, NOTHING on screen is ever perfectly still for
the rest of the beat. Something must always be breathing, drifting,
cycling, or flowing — subtle, transform-only, never distracting from the
payoff.

### 9.1 Phase passage (setup → reveal is a zoom-through, not a fade)

The inner phase `motion.div` in `player.tsx` (§8.1 step 3):

```ts
initial={{ opacity: 0, scale: 0.97 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 1.06 }}
transition={{ duration: TIMING.storyFadeMs / 1000, ease: "easeOut" }}
```

The setup line scales TOWARD the viewer as it dissolves and the reveal
rises from slightly beneath — you pass *through* the tease into the payoff.

### 9.2 Deck depth on the story push

`PUSH_VARIANTS` gains scale: `enter`/`center` at `scale: 1`, `exit` adds
`scale: 0.96` with `transition.scale = { duration: 0.4, ease: "easeIn" }`
(y keeps `PUSH_SPRING`). The outgoing screen recedes as it leaves — the
deck has depth; screens are cards, not flat panels.

### 9.3 `components/idle-float.tsx` — the reusable drift

One primitive so idle motion stays consistent (write verbatim): a
`motion.div` with `animate={{ y: [0, y], ...(scale ? { scale: [1, scale] }
: {}) }}` and `transition={{ delay, duration, repeat: Infinity,
repeatType: "mirror", ease: "easeInOut" }}`; renders a plain `div` under
reduced motion. Props: `y = -4`, `scale?`, `duration = 5`, `delay = 1`,
`className?`.

### 9.4 Where it is applied (exact values — do not improvise new ones)

| Story | Element | IdleFloat props |
|---|---|---|
| 1 The Year | the whole receipt (wraps the entrance motion.div, `className="w-full"`) | `y=-3 duration=6 delay=1.4` |
| 5 Your Events | the monument numeral | `y=-2 scale=1.02 duration=3 delay=1.2` |
| 7 Your Chapter | the YOU flag (inside its entrance div, `className="flex flex-col items-center"`) | `y=-5 duration=2.4 delay=1.6` |
| 8 Your Club | the FoilCard (phones get no pointer tilt — this is their card life) | `y=-5 duration=4 delay=1.5` |
| 10 Summary | the membership card | `y=-4 duration=5 delay=1.2` |

Already-alive reveals that need nothing: 2 (photo cycle), 3 (row cycle),
4 (credits roll), 6 (rotating seal), 9 (bouncing arrow) — plus the shader
field breathing behind everything.

### 9.5 Verification

`tsc`/`eslint`/`build` green; on device: watch any personal story for its
full 8s — at no point should the frame be static; setup→reveal should feel
like moving forward, not like a slide swap.

Commit: `feat(app): journey layer — passage transitions, deck depth, idle choreography`.

---

## 10. The cinematic motion pass — directed sequences (BUILT)

§9 made sure nothing sits still. This section is the next tier: **directed
sequences** — the stories' biggest beats become multi-step rituals with
anticipation, impact, and aftermath, the way a motion team would board them.
Implement exactly; the values are the design.

### 10.0 Sequencing architecture (read first)

1. **No new engine phases.** All sequences live INSIDE the reveal beat,
   expressed as absolute `delay` values on motion animations ("the film
   script model"). Never build a setTimeout state machine — declare every
   animation upfront with its delay; unmount cleanup is then automatic.
2. **The 80% rule:** every sequence must fully land by `0.8 × revealMs` of
   its story, so auto-advance can never cut a payoff. Budgets: club 10s
   reveal → sequence ≤ 3.5s. Standing 8s → ≤ 1.8s. The Year 7s → ≤ 1.6s.
3. Transform/opacity/clip-path only. Springs from `SPRING`, stagger from
   `TIMING.staggerMs`. Haptics only at named impact moments.
4. Known accepted limitation: hold-to-pause freezes the engine clock but
   not in-flight delays; sequences are ≤ 3.5s so this is imperceptible.

### 10.1 Content parallax inside the push

Between the screen div (§8.1) and the phase AnimatePresence, insert ONE
wrapper: `<motion.div variants={PARALLAX_VARIANTS} className="absolute
inset-0">` — variants only, NO `animate` prop (label propagation, same
mechanism as the backdrop):

```ts
const PARALLAX_SPRING = { type: "spring" as const, stiffness: 260, damping: 32 };
const PARALLAX_VARIANTS = {
  enter: (d: 1 | -1) => ({ y: d > 0 ? "12%" : "-12%" }),
  center: { y: "0%", transition: { y: PARALLAX_SPRING } },
  exit: (d: 1 | -1) => ({ y: d > 0 ? "-12%" : "12%", transition: { y: PARALLAX_SPRING } }),
};
```

The screen travels 100% on the stiffer spring; the content inside travels
an extra 12% on a softer one and settles ~60ms later — two layers at
different speeds is what makes the push read as *space*, not a slide
change. The backdrop stays on the screen div (it must always cover it).
The wrapper needs `custom={state.direction}` — variant propagation passes
labels, not custom.

### 10.2 The seam flash — chapters announce their color

First child of each pushed screen (above the backdrop): a 2px-tall,
full-width div in the incoming story's accent hex, pinned to the screen's
LEADING edge (top when direction=1, bottom when direction=-1), animating
`opacity: 0.9 → 0` over 300ms with delay 0.1s via variants
(`enter: {opacity: 0.9}`, `center: {opacity: 0, transition: {delay: 0.1,
duration: 0.3}}`, `exit: {opacity: 0}`). A blink of the next chapter's
color at the moment of crossing — connective tissue between stories.
Resolve the hex exactly like the player resolves `shaderAccentHex`.

### 10.3 Story 8, the club ritual — three beats (THE showpiece)

Replace the current instant flip with this board. All delays are from
reveal start; `S = TIMING.staggerMs / 1000`.

**Beat 1 — the draw (0 → 1.6s).** The four card backs from setup reappear
center-stage in a fan: card i (0-3) at `x: [-54, -18, 18, 54][i]px`,
`rotate: [-12, -4, 4, 12][i]deg`, entering with `SPRING.default`, delays
`i × S`. At 0.9s the three non-chosen cards fly out downward: `y: "130%"`,
`rotate: (i - 1.5) × 16deg`, `opacity: 0`, `duration: 0.45`,
`ease: "easeIn"`, stagger `0.08` — while the chosen card back moves to
`x: 0, rotate: 0, scale: 1.12` on `SPRING.default`. (Which card is
"chosen": index = `["builder","connector","observer","sprinter"]
.indexOf(club.id)`.)

**Beat 2 — the charge (1.6 → 2.4s).** The chosen card back trembles:
`rotate: [0, -1.5, 1.5, -1.5, 1.5, 0]` over 0.6s starting at 1.7s.
`vibrate(8)` at 2.2s (a `useEffect` + one timeout is permitted for haptics
only). The shader's `u_progress` is already live behind it.

**Beat 3 — the flip (2.4 → 3.4s).** The card back rotateY 0→90
(`duration: 0.18, ease: "easeIn"`, delay 2.4) then the REAL FoilCard
enters at rotateY -90→0 with `SPRING.flip` and `scale: 1.12 → 1`;
`vibrate([12, 40, 12])` fires on flip completion (keep the existing
mount-effect on FoilCard). Rarity badge stamps at 3.2s
(`scale: 1.4 → 1, opacity: 0 → 1`, `SPRING.stamp`); the vibe line's
existing kinetic cascade gets `delay: 3.4`. Then §9's idle float and the
pointer tilt own the remaining ~6s.

Implementation shape: a `ClubRitual` component in `08-your-club.tsx`
rendering fan cards + (delayed) FoilCard, all with absolute delays.
Guests keep the current simpler screen.

### 10.4 Story 6, the stamp slam — anticipation then impact

**Beat 1 (0 → 0.9s):** the seal ring draws in — `scale: 0.85 → 1,
opacity: 0 → 1, duration: 0.5` — and keeps its slow rotation.
**Beat 2 (0.9s):** "TOP X%" slams from `scale: 2.2, rotate: -14deg,
opacity: 0` to `scale: 1, rotate: -2deg, opacity: 1` — opacity snaps in
the first 60ms (`opacity: {duration: 0.06, delay: 0.9}`), transform rides
`SPRING.stamp` (delay 0.9). On landing (~1.15s): `vibrate([12, 40, 12])`
(move the existing haptic here) and an impact ripple — an absolutely
centered `border-2 border-ink/40 rounded-full` div, w/h 220px, animating
`scale: 1 → 1.6, opacity: 0.5 → 0, duration: 0.4, delay: 1.15`.
The stats (non-tier) variant is untouched.

### 10.5 Story 1, the receipt PRINTS

Keep the paper's spring entrance. The rows container gains
`clipPath: "inset(0 0 100% 0)"` → `"inset(0 0 0% 0)"`,
`duration: 1.2, ease: "linear"`, delay 0.3 — the receipt prints top-to-
bottom like it's coming off the till roll, count-ups rolling as each row
emerges (keep existing per-row delays; they now compound with the wipe).
The bottom perforation settles with `rotate: 0 → 1.2deg → 0` over 0.3s at
1.5s — the tear-off.

### 10.6 Story 10, the barcode draws the journey closed

Each barcode bar animates `scaleY: 0 → 1` (`transformOrigin: "bottom"`,
`duration: 0.2`), staggered `0.024s` left-to-right, starting at delay 0.8s
after the card's entrance — the year being printed onto your card,
a callback to story 1's receipt. (Requires the Barcode spans to become
motion.spans; keep `aria-hidden`.)

### 10.7 Micro-choreography table (small, do all of them)

| Story | Moment | Spec |
|---|---|---|
| 2 Moments | each photo flick | incoming top print overshoots: `rotate` keyframes `[-8, ROTATIONS[i]]` on cycle (existing `SPRING.photo`) |
| 3 Built | active row swell | add `x: [0, 4, 0]` over 0.3s alongside the existing scale pulse |
| 4 People | section headers | underline already draws; add header `x: -12 → 0` with it |
| 9 What's Next | title | letters rise individually: wrap in spans, `y: 14 → 0, opacity 0 → 1`, stagger `0.04s` — outline filter stays on the PARENT (never on the spans, §3.8 rule) |

### 10.8 Verification

1. Standard four checks green.
2. Playwright frame captures: club story at t = 1.0s (fan visible),
   2.0s (lone trembling card back), 3.0s (mid-flip), 4.0s (settled card);
   standing at 0.5s (ring only) and 1.3s (stamp landed, ripple mid-fade);
   the-year at 0.8s (receipt half-printed, clip edge visible).
3. Device: the club ritual must feel like a *ritual* — if the three beats
   read as lag rather than anticipation, tighten Beat 1 to 1.2s before
   touching anything else.

Commit: `feat(stories): cinematic motion pass — club ritual, stamp slam, receipt print, parallax`.

---

## 11. The glory pass — full design escalation (SPEC ONLY)

Owner review of the deployed build, round two. Verdict: mechanically sound,
emotionally sparse. This section escalates the experience to "memorable" —
it supersedes §8.1/§10.1 transition specs where they conflict. Everything
remains progressive-enhancement over the same engine; the §9 journey rule
and §8.5 ref-writing rule stay law.

(Ops note, not spec: the production 500 on `POST /api/auth/request` is the
Vercel project missing env vars — set all five from `.env.example`,
especially `WRAPPED_SESSION_SECRET`. Hardening: that route wraps its body
in try/catch and returns `{ error: "server_config" }` 500 with a
`console.error` naming the missing var — never a raw exception.)

### 11.1 Landing: the email capsule

The input + "SEND MY LINK" pill reads oversized (three-line text in a
blob). Replace the two-element row with ONE capsule:

- Input: `flex-1 rounded-full border border-cream/30 bg-transparent
  pl-5 pr-14 py-3` (pr-14 reserves the button well), same placeholder.
- Submit: a `40px × 40px` circular button ABSOLUTE inside the capsule's
  right edge (`right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-cream
  text-ink`), containing only `↑` (a 16px arrow glyph, `aria-label` =
  `copy.landing.emailSubmit`). Loading state: the arrow swaps for `…` and
  the button gets `opacity-60`. The helper line ("we'll email you a magic
  link…") stays below, unchanged.

### 11.2 Invisible chrome — the stage is the whole screen

Spotify shows no persistent UI. Ours shouldn't either:

- The progress segments + story label AUTO-HIDE: fade to `opacity: 0`
  (0.4s ease) after **1.8s** without a pointerdown; any pointerdown shows
  them again instantly (0.15s). While `paused` or `gridOpen`, chrome stays
  visible. Reduced motion: always visible (discoverability beats purity).
- Implement in `progress-bar.tsx`: a `chromeVisible` state + one idle
  timeout reset on `window` pointerdown (capture phase, passive). The rAF
  paint keeps running while hidden — bars must be CORRECT the instant they
  reappear.
- The ⊞ grid button stays at `opacity-40` permanently (the one affordance
  a first-time viewer needs), rising to full inside visible chrome.

### 11.3 The canvas camera — replaces "just going down"

The deck push becomes a CAMERA over an infinite canvas: stories live at
positions on a plane; advancing whips the camera to the next position —
sometimes down, sometimes across, sometimes diagonal. The persistent
shader field beneath (never unmounts, keeps breathing through every
transition) is what sells one continuous world.

1. **The path** (forward vectors between consecutive ACTIVE positions;
   backward = exact reverse; grid jumps use the vector of the boundary
   being crossed toward the target):
   ```ts
   // [x, y] in screen-fractions: where the NEXT screen enters from.
   const CANVAS_PATH: [number, number][] = [
     [0, 1],   // 1→2   down
     [1, 0],   // 2→3   across
     [1, 1],   // 3→4   diagonal ↘
     [0, 1],   // 4→5   down
     [1, 0],   // 5→6   across
     [-1, 1],  // 6→7   diagonal ↙
     [0, 1],   // 7→8   down
     [1, 1],   // 8→9   diagonal ↘ (into the club high)
     [0, 1],   // 9→10  down (the exhale)
   ];
   ```
   Boundary index = `min(prevPos, nextPos)` in the ACTIVE list (guest and
   member runs both just consume consecutive boundaries — no special
   cases). Engine change: `direction` becomes `vector: [number, number]`
   (keep a derived `direction = vector[1] >= 0 ? 1 : -1` for anything that
   still wants it).
2. **The whip** (replaces PUSH_SPRING for screen travel):
   - *Anticipation:* 90ms, camera nudges 1.5% OPPOSITE the travel vector
     (`ease: "easeOut"`) — the coil before the sprint.
   - *Whip:* 380ms `cubic-bezier(0.83, 0, 0.17, 1)` — slow-fast-slow with
     a violent middle; screens travel `±100%` on each nonzero axis.
   - *Smear:* during the whip the traveling screens scale 1.045 along the
     dominant axis (`scaleY` for vertical/diagonal, `scaleX` for pure
     horizontal), returning to 1 in the last 120ms — motion blur without
     `filter`.
   - Express all three as keyframes in the variants (`times: [0, 0.19,
     1]`-style), NOT as chained animations.
3. Content parallax (§10.1) and seam flash (§10.2) follow the vector:
   parallax offsets 12% along both nonzero axes; the seam pins to the
   leading edge (top/bottom for vertical, left/right for horizontal, the
   corner-adjacent edge pair may simply use the vertical edge on
   diagonals).
4. The §8.1 backdrop rules are unchanged. `will-change-transform` stays.

### 11.4 Story 1: the cold open (fixes "just 'what a year?'")

The setup beat becomes a three-cut title sequence — hard cuts, field
inversions, no fades. Add to `lib/copy.ts` (`theYear.coldOpen`):

```ts
coldOpen: [
  { line: "One chapter.",        field: "ink"   },
  { line: "One unhinged year.",  field: "cream" },
  { line: "We kept the receipts.", field: "ink", accentWord: "receipts" },
],
```

Each cut: full-bleed field color (backdrop div per cut — hard cut, zero
crossfade), line set in `t-display` at `clamp(2.6rem, 13cqw, 5rem)`,
entering as a §11.7 PopLetters burst (fast profile), holding, cut at
1.05s / 2.1s (three cuts fill the 3.5s setup, last ~1.3s). `accentWord`
renders in `--color-gdg-blue`. `vibrate(8)` on each cut. The old
setup line + sub are deleted from the screen (keep the copy keys; the
receipt reveal is unchanged and §10.5 printing still applies).

### 11.5 Story 2: the scrapbook becomes three scenes

Replace the single cycling stack with a directed collage, 12s reveal =
intro + three ~3.4s scenes (ORBIT → DEVFEST → GAMES+SPACES), hard-cut
seamed by a masking-tape wipe (a full-width `bg-gdg-red` bar sweeps
`x: -110% → 110%`, 0.28s, between scenes):

Per scene: 2–3 prints COMPOSE into a layout, not a pile — print A flies
from off-left (`x: -120%, rotate: -18°` → resting pose), B from off-right
120ms later, C (if present) drops from top with a bounce
(`SPRING.photo`); each landing slaps a tape strip on 60ms later
(`scale: 1.3 → 1, opacity: 0 → 0.9`); caption typewriters beneath
(chars appear at 24ms intervals — a state-free CSS `steps()` width reveal
on a monospace-tracked line). The whole scene container Ken-Burns drifts
(`scale: 1 → 1.06` + `x: 0 → -2%` over the scene, linear) — the camera
never stops. Resting poses per scene (A/B/C):
`{x: -18%, y: -6%, r: -5°}`, `{x: 16%, y: 4%, r: 3°}`, `{x: 0, y: -14%,
r: 1.5°}`. Photos come from the existing MOMENTS manifest grouped by
moment id; scenes with fewer photos use A/B only.

### 11.6 Story 4: chaptered credits (fixes "one long roll")

`revealMs: 14000 → 18000` in the registry. The roll becomes a SEQUENCE of
title-carded chapters, each: title card (0.8s) → cast moment (1.6s) →
whip-cut. Chapter list and order:

1. `CORE TEAM` — headshot circles pop into an arc (§11.7 PopLetters
   title + photos spring-pop, stagger 70ms, sized 64px)
2. `THE TRACKS` — same pattern, TRACKS section people
3. `DEV CREW` — DEV section
4. `MEDIA & STORY` — MEDIA section
5. `EVENTS & OPS` — EVENTS section
6. `THE BUILDERS` — product crew board: four mini-cards (RADAR, ORBIT
   SYSTEMS, BABCOCK VOTES, BABCOCK 100) sliding in as a 2×2 grid with
   the crew names beneath each, from a NEW `CREWS` map in
   `lib/content/chapter.ts` (`Record<productId, string[]>` — leads fill
   the names; ship with the known leads pre-filled, empty arrays render
   the card without names, never blank text)
7. `SPECIAL MENTION — THE DESIGNERS` — full card, names large, gdg-yellow
   field flash
8. Closer: "…and everyone who showed up." in `t-editorial` (kept).

Title cards: chapter name in PopLetters on an accent-tinted panel
(rotating through blue/red/yellow/green per chapter), panel skews in
(`skewY: 3° → 0`). Cast moments show REAL photos — every person with a
headshot appears somewhere in the sequence; InitialsAvatar fills gaps.
Pausable: hold still freezes the engine clock; chapter scheduling must
key off elapsed reveal progress (`progressRef`), not wall-clock — this is
the ONE §10.0 exception, because 18s of pausable content drifts too far
on wall-clock delays. Drive scene index from `Math.floor(progress * 8)`
painted imperatively (§8.5: a single rAF reading `progressRef`, calling
`setScene(i)` ONLY when the integer changes — a per-scene state change is
per-beat, allowed).

### 11.7 `components/pop-letters.tsx` — bubbly display type

The "site feels alive" primitive (filled type ONLY — never combine with
`.text-outline-*` filters):

- Splits text into per-letter `motion.span`s (`inline-block`,
  `whitespace-pre` for spaces).
- Each letter: `initial {opacity: 0, scale: 0, rotate: r, y: 14}` →
  `{opacity: 1, scale: 1, rotate: 0, y: 0}` with
  `spring stiffness 500 damping 18` (visible overshoot — the "bubble").
  `r` = deterministic pseudo-random in ±8° from char index
  (`((i * 37) % 17 - 8)`), NO Math.random (SSR-safe).
- Stagger profiles: `default` 45ms, `fast` 24ms (the §11.4 cold open).
- Optional `wave` prop: after landing, letters loop `y: [0, -3, 0]`
  offset by `i * 90ms`, 2.4s period — for the What's Next title and
  chapter cards only. Reduced motion: plain text.

Uses: §11.4 cold open, §11.6 chapter titles, story 9 title (replaces the
§10.7 span-rise spec for it), landing "2025–26" line keeps kinetic-breathe.

### 11.8 Asset escalation (owner action, blocking §11.5–11.6 quality)

More photography, or the collage stays sparse: target **4+ photos per
moment** in `public/moments/{orbit,devfest,games,spaces}/` (same naming)
and headshots for anyone missing in `public/people/`. The spec renders
gracefully with fewer — but "memorable" is bought with pictures.

### 11.9 Verification & sequencing

Implementation order (each its own commit):
1. `fix(landing): email capsule and auth request hardening` (§11.1 + ops)
2. `feat(engine): canvas camera whip transitions and invisible chrome` (§11.2–11.3)
3. `feat(type): pop-letters primitive and story-one cold open` (§11.4, §11.7)
4. `feat(stories): scrapbook scenes and chaptered credits` (§11.5–11.6, §10 items may ride along)

Device checks: whip feels like acceleration (the anticipation nudge must
be *felt*, not seen); diagonals read as moving across a canvas — if they
read as "broken vertical", drop diagonal vectors to `[±1, 1]` with the
x-component halved in the variants, not the path. Chrome reappears
instantly on touch. Cold open cuts land with the haptic. Credits: every
face appears; nobody's chapter is skipped when photos are missing. The
80% rule (§10.0) holds for every new sequence at its story's revealMs.

---

## 12. Cadence amendments + the soundtrack (BUILT)

Owner playtest findings after §11 shipped, plus the audio decision.

### 12.1 Cadence rules (override earlier values; these are law now)

> Things must sit long enough to be taken in. Short lines can cut fast —
> that reads as acceleration — but anything with faces, numbers, or more
> than four words earns time proportional to its content.

- **Cold open** (§11.4 amended): FOUR cuts, restoring the brand line —
  "One chapter." / "One unhinged year." / **"What a year."** /
  "We kept the receipts." Delays `[0, 1150, 2300, 3500]` over a **5000ms**
  setup beat (registry: the-year `setupMs 3500 → 5000`, `revealMs
  7000 → 8000` so the printing receipt also sits).
- **Chaptered credits** (§11.6 amended): title cards hold **900ms**; a cast
  moment earns `min(1600 + people × 110, 3400)` ms — MEDIA's sixteen faces
  get ~3.4s, CORE's six ~2.3s; boards hold 2600ms. Avatar stagger 90ms.
  Registry: people `revealMs 18000 → 28000` (`TIMING.peopleMs` matches).
- The §10.0 80% rule still applies to every payoff sequence.

### 12.2 The soundtrack — `lib/audio.ts` + `mute-button.tsx`

Music was excluded by `build.md` §3.8.7; the owner overrode it. The
contract:

1. ONE looping ambient track for the whole experience, at `volume 0.35`:
   **`public/audio/wrapped-loop.mp3`** — owner-supplied (licensed or
   royalty-free, ~1–2 MB, seamless loop; the media team's aftermovie bed is
   the obvious candidate). THE FILE IS NOT IN GIT — deploy adds it.
2. Browsers block autoplay before a gesture, so playback starts on the
   visitor's FIRST pointerdown/keydown inside the player (one-shot capture
   listeners in `player.tsx` → `startAudio()`).
3. A speaker toggle lives in the chrome fade group (next to the share
   chip); mute preference persists in `localStorage["wrapped-muted"]`.
4. Missing file → the `<audio>` errors → `available=false` → the button
   hides and everything degrades to silence with zero UI residue. Tab
   hidden → pause; visible again → resume iff started and unmuted.
5. Nothing else ever plays sound (per-story stingers are OUT — one bed,
   or silence).
