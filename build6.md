# GDG Wrapped — build6: the fluid pass (motion truth, scrapbook depth, chat topics, working magic links)

This document AMENDS `build.md` through `build5.md`. Everything in those
files stays in force — especially the prime directive:

> **DO NOT INVENT.** Every design token, animation value, copy line, formula,
> and threshold you need is specified. If something seems missing, re-read the
> spec; if it is genuinely missing, stop and ask — do not fill the gap with
> your own idea.

Where this file conflicts with earlier build docs, **this file wins**.

---

## 0. What the owner and the team said (2026-07-19, on-device review)

The owner reviewed the deployed site on a real iPhone over LTE and sent five
screenshots plus two teammates' reactions. Verbatim, because the register
matters:

- *"i said we were getting there not we were there with the motion, it still
  feels wonky and could be infinitely better"*
- *"the first slide feels broken, like the 2025 is jammed, everything still
  needs to be fluid"*
- *"the orbit screen shot i sent, tell me it doesnt look ass, why am i seeing
  only one picture and its a post card type card and it doesn't give story,
  it should be more fun"*
- *"some cards are just bland and like in the original spotify wrapped vid i
  sent you there should be an indicative maybe swipe to scroll gesture so
  people know although its automatic, the bar should not always be visible
  tho"*
- *"is that the best you could do with the whatsapp data, no topics? this is
  a young people group chat for goodness"*
- *"again we're pushing the limits here and being the furthest thing from
  boring"*
- Magic link: *"i put an email that wasnt in our list and it output check
  your inbox sent, even though nothing was sent, even for a correct email it
  did the same thing"* — the plan for this goes in this doc (§7).

Jadesola Adebayo: sound effects as the cards change/swap, or music in the
background; some texts not aligned; "the colors are nice and the overall
creative direction is dope"; wants different colors for the cards — "the
color is not looking exciting like that."

Ayo Agunbiade: "First off, music? There should be previews yeah? … I like
it. Though the text was bunched up on a few of the pages."

The owner is also uploading the FULL WhatsApp export set (queued in batches
of 5 files per message — the chat upload limit). §6 specifies exactly what
to do with it when it lands.

Screenshot evidence, mapped to root causes (each verified in code before
this doc was written — none of these are guesses):

| Screenshot | Symptom | Root cause (verified) |
|---|---|---|
| Group-chat setup | "We need t / o talk abo / ut the gro / up chat." — words shattered across lines | `PopLetters` renders every letter as its own `inline-block` span; inline-blocks are atomic boxes, so the browser may break BETWEEN ANY TWO LETTERS. Wrapping ignores words entirely. (`components/pop-letters.tsx:39-47`) |
| Chapter grid | Three of four visible cards are blank dark rectangles with a colored dot | `chapter-grid.tsx` renders field color + label only — no artwork exists |
| Summary | "PAUSED" toast printed on top of the SHARE YOUR CARD button | The paused toast (`bottom-20 left-1/2`, build5 §2.3) collides with summary's CTA stack; summary has `revealMs: 0` so pausing it is meaningless anyway |
| ORBIT moment | One postcard photo, no story | Supporting photos ARE rendered but sit UNDERNEATH the hero: their scatter offsets are transform percentages of their OWN width (`x: "-15%"` of a 190px photo ≈ 28px) while the hero is 82cqw/320px AND top of the z stack (`zIndex: 10 - index`). They are fully covered. (`02-moments.tsx:48-60,196`) |
| Moments setup | A lone red rectangle above the line | The "tape swatch" placeholder (`02-moments.tsx:341-346`) — reads as a broken image, not a tease |
| The overture | "the 2025 is jammed" | Two compounding causes: (a) the two numerals travel on a 3.4s LINEAR path with a 1.4s offset — between "25" mostly exiting and "26" mostly entering there is a beat where the frame holds two cropped static-looking glyphs and dead center; linear easing at billboard scale reads frozen mid-path. (b) On devices where `useGlQuality()` returns `"off"`, shader story 10 (the warp field) has NO static DOM fallback — the drive-through plays over flat ink, so the numerals are the only thing alive and their crawl reads as "jammed." (`01-the-year.tsx:93-110`, `gl/static-figure.tsx` has no warp figure) |

