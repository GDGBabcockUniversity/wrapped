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
4. **ORBIT sheets**: export each sheet as CSV with at least an Email column
   and a "Checked In" (Yes/No) column, under `data/sources/orbit/`.

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
