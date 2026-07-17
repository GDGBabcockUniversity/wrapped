# GDG Wrapped 25/26

The chapter's year in review — a 10-story tap-through experience with per-member
stats, clubs, and shareable cards. Built spec-first: `build.md` is the source of
truth for every design and architecture decision.

## Run it locally (2 minutes)

```bash
npm install
cp .env.example .env.local
npm run dev
```

The public experience (landing + chapter stories + guest flow) needs **zero**
environment variables. For the personal flow locally:

- `WRAPPED_SESSION_SECRET` — any 32+ char string (`openssl rand -base64 32`)
- `DATABASE_URL` — a Neon connection string with `wrapped_snapshots` populated
- `RESEND_API_KEY` — optional in dev; when unset, the magic link is printed to
  the server console instead of emailed. Open it from the terminal.

`/debug/cards` shows every share card × every member fixture without any auth.

## Launch checklist (in order)

1. **Apply the DB migration** — `auth/database/migrations/005_wrapped.sql`
   currently sits on the `claude/gdg-babcock-wrapped-4j5hoo` branch of the auth
   repo. Merge it and apply to the auth Neon DB (additive, idempotent — safe to
   run on prod).
2. **Vercel project** — set the runtime env vars from `.env.example`
   (`DATABASE_URL` **pooled** string, `WRAPPED_SESSION_SECRET`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`). Never set
   `PIPELINE_DATABASE_URL` in Vercel.
3. **DNS + email** — point `wrapped.gdgbabcock.com` at the Vercel project;
   verify `gdgbabcock.com` as a sending domain in Resend.
4. **Real photos** — `public/moments/{devfest,games,spaces}/` are labeled
   placeholders; only `orbit/` is real. Drop team photography in with the same
   `01.jpg, 02.jpg…` names (9:16-ish or square, they get masked). Headshots in
   `public/people/` are already real (49 of 52; the rest fall back to initials).
5. **Confirm chapter numbers** — `lib/content/chapter.ts` has four values
   marked `TBD-confirm` (members, eventsRun, totalCheckins, messagesParsed).
   The pipeline report supplies the last two.
6. **Export the platform data** (the member universe spans four systems —
   see `build2.md` for exact formats and conventions):
   - community.dev (Bevy): member roster CSV → `data/sources/community/members.csv`,
     plus per-event attendance CSVs named `YYYY-MM-DD-event-name.csv`
   - Luma: per-event guest CSVs → `data/sources/luma/YYYY-MM-DD-event-name.csv`
   - ORBIT sheets: CSVs with Email + Checked In columns → `data/sources/orbit/`
   - WhatsApp: chat exports (without media) → `data/exports/*.txt`
7. **Run the pipeline** (a lead, locally — never deployed):
   ```bash
   # rehearsal with synthetic data (includes fake community/Luma/ORBIT CSVs)
   npm run pipeline -- --seed --dry-run
   # real data:
   npm run pipeline -- --dry-run     # prints the report + unmatched.csv
   # fill data/mapping.json until matched volume ≥ 80%, then
   npm run pipeline -- --write       # asks for confirmation, writes snapshots
   ```
   Set `PIPELINE_DATABASE_URL` (direct, non-pooled string) in your local `.env`.
   Raw exports never leave the machine; message bodies are discarded at parse.
   Anyone appearing in ANY source gets a Wrapped — community.dev-only members
   included (they land in the snapshot table with a null auth user id).
8. **Soft launch** — core team 48h before public, per `build.md` §16.

## Verify

```bash
npx tsc --noEmit && npx eslint . && npx vitest run && npm run build
```

## Repo map

- `build.md` — the full spec (§17 has the commit plan this repo was built from)
- `build2.md` — amendment: the cross-platform member universe (community.dev/Luma/ORBIT ingestion)
- `components/story-engine/` — state machine, gestures, progress, shader feed
- `components/stories/` — the ten screens
- `components/gl/` — WebGL2 shader fields (progressive enhancement)
- `components/share/` — PNG cards (satori), live-card video export, share sheet
- `scripts/pipeline/` — offline stats/clubs pipeline + vitest suite
- `data/` — gitignored; exports, mapping, opt-outs live only on the runner's machine