---

## 1. Two laws added to build5's nine

10. **No dead frames.** Freeze any scripted sequence at any random moment:
    something must be visibly mid-motion INSIDE the central 80% of the
    frame. If a screenshot could read as "stuck," the choreography is wrong
    — this is how the owner catches us, with screenshots. Continuous
    systems (belts, runners, dots) exist precisely to make every freeze
    frame alive.
11. **A word never breaks.** Per-letter and per-word animation must never
    change where lines wrap. Words wrap as words, headlines balance
    (`text-wrap: balance`), and any animated-type primitive that can't
    guarantee this doesn't ship.

---

## 2. P0 defects — fix before anything new

### 2.1 Words wrap as words (`components/pop-letters.tsx`)

Restructure `PopLetters`: split `text` into words first; each word renders
as `<span className="inline-block whitespace-nowrap">` containing its
letter spans; between word-wrappers emit a PLAIN text-node space (`" "`) —
plain inline spaces are where the browser is allowed to break. Letter spans
keep their exact current animation (deterministic rotation, spring, stagger
— stagger index stays GLOBAL across the whole string, not per-word, so
timing is unchanged). Reduced-motion path unchanged.

Then the sweep: every `t-display`/`t-editorial` headline container gets
`style={{ textWrap: "balance" }}` — add it once to the `.t-display` and
`.t-editorial` classes in `globals.css` (`text-wrap: balance;` — supported
in every browser we target; harmless where lines are short). This is
Jadesola's "not aligned" and Ayo's "bunched up" fix in one move.

Verify: the group-chat setup line at 390px width breaks only at spaces;
screenshot before/after in the PR-style commit message is not needed — the
Playwright check is (`getComputedStyle` per-line via `Range` rects, or
simply a screenshot eyeballed).

### 2.2 The overture, unjammed (`components/stories/01-the-year.tsx`)

The drive-through's two lone numerals become a **numeral belt** — the
reference's billboard energy comes from the glyphs NEVER stopping and the
frame NEVER emptying:

- One absolutely-positioned row (`display: flex`, `gap: 0.18em`,
  `whiteSpace: nowrap`) containing the glyph sequence
  `25 · 26 · 25 · 26 · 25 · 26` (six glyph groups, dot separators at 40%
  opacity), each glyph `t-monument` `text-gdg-red`, the whole row rotated
  `-8deg`.
- The row is a marquee: animate `x: ["0%", "-50%"]`, `duration: 7`,
  `ease: "linear"`, `repeat: Infinity` — the belt content is two identical
  halves so the wrap is seamless (same trick as the existing `.marquee`).
  A belt at constant velocity is the ONE place linear easing is correct
  (law 10: the frame always has a glyph mid-center; there is no
  enter/exit beat to ease).
- Belt position: centered vertically at `top: 50%`, `translateY(-55%)`,
  spanning off-frame both sides. The pinned logomark stays exactly as is
  (`relative z-10`, the still anchor).
- The two overlay caption pills (`One chapter.` / `One unhinged year.`)
  keep their exact current timing and state machine.
- DRIVE_MS stays 3400; the calm-beat resolve, haptic, and reduced-motion
  behavior are untouched. The belt simply unmounts at the beat flip
  mid-motion — the cut to the calm beat is the brake, which is the point.
- **Warp-field fallback**: add `WarpFieldFigure` to
  `components/gl/static-figure.tsx` — static CSS approximation of shader
  story 10: layered `repeating-radial-gradient(circle at 50% 42%, ink 0
  26px, transparent 26px 52px)` over a checker
  (`repeating-conic-gradient(ink 0 25%, cream 0 50%)` at `72px 72px`),
  cream base, `opacity: 0.5`, `-z-10 pointer-events-none`. `ColdOpen`
  renders it when `useGlQualityContext() === "off"` — the drive-through
  never again plays over flat ink.

