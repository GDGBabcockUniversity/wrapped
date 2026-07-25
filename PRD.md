# GDG Wrapped — Product Requirements Document

**Product:** GDG Wrapped 2025/26 (`wrapped.gdgbabcock.com`)
**Owner:** Chukwuneku Akpotohwo (Organizer)
**Status:** Built; awaiting final data + copy freeze
**Audience for this doc:** the data team, plus anyone joining the build
**Last updated:** 2026-07-25

> This is the *what and why*, and the exact data contract the product runs on.
> For the step-by-step "how do I actually run the pipeline" procedure, see
> [`scripts/pipeline/DATA.md`](scripts/pipeline/DATA.md) — that's the
> operational playbook. This document is what you design analysis against.

---

## 1. What this product is

A Spotify-Wrapped-style, story-by-story recap of GDG on Campus Babcock's
2025/26 year. A visitor taps through full-screen chapters: what the chapter
did as a whole, then — if they're a member — what *they* did in it.

It ends on a shareable card.

**One sentence:** the chapter's year, told as a story, with the member in it.

## 2. Why we're building it

1. **Recognition.** 1,600+ members, 8 events, 5 shipped products, 17,579
   messages. Almost none of that is visible to the people who did it.
2. **Retention.** A personal artefact at year end ("you were top 8%") is the
   cheapest re-engagement we have going into the next cohort.
3. **Proof.** A public, concrete record of what a student chapter actually
   shipped — useful for sponsors, the university, and recruitment.
4. **The data exists already.** Check-ins, a member roster, WhatsApp exports,
   and platform usage are all sitting in systems we control.

## 3. Non-goals

- Not a dashboard or an analytics tool. Every number must carry a story line.
- Not real-time. It is a **frozen snapshot** computed once, before launch.
- Not a leaderboard. We show a member their own standing, never a public
  ranking of people against each other.
- No public exposure of anyone's message content, ever.

## 4. Users

| User | What they see | Requirement |
|---|---|---|
| **Member** (matched to our data) | All 11 chapters, including 5 personal ones + their card | Must feel accurate. A wrong number is worse than a missing one. |
| **Guest** (no match / not a member) | The 6 public chapters + guest variants | Must never feel like a locked door — it's an invitation. |
| **Low-activity member** | Everything, with copy that reframes rather than shames | Explicit design rule: **never shame**. No "you did nothing" screens. |

Access is by **magic link to a verified email**. There is no browsing of other
people's data — a session only ever resolves to one snapshot.

## 5. The experience (11 chapters)

Public chapters are the same for everyone; personal chapters are per-member.

| # | Chapter | Type | What it needs from data |
|---|---|---|---|
| 0 | The Year | public | `CHAPTER` totals — events, members, products, check-ins, messages |
| 1 | The Moments | public | Curated photos + captions (no analysis) |
| 2 | What We Built | public | Per-product stats (`PRODUCT_SAGA`) — Radar, Votes, ORBIT |
| 3 | The Group Chat | public | `GROUP_CHAT` + `GROUP_TOPICS` — chapter-level chat analysis |
| 4 | The People | public | Roster from the website team page (no analysis) |
| 5 | Your Events | **personal** | `snapshot.events` |
| 6 | Your Standing | **personal** | `snapshot.standing`, `snapshot.messages` |
| 7 | Your Chapter | **personal** | `snapshot.joinDate`, `tenureMonths` |
| 8 | Your Club | **personal** | `snapshot.club` |
| 9 | What's Next | public | Static copy |
| 10 | Your Card | **personal** | Everything above, composed for sharing |

**The data team owns chapters 0, 2, 3, and 5–8.** Chapters 1, 4, and 9 are
editorial.

---

## 6. The data contract

### 6.1 Architecture rule (important)

The web app **never queries a warehouse at render time**. The pipeline runs
offline, computes everything, and writes:

- one **frozen JSON snapshot per member** → `wrapped_snapshots`
- chapter-level aggregates → `wrapped_meta`
- chapter-level *content* (group chat, products) → committed TypeScript
  constants in `lib/content/chapter.ts`

So the analysis deliverable is **numbers that get pasted/written once**, not a
live query. Anything you build must survive being frozen.

### 6.2 Sources of truth

| Source | Location | Feeds | Join key |
|---|---|---|---|
| Auth platform DB (Postgres) | `PIPELINE_DATABASE_URL` | check-ins, registrations, Radar reads/plays, WhatsApp numbers, join dates | UUID → email |
| community.dev roster | `data/sources/community/*.csv` | the member universe, join dates, WhatsApp numbers | email |
| Event attendance exports | `data/sources/events/*.csv` | check-ins for non-platform members | email |
| ORBIT / Luma exports | `data/sources/orbit/*.csv` | registrations, new members | email |
| Member WhatsApp exports | `data/exports/*.txt` | **personal** message stats | sender display name |
| Group WhatsApp exports | `data/exports/groups/*.txt` | **chapter** chat stats | — |
| Google Contacts export | `data/contacts.csv` | name → number bridge (see §6.5) | name |

