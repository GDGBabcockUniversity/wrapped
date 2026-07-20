# The data playbook — using everything we have

How every source feeds the Wrapped, the one constraint that makes it hard, and
the exact steps to get from raw exports to a written database with the highest
honest coverage. Run everything from the repo root. All raw data lives under
`data/` (gitignored — member PII never leaves the machine).

## What we have, and what each source is for

| Source | Path | Feeds | Identity key |
|---|---|---|---|
| Auth platform DB | `PIPELINE_DATABASE_URL` | check-ins, registrations, Radar reads/plays, **WhatsApp numbers**, join dates | UUID → email |
| community.dev roster | `data/sources/community/*.csv` | the 1,600-member universe, join dates, **more WhatsApp numbers** | email |
| Event attendance | `data/sources/events/*.csv` | check-ins for members with no auth account | email |
| ORBIT / Luma | `data/sources/orbit/*.csv` | the flagship's registrations, new members | email |
| Member WhatsApp exports | `data/exports/*.txt` | **personal** message stats (your-standing, summary) | sender display name |
| Group WhatsApp exports | `data/exports/groups/*.txt` | **chapter** group-chat stats (already baked into `lib/content/chapter.ts`) | — |
| Google Contacts export | `data/contacts.csv` *(optional)* | the phone-evidence bridge — see below | name → number |

The universe (`universe.ts`) is the union of all of these, keyed by lowercased
email. Auth members carry a UUID and a WhatsApp number; everyone else is
email-only. Event activity is deduped per (email, normalized title) across every
source, so an event tracked in both the auth DB and Luma counts once.

## The one hard constraint

A WhatsApp export writes only the **exporting phone's address-book display
name** for each saved contact — the phone number is never in the file. So:

- Auth-platform members auto-match: the DB gives us their number, the export
  gives a `+234…` sender for anyone not in the exporter's contacts, and
  `last-10-digits` links them. This is the ~1% of volume that "just works."
- Everyone the exporter has saved shows up as `"Emma"`, `"Hack13"`,
  `"~ ÆSÏR"` — a name with no number. ~98% of message volume is keyed this way
  and cannot be linked to a member without more evidence.

A **wrong** link is worse than a missing one: it puts one person's messages on
another person's card. So every automated step below is conservative by design,
and the 80% match-rate gate in `run.ts` refuses to write personal message stats
until enough volume is honestly resolved (there's an `--allow-low-match` hatch
to ship chapter/event data first and backfill messages later).

## The bridge that actually clears the gate: phone evidence

The strongest signal is a **contacts export from the phone that exported the
chats**. It restores the missing name→number link:

1. On that phone: Google Contacts → Export → Google CSV → save as
   `data/contacts.csv`.
2. `build-mapping.ts` reads it, matches each contact's number against roster
   WhatsApp numbers (`number → email`), and hard-links `display name → email`.

Because the chat's sender names ARE that phone's contact names, this resolves
the big nickname senders (`"YE"`, `"Satan"`, `"~ ÆSÏR"`) that no name-matching
can ever reach. Without it, the top 15 unresolved senders alone are ~52% of all
volume — the gate cannot be cleared by name-matching alone.

## The procedure

```bash
# 0. One-time: point at the read replica and set the year window.
export PIPELINE_DATABASE_URL='postgres://…'          # read-only creds
export WRAPPED_YEAR_START=2025-09-01 WRAPPED_YEAR_END=2026-08-01

# 1. Drop every export in place:
#    data/sources/**/*.csv     (community, events, orbit)
#    data/exports/*.txt        (member chats, personal path)
#    data/exports/groups/*.txt (group chats, chapter stats)
#    data/contacts.csv         (optional but decisive — see above)

# 2. Build mapping.json automatically where it's safe.
npx tsx scripts/pipeline/build-mapping.ts            # dry run: prints projected match rate, writes review CSV
npx tsx scripts/pipeline/build-mapping.ts --write    # merges phone + single-dominant auto-accepts

# 3. Curate the rest by hand — biggest-volume senders first.
#    Open data/mapping-review.csv, confirm a candidate, and add it to
#    data/mapping.json as  "<senderKey>": "<email>". Manual entries always win.

# 4. Re-run step 2's dry run until PROJECTED MATCH RATE ≥ 80%.

# 5. Full pipeline: dry run, then write.
npm run pipeline -- --dry-run                        # report only
npm run pipeline -- --write                          # writes snapshots (asks for confirmation)
#   below 80% but need chapter/event data now?
npm run pipeline -- --write --allow-low-match
```

`data/opt-out.json` (an array of emails) is honored on every write — those
snapshots are deleted, never created.

## How `build-mapping.ts` decides (safest first)

1. **Phone evidence** — `contacts.csv` name → roster number → email. Accepted.
2. **Single dominant candidate** — token-scored against every roster/attendance
   name and email-local. Accepted only when ONE candidate clears `ACCEPT_MIN`
   (0.75) AND beats the runner-up by `MARGIN` (0.35). `"Audrey"` →
   `"Audrey Okafor"` and `"Hack13"` → `addisonhackss14@…` pass; `"Emma"` (three
   people tie) and `"Neku"` (two tie) fall through to review — correctly.
3. **Review** — everything else, written to `data/mapping-review.csv`
   biggest-volume-first for a human.

The classifier is pure and unit-tested (`build-mapping.test.ts`). Tune
`ACCEPT_MIN` / `MARGIN` there if you want it more or less aggressive.

## Where the numbers live

Group-chat and product stats are already audited and frozen in
`lib/content/chapter.ts` (`CHAPTER`, `GROUP_CHAT`, `GROUP_TOPICS`, `PRODUCTS`).
Re-audit the group chat with `npx tsx scripts/pipeline/run-group-stats.ts`.
Per-member snapshots (`your-events`, `standing`, `summary`) come from the DB
write in step 5 and are read at request time by `/api/me`.