### 2.3 Moments: every photo visible, the deal and the flick
(`components/stories/02-moments.tsx`)

The scatter rebuild — positions become CONTAINER-relative so photos
actually spread:

- Replace `GET_PHOTO_STYLE`'s transform-percentage offsets with absolute
  positions in container units: each slot defines `left`/`top` as
  percentages OF THE STAGE (e.g. hero `left: 50%, top: 42%` with
  `translate(-50%,-50%)`; supports at `left: 22%/78%/50%`,
  `top: 62%/58%/20%`) plus its rotation. Exact slots:
  - 0 hero: `left 50% / top 42%`, `r -4`, `w 74cqw max 300`
  - 1: `left 24% / top 64%`, `r -12`, `w 46cqw max 170`
  - 2: `left 78% / top 60%`, `r 15`, `w 42cqw max 155`
  - 3: `left 70% / top 18%`, `r 8`, `w 38cqw max 140`
- **Stack order tells the story**: the hero enters FIRST and sits at
  `z 1`; supports land ON TOP of its edges (`z 2,3,4`), each overlapping
  the hero's corner by design — a pile, not an eclipse. (Inverting the
  current `10 - index`.)
- **The deal**: photos enter 260ms apart (up from 150ms) on `SPRING.photo`
  from their current off-frame vectors — the pile assembling is the
  screen's motion for the first ~1.2s.
- **The flick**: at `SCENE_MS - 1400` the TOP support photo (highest z)
  flicks away — `x: +140%, rotate: +30, opacity: 0` on
  `{ type: "spring", stiffness: 180, damping: 20 }` with `vibrate(6)` —
  revealing what it covered (build.md §5.2's original scrapbook beat,
  finally real). One flick per scene, always the last-dealt photo.
- Scene count: with the full photo drop (owner checklist §9) each scene
  should carry 4 photos; today's 2-3 photo scenes still work — slots
  simply go unfilled from the end, and the flick needs ≥3 photos (skip
  it below that).
- **Setup tease**: replace the lone red swatch with a real object — the
  first ORBIT photo at `w-24`, rotated -6°, in the polaroid frame, tape
  strip on top, at 90% opacity, entering with the existing swatch's
  timing. The red tape strip moves ON TOP of the polaroid (its current
  size/rotation), so the beat reads "a photo being taped down," not "a
  missing image."
- The caption/typewriter, wipe, and scene scheduling are untouched.

### 2.4 The paused chip stops photobombing (`player.tsx`)

- Never render the PAUSED toast on `summary` (`revealMs: 0` — there is no
  timer to pause; the toast is pure noise there).
- Everywhere else it moves `bottom-20 → bottom-28` (clear of story-content
  CTAs, which all live within the bottom 24) and gains
  `pointer-events-none`.

### 2.5 Corner chrome legibility (minor)

The ⊞ grid button sat unreadable on the group-chat top stripe band in the
owner's screenshot. Give the corner-chrome row a soft scrim:
`background: radial-gradient(closest-side, rgb(15 15 15 / 0.35), transparent)`
on ink fields (cream equivalent on cream fields), `border-radius: 9999px`,
`padding: 2px 6px`. Chrome stays whisper-quiet (law 8) but never invisible
against its own ambient layer.

---

## 3. The chapter grid becomes a poster wall

Jadesola: "different colors for the cards … not looking exciting." The grid
is chrome, not a story — build.md's one-accent-per-story law does NOT bind
it. Each card becomes a mini poster (`chapter-grid.tsx`):