**The universe** = union of all sources, keyed by **lowercased email**. Event
activity is deduped per `(email, normalized_title)` so an event present in both
the auth DB and Luma counts once.

`data/` is gitignored. **Member PII never leaves the machine that runs the
pipeline.**

### 6.3 The per-member snapshot (the core deliverable)

This is the exact shape written per member. Anything analysis produces must
land in these fields — adding a field means changing `lib/snapshot.ts`, the
Zod schema, and the story that renders it.

```ts
{
  version: 1,
  name: string,                  // full name
  firstName: string,             // first token, for copy
  joinDate: string,              // ISO date
  joinMonthLabel: string,        // e.g. "September 2025" — precomputed
  tenureMonths: number,
  isNewMember: boolean,          // joined after 2026-03-01
  events: {
    checkins: number,
    registrations: number,
    titles: string[],            // max 8, most recent first
    firstEventTitle: string | null,
  },
  messages:                      // discriminated union — unmatched is a first-class state
    | { matched: true, count: number, activeDays: number, peakMonthLabel: string | null }
    | { matched: false },
  standing: {
    percentile: number,          // 1–100, 1 = top 1%
    tier: "top1" | "top5" | "top10" | "top25" | "member",
  },
  club: {
    id: "builder" | "connector" | "observer" | "sprinter",
    rarityPct: number,           // share of chapter in this club
  },
  flags: {
    zeroCheckins: boolean,
    lowActivity: boolean,        // checkins <= 1 AND (unmatched OR messages < 20)
  },
}
```

Chapter-level aggregate (`wrapped_meta`):

```ts
{ version: 1, members, eventsRun, totalCheckins, messagesParsed,
  productsShipped, clubDistribution: Record<ClubId, number>, computedAt }
```

### 6.4 Definitions the analysis must respect

These are **already implemented** (`scripts/pipeline/percentiles.ts`,
`clubs.ts`). Don't reinvent them — if you want to change them, change them
here and tell us, because the copy is written against these semantics.

**Activity score** (drives standing):
```
matched:    0.6 · pct(log1p(messages)) + 0.4 · pct(checkins)
unmatched:  pct(checkins)
```
`pct(x)` = fraction of members strictly below `x`. Messages are log-scaled so
one hyper-poster doesn't flatten everyone else. Unmatched members are scored on
check-ins alone rather than being penalised for missing message data.

**Percentile**: `max(1, ceil(100 · (1 − fraction_strictly_below)))` — the top
score always lands at 1; ties share the better percentile.

**Clubs** (four, argmax over these scores, priority sprinter > builder >
connector > observer on ties):
```
builder   = 0.45·Pc + 0.20·attendance + 0.20·P_radar + 0.15·consistency
connector = 0.55·Pm + 0.25·consistency + 0.20·Pc          (0 if unmatched)
sprinter  = 0.65·burst + 0.35·max(Pc, Pm)                 (0 if activity < 20)
observer  = 0.40·(1 − Pm) + 0.35·Pr + 0.25·(1 − burst)
```
where `attendance = checkins / max(registrations, checkins, 1)`,
`consistency = active_months / eligible_months` (active = ≥1 check-in or ≥5
messages in that month), and `burst` = max 30-day share of total activity
(`10·checkins + messages`), 0 when total activity < 20.

**Club rebalance**: any club below **8%** of the population pulls in the
nearest members from the largest club — *except* zero-activity members, who are
pinned to Observer. The never-shame rule outranks the population floor.

### 6.5 The known hard problem: WhatsApp identity

A WhatsApp export contains only the **exporting phone's contact display name**
for saved contacts — never the number. Result:

- Platform members whose number we hold auto-match (~1% of volume).
- ~98% of volume is names like `"Emma"`, `"Hack13"`, `"~ ÆSÏR"`, unlinkable
  without more evidence.

**A wrong link is worse than a missing one** — it puts one person's messages on
another person's card. So:

- `run.ts` enforces an **80% match-rate gate** before writing personal message
  stats (`--allow-low-match` exists to ship event/chapter data first).
- The bridge that clears it is a **Google Contacts export from the exporting
  phone** (`data/contacts.csv`), which restores name → number → email.
- Unresolved senders are written to `data/unmatched.csv` for manual mapping in
  `data/mapping.json`.

`matched: false` is a **designed state**, not a failure — those members get
copy that works without message stats.

---

## 7. What we want from the data team

Ordered by value. Everything here is chapter-level (safe to publish) unless
marked personal.

### 7.1 Fill the gaps that are still TBD

These are `null` in the codebase right now and each one is a beat that doesn't
render until filled. The pipeline report prints this list on every run.

