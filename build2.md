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

Same git rules as `build.md` §1.1: author `nekumartins <akpotohwoo@gmail.com>`,
unsigned, `type(scope): subject`, wrapped → `main` directly.