- Card background: keep the field color, but add the story's accent as a
  bold mini-figure filling the card's upper ~55%, pure CSS, no JS anim
  (the grid is a menu; it must open instantly):
  - `the-year` — diagonal stripe band (repeating-linear-gradient 45°,
    cream/transparent 8px bars) across the middle, blue tint block behind
  - `moments` — a tiny rotated paper rectangle (paper bg, 2px shadow) with
    a red tape strip across its corner
  - `built` — three stacked mini redacted bars (cream, widths 70/50/60%),
    the middle one blue
  - `people` — three overlapping 16px circles (yellow, cream, ink outline)
  - `group-chat` — a green chat bubble rectangle + two small cream ones
  - `your-events` — the ticket outline (1.5px cream border, rounded, one
    dashed vertical) tinted blue
  - `standing` — a red dashed circle + "%" glyph in t-label
  - `your-chapter` — a green horizontal line with 3 dots and a flag tick
  - `your-club` — a 5/7 mini card with the four-color foil corner
    (conic-gradient blue/red/yellow/green at 30% opacity)
  - `whats-next` — a green arrow (→) rotated -45°, t-display size
  - `summary` — a mini barcode (5 vertical cream bars, varied widths)
- Seen state: instead of opacity, seen cards get a small accent check
  chip (`✓` in a 16px accent circle, top-right); UNSEEN cards are full
  opacity too (the dimming read as "broken," not "unwatched").
- Card entrance: stagger `scale 0.96→1, opacity 0→1`, 40ms apart, 200ms —
  the one JS animation allowed here.

---

## 4. Chrome that gets out of the way + the first-run hint

### 4.1 The rail actually hides

Owner: "the bar should not always be visible tho." Overrides build5 §2.2's
dim-never-vanish: idle (same `IDLE_MS 1800`) now fades the rail AND corner
chrome to **opacity 0** over 400ms; any pointer/key activity or a
story/phase transition wakes them to the same awake opacities (0.8 / 0.6)
for the next 1800ms. Two exceptions, unchanged in spirit from build5:
reduced-motion keeps everything at awake opacity permanently
(discoverability), and `forceVisible` (paused / grid open) pins awake.

### 4.2 The gesture hint

Reference behavior: the real Wrapped shows a subtle indicator so people
know they CAN act even though it auto-advances.

- New `components/story-engine/gesture-hint.tsx`: a centered column at
  `bottom-24`, `z-20`, `pointer-events-none`: a 28px cream chevron-up over
  the `t-label` line **"TAP → NEXT · HOLD TO PAUSE"** at `text-[0.55rem]
  opacity-70`, on the §2.5 scrim pill.
- The chevron loops `y: [0, -6, 0]` over 1.6s, `ease: "easeInOut"`,
  `repeat: Infinity`.
- Shows ONCE per session: mounts when story 0 enters its reveal phase,
  lives 4s, exits `opacity → 0` (400ms), sets
  `sessionStorage["wrapped-hinted"] = "1"`; never mounts if that key
  exists (same storage pattern as `wrapped-seen`). Reduced motion: static
  chevron, same 4s life.

---

## 5. Sound — the cards make noise now

Jadesola and Ayo both led with sound. Two layers, one rule: **sound is
seasoning — opt-out, never load-bearing, and the experience is complete in
silence.**

### 5.1 The SFX engine (`lib/sfx.ts`, NEW)

Synthesized WebAudio — zero asset files, ~90 lines. One shared
`AudioContext`, created lazily on the SAME first-gesture unlock that
`startAudio()` already hooks (extend that listener to also call
`initSfx()`). Every call no-ops when `isMuted()` (the existing mute is the
one switch — no second toggle) or before unlock.

| `playSfx(name)` | Synthesis (exact params) | Fires from |
|---|---|---|
| `whoosh` | white-noise buffer 180ms through a bandpass sweeping 800→250Hz, gain 0.10 → 0 exp | the camera whip — `player.tsx` on story-index change |
| `tick` | square osc 1900Hz, 18ms, gain 0.05 → 0 exp | beat/moment changes inside multi-beat stories (group-chat moment advance, moments scene wipe, credits chapter flip) |
| `thud` | sine osc 120→60Hz over 90ms, gain 0.22 → 0 exp | every `SlamStat` mount (call inside the existing `fired`-ref effect, beside `vibrate(10)`) |
| `shimmer` | two triangle oscs 880+1320Hz, 350ms, gain 0.06, 6Hz tremolo via gain LFO | the club card flip landing |
| `blip-up` / `blip-down` | sine 520→780Hz / 520→260Hz, 120ms, gain 0.08 | guess game right / wrong |