| Field | What we need |
|---|---|
| `PRODUCT_SAGA.radar.*` | articles published, most-read article, total reads |
| `PRODUCT_SAGA.votes.*` | elections run, total votes cast |
| `PRODUCT_SAGA.orbit.lagos` | students taken to Lagos (field trips) |
| `PRODUCT_SAGA.orbit.careerFair` | career-fair turnout |
| `PRODUCT_SAGA.orbit.summit` | summit-day turnout |
| `PRODUCT_SAGA.website` / `babcock100` | headline usage stat each |
| `GROUP_CHAT.topSubgroup` | most active subgroup, by message volume |

### 7.2 Raise personal-data coverage

The single highest-leverage analysis job: **get the WhatsApp match rate above
80% honestly.** Deliverable = a curated `data/mapping.json` (display name →
email) plus the evidence trail for each link. See `DATA.md` §"the bridge".

Secondary: reconcile members present in exports but missing from the roster.

### 7.3 Chapter-level chat analysis (the "fun stats")

Already computed and shipped, but re-runnable and extendable — this is where
the "first text" style findings live. Current outputs (`GROUP_CHAT`,
`GROUP_TOPICS`): messages, unique senders, top yappers, busiest day, peak hour,
after-midnight count, stickers, deleted, laughs, dialect words, longest streak,
words of the year, emoji leaderboard, topic buckets, name drops, links + link
domains, question count, loudest (ALL-CAPS) member, longest message,
conversation starters.

**Rules for anything new here:**
1. **Aggregate only.** No message text is ever displayed verbatim except where
   it's already anonymous (a word, an emoji, a link domain).
2. **Attribution requires consent.** Naming a member as "the loudest" or "the
   starter" is fine — the owner curates the final list before freeze.
3. **Every stat needs a line.** A number without a consequence ("1,133
   messages — one game night went completely off the rails") doesn't ship.
4. Junk-filter aggressively: no consonant fragments, no roster names leaking
   into "words of the year" unless deliberate.

### 7.4 Ideas we'd take (not yet built)

- First-message-ever per member ("your first text was…") — **personal**, needs
  the identity bridge first.
- Time-of-day personality (night owl vs early bird) — personal.
- Event-attendance streaks / the event you never missed.
- Growth curve: members joined per month across the year.
- Cross-source: do event attendees post more? Does Radar reading correlate with
  check-ins? (Chapter-level finding, not per-member.)

---

## 8. Privacy and ethics (non-negotiable)

1. **Opt-out is absolute.** `data/opt-out.json` — those emails are deleted from
   `wrapped_snapshots` on every run.
2. **No message content leaves the machine.** The parsers read a line only to
   classify it (sticker? deleted? contains a word?) and discard the text.
3. **No cross-member visibility.** A session resolves to exactly one snapshot.
4. **No public ranking of individuals.** Percentile is shown to that member
   only. The public "MVP" callouts are owner-curated, not algorithmic.
5. **Never shame.** Low activity gets reframing copy, never a null state.
6. **Raw data is gitignored** and stays local.

## 9. Success criteria

| Metric | Target |
|---|---|
| Members with a snapshot | ≥ 500 (the active 25/26 cohort) |
| WhatsApp match rate | ≥ 80% of message volume before personal stats ship |
| Snapshot accuracy | 0 known wrong attributions — spot-checked by leads |
| Completion rate | ≥ 60% of openers reach the final card |
| Shares | ≥ 25% of members who finish share the card |
| Data TBDs remaining at freeze | 0 |

## 10. Timeline

| Stage | Owner | Status |
|---|---|---|
| Experience built (11 chapters) | Dev | ✅ done |
| Pipeline built + tested | Dev | ✅ done |
| Chapter chat analysis | Data | ✅ v1 shipped, extendable |
| Product stats (§7.1) | Data | ⏳ open |
| Identity bridge → 80% match (§7.2) | Data | ⏳ open — **blocks personal message stats** |
| Copy freeze | Owner | ⏳ after the above |
| Launch (around grad week) | Owner | ⏳ |

## 11. Appendix — where things live

| Thing | Path |
|---|---|
| Per-member schema | `lib/snapshot.ts` |
| Chapter content + all frozen numbers | `lib/content/chapter.ts` |
| Story registry (order, timing) | `lib/stories.ts` |
| Pipeline entry point | `scripts/pipeline/run.ts` |
| Standing / percentile maths | `scripts/pipeline/percentiles.ts` |
| Club assignment | `scripts/pipeline/clubs.ts` |
| Chat stats | `scripts/pipeline/group-stats.ts`, `topics.ts` |
| Identity matching | `scripts/pipeline/match-members.ts`, `build-mapping.ts` |
| Operational playbook | `scripts/pipeline/DATA.md` |
| Design/build specs | `build.md` … `build7.md` |

**Run the pipeline (safe, no writes):**
```bash
npx tsx scripts/pipeline/run.ts --dry-run     # prints the full report incl. every TBD
npx tsx scripts/pipeline/run-group-stats.ts   # chapter chat stats only
```