Rate-limit: a global 80ms cooldown per name (rapid taps must not machine-gun
the whoosh). `vibrate()` stays independent — haptics are not sound.

### 5.2 Music

The one-bed system from build2 §12 already exists end-to-end (`lib/audio.ts`
— loop, mute persistence, graceful absence). What's missing is the FILE:
the owner drops a licensed ~1-2MB mp3 at `public/audio/wrapped-loop.mp3`
(§9 checklist) and the whole feature lights up with zero code. Ayo's
"previews?" is parked (§11) — per-story music previews are a licensing
question, not a build question.

---

## 6. The topics engine — the group chat, actually audited

Owner: "no topics? this is a young people group chat." Correct — build5
counted VOLUME (who, when, how much) and never touched WHAT. The full
export set is being uploaded in queued batches of 5 files. Same privacy
discipline as ever: message content is read ONLY inside the pipeline on
the operator's machine; what ships is aggregate numbers and curated
strings. Raw exports stay gitignored in `data/exports/`.

### 6.1 Merging the queued exports (`scripts/pipeline/merge-exports.ts`, NEW)

WhatsApp truncates exports (~40k messages), so the full history arrives as
MULTIPLE overlapping .txt files per chat. Merge before analysis:

- Group files by chat: filename prefix before the first `__` or the
  WhatsApp default `WhatsApp Chat with <name>` — plus an explicit
  `data/exports/manifest.json` escape hatch (`{ "<file>": "<chat-id>" }`)
  for files the heuristic misses. Chat ids: `main`, `software`, `data`,
  `design`, `infrastructure`, or any new subgroup name.
- Parse each file with the EXISTING `parseLine` dialects, then dedupe on
  the key `(minute-resolution timestamp, senderKey, first 40 chars of
  body)` — exports of overlapping windows produce byte-identical lines;
  minute resolution absorbs the second-precision difference between iOS
  and Android dialects.
- Emit per-chat merged message streams; log per-chat
  `files/raw/deduped/kept` counts. The `monthsMissing` disclaimers in
  copy (`GROUP_CHAT.monthsMissing`) get recomputed from the merged
  stream's actual coverage — if the gap closes, the "and that's with N
  months missing" detail line auto-drops (null-skip, §15 rule).

### 6.2 What gets computed (`scripts/pipeline/topics.ts`, NEW)

All whole-word, case-insensitive, media/deleted lines excluded (reuse
`cleanBody` / classification from `group-stats.ts`):

1. **Words of the year** — token frequency, tokens ≥3 chars, minus a
   stopword list (standard English + chat noise: `dont, thats, like, just,
   good, know, want, need, time, going, still, make, then, well, also,
   really, right, guys, please, okay, yeah, will, thanks, media, omitted`)
   minus all roster first/last names (from `PEOPLE` + top-yapper display
   names — nobody's name is a "word"). Top 15 with counts.
2. **Emoji leaderboard** — every extended-pictographic cluster counted;
   top 8 with counts (build5 counted only the three laugh emoji).
3. **Topic buckets** — curated whole-word sets, counted per bucket:
   - EXAMS & SCHOOL: exam, exams, test, cbt, gst, course, carryover,
     lecture, assignment, project, defense, result, gpa, cgpa
   - MONEY: money, broke, pay, paid, transfer, account, urgent 2k, funds,
     naira, dollar, price
   - FOOD: food, rice, chicken, shawarma, cafeteria, cafe, hungry, eat,
     chow
   - FOOTBALL: match, goal, arsenal, chelsea, barca, madrid, united, city,
     ucl, penalty
   - LOVE & VAL: valentine, val, crush, date, relationship, single,
     talking stage
   - TECH: code, coding, bug, deploy, figma, react, python, api, laptop,
     backend, frontend, ai, gpt
   - EVENTS: orbit, devfest, meetup, allstars, hackathon, game night
   - SPIRITUAL: church, chapel, pastor, prayer, fast, vespers
   Report all bucket counts; the story shows the top 4-5. (Owner may
   re-curate any list before freeze — they're data, in
   `topics.ts` as exported consts.)
4. **Name-drops** — `@`-mention counts per mentioned display name, top 5.
5. **Links** — URL count total + top domains (youtube, tiktok, x/twitter,
   instagram, whatsapp invite, other).
6. **Questions** — count of messages ending `?`; **the shouter** — most
   ALL-CAPS messages (≥8 chars, ≥90% caps) by sender; **longest message**
   (char count + sender, content NOT shipped).
7. **Conversation starters** — first message after ≥6h of silence: count
   per sender, top 3 — "who restarts the chat."
8. Everything lands in a new `GROUP_TOPICS` const printed by `report.ts`
   in paste-ready form (same flow as `GROUP_CHAT`), typed in
   `lib/content/chapter.ts`, every field nullable and null-skipped.

### 6.3 New story beats (`components/stories/11-group-chat.tsx`)

Insert after the existing `dialect` beat, before `streak` (cadence: each
new beat ~2600ms; bump the registry `revealMs` by the same total and
re-verify the §10.0 80% rule in the commit that lands them):

- **"So what was it about?"** — topic bars: top 4 buckets as redacted-bar
  rows (existing `BarRow`), counts tabular; headline `PopLetters`.
- **The vocabulary** — top 6 words of the year as sticker chips scattered
  at deterministic rotations (-6°..+6°), stamping in 120ms apart
  (`SPRING.stamp`), each with its count in `t-label` beneath.
- **The emoji podium** — top 3 emoji at `t-display` scale on three
  stepped platforms (2nd/1st/3rd), slamming in ascending order, counts
  beneath; remaining 5 in a quiet row below.
- **"Who restarts the chat"** — top 3 conversation starters, `BarRow`
  treatment, sub-line `copy.groupChat.startersSub` = "Silence never stood
  a chance."
- Subgroup beat: with the track exports merged, `topSubgroup` fills for
  real (build5 §5.2's null-skip finally un-skips) — plus one line naming
  ALL tracks' message counts in a compact 4-row bar list.

New copy keys in `lib/copy.ts` (`groupChat.topicsTitle: "So what was it
about?"`, `vocabTitle: "Certified chapter vocabulary."`, `emojiTitle: "The
emoji of the year."`, `startersTitle: "Who restarts the chat."`,
`startersSub` above). Register the new beats in the story's moment list;
guests see everything (public story).

### 6.4 Operator flow for the queued uploads

As each batch of 5 lands: move files into `data/exports/`, run
`npm run pipeline -- --group-stats` (extend the existing flag to run
merge → group-stats → topics), eyeball the report, paste the reprinted
`GROUP_CHAT` + `GROUP_TOPICS` blocks into `lib/content/chapter.ts`.
Display names stay TBD-review (owner may remap before freeze — build5 §8
rule stands).

---

## 7. Magic links — make it send, and prove it

### 7.1 What happened

Owner set the Vercel env vars, applied the migration, requested links for
BOTH a non-member and a member address: both showed "check your inbox,"
neither email arrived. Two design facts first (working as intended, keep):
the API answers identically for any address (anti-enumeration, build.md
§4) — and it genuinely SENDS to any address; membership is only evaluated
at verify time (non-members get a guest session). So "wrong email said
sent" is correct behavior — "nothing ever arrives for anyone" is the bug.

### 7.2 Ranked causes (and what's already done)

1. **`RESEND_API_KEY` absent at runtime** ← most likely. The dev fallback
   in `lib/email.ts` logs the link to console and returns success when the
   key is unset — in production that means "check your inbox" + no email +
   a `[wrapped] dev magic link for …` line sitting in the Vercel function
   logs. Env vars added in the dashboard DO NOT apply to existing
   deployments — a redeploy is required — and vars are per-environment
   (Production ≠ Preview).
2. **Resend rejects the send** — unverified `gdgbabcock.com` domain or a
   disallowed `EMAIL_FROM`. Resend's SDK RESOLVES with `{ error }` instead
   of throwing; the old code discarded the result, so this failed 100%
   silently. **Already fixed** (commit `681869d`): both the API-level
   error and thrown exceptions now log as `[wrapped] Resend send
   failed/threw: …`.
3. **`NEXT_PUBLIC_SITE_URL` wrong** — emails send but the link inside
   points at the wrong origin.

### 7.3 Code hardening (this pass)

1. `lib/email.ts`: the no-key fallback becomes environment-aware — if
   `process.env.VERCEL` is set (any deployed environment), a missing
   `RESEND_API_KEY` now **throws** (`new Error("RESEND_API_KEY is not set
   in a deployed environment")`), which the request route already converts
   to a logged 500 `server_config`. Local dev keeps the console-link flow
   untouched.
2. Link origin: build the verify link from `NEXT_PUBLIC_SITE_URL` when
   set, else **the request's own origin** (pass `req.nextUrl.origin` from
   the route into `sendMagicLinkEmail`) — never the hardcoded production
   fallback, so preview deployments and domain changes can't mint links
   that point somewhere else.
3. **`GET /api/auth/health`** (NEW route, the runbook's first stop) —
   booleans only, never values:
   ```json
   {
     "session_secret": true,
     "resend_key": false,
     "database_url": true,
     "email_from": "wrapped@gdgbabcock.com",
     "site_url": "https://wrapped.gdgbabcock.com",
     "db_reachable": true
   }
   ```
   `db_reachable` = a `SELECT 1` with a 2s cap. `email_from`/`site_url`
   are configuration, not secrets — showing them catches typos. No auth on
   the route (it leaks nothing exploitable), `dynamic = "force-dynamic"`.

### 7.4 The runbook (do these in order, stop at the first failure)

1. Open `https://<deployment>/api/auth/health`. Any `false` → fix that
   var in Vercel → Settings → Environment Variables → confirm the
   **Production** column specifically → **Redeploy** (Deployments → ⋯ →
   Redeploy) → re-check health.
2. Request a link with your own email. Open Vercel → the deployment →
   Functions/Logs, filter `wrapped`:
   - `dev magic link for …` → the key still isn't reaching runtime (wrong
     environment or no redeploy — step 1 lied to you; re-check).
   - `Resend send failed: …` → read the error. `domain is not verified` →
     Resend dashboard → Domains → verify `gdgbabcock.com` (DNS records) or
     switch `EMAIL_FROM` to Resend's onboarding sender
     (`onboarding@resend.dev`) as a temporary unblock. `API key is
     invalid` → re-issue the key.
   - No log line at all → the request 500'd or was rate-limited (3/email/
     hour — a burst of tests hits this fast; wait the hour or use a
     different address).
3. Resend dashboard → Logs: confirm the send shows as Delivered (not
   Bounced/Suppressed). Check spam folder — a fresh domain without DMARC
   lands in spam routinely; add the DMARC record Resend suggests.
4. Email arrives → click → confirm the link's origin matches the deployed
   site → you land on `/wrapped` with `wrapped_session` set (member: full
   run; unknown email: guest run). Done.

### 7.5 Verification for the code changes

Local: unset key + `VERCEL=1 npm run build && VERCEL=1 npm start` → request
returns 500 `server_config`; without `VERCEL` → console link flow intact.
Health endpoint returns correct booleans for present/absent vars. Vitest:
none needed (route glue), but the link-origin derivation gets a unit test
if extracted as a pure helper.

---

## 8. The fluidity audit — "wonky" hunted screen by screen

One pass, on a real phone (LTE, not simulator), production build, after
§2 lands. For each story, freeze-frame three random moments (law 10) and
check against this list; file each violation as its own small fix inside
the audit commit:

1. No hero element ever moves on a LINEAR ease except belts/runners/
   marquees (constant-velocity systems). Everything else rides a spring or
   the `[0.83, 0, 0.17, 1]` snap.
2. No `AnimatePresence mode="wait"` gap may exceed 240ms of empty frame
   (measure: the moments scene wipe, credits chapter swap, group-chat
   moment swap).
3. Nothing owns the same transform channel twice (IdleFloat wrapping a
   spring-animated child is fine — same channel on the SAME element is
   not).
4. Every setup→reveal crossfade overlaps (the incoming screen must be
   visible before the outgoing hits opacity 0).
5. Stagger caps: no list stagger where the LAST item starts later than
   1.2s (credits grids are the known offender — cap `delay` at 1.2s).
6. The three-beat payoff timings (0 / 1100 / 2200ms) hold on-device, not
   just in spec.
7. Shader/ambient layer visibly alive in every hold (if `quality` reads
   `"off"` on the test phone, the static figures must be present — §2.2's
   warp fallback closes the last gap).

Fixes discovered by the audit that exceed a one-liner get logged in the
commit body — not silently absorbed.

---

## 9. Owner checklist (nothing here blocks the build)

- **Photos**: 4 per moments scene is the new target — ORBIT has 3, needs
  1+ more; DevFest 2; Games 2; Spaces 1. Drop into
  `public/moments/<id>/NN.jpg`, ≤400KB each.
- **Music**: one licensed/royalty-free loopable mp3 →
  `public/audio/wrapped-loop.mp3`. Sound effects need nothing (synthesized).
- **WhatsApp exports**: keep the 5-file batches coming; anything ambiguous
  goes in `data/exports/manifest.json`.
- **Topic lists** (§6.2.3): skim and re-curate before freeze — you know
  the chat's actual slang; the lists are plain consts.
- **Display names**: the report reprints every name it will show —
  remap/veto before freeze.
- Still open from build4/5: sponsor logos (ORBIT repo), club-name
  `answerIndex` confirm, product TBD stats.

---

## 10. Sequencing — one commit per step

1. `fix(type): words wrap as words — pop-letters word grouping + balanced headlines` — §2.1
2. `fix(stories): the overture belt — continuous numerals and a warp-field fallback` — §2.2
3. `fix(stories): moments scatter — every photo visible, the deal and the flick` — §2.3
4. `fix(engine): paused chip placement and summary suppression` — §2.4 + §2.5
5. `feat(engine): vanishing chrome and the first-run gesture hint` — §4
6. `feat(grid): the poster wall` — §3
7. `feat(audio): the sfx engine` — §5.1
8. `feat(pipeline): export merge + the topics engine` — §6.1-§6.2 (+ vitest
   for merge dedupe and each analyzer on synthetic fixtures)
9. `feat(stories): the group chat talks back — topics, vocabulary, emoji, starters` — §6.3 (registry bump + 80%-rule recheck in the same commit)
10. `fix(auth): prod guard, request-origin links, health endpoint` — §7.3
11. `chore(motion): the fluidity audit` — §8 (whatever it catches)

Gates: `tsc` / `eslint` / `vitest` / production build per commit (the
established bar). After 4, 9, and 11: the on-device pass — and the §8
freeze-frame test is now part of every future visual verification.

## 11. What this pass deliberately does not do

- **No per-story music previews** (Ayo's "previews?") — one licensed bed
  is the build2 §12 rule; per-story audio is a licensing/asset question
  for the owner, parked.
- **No message quotes on screen** — topics ship as counts and curated
  bucket names only; no member's actual sentence ever renders. The
  privacy line (content never leaves the pipeline) does not move.
- **No new personal snapshot fields** — everything in §6 is chapter-level
  public data; the DB write path is untouched.
- **No redesign of stories the owner didn't flag** — standing, your-club,
  your-chapter, credits keep their build4/5 choreography; they get the §8
  audit only.
