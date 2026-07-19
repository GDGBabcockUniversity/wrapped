# build7 — "rival Rive": the motion, cadence & richness pass

On-device review (2026-07-19, LTE, ~15% battery — so the low-power static
figures were live, which matters). The owner's bar moved from "not boring"
to "our motion should rival something Rive outputs." This pass is about
craft: nothing half-rendered, nothing stacked into mush, nothing that
blitzes, and galleries that feel like designed spreads, not shuffled minis.

Screenshots in evidence: the "262" overture (everything mixed), "What a
year." (fine), ORBIT "547 / 252 checked in", the chapter-grid poster wall.

---

## 0. Verbatim, mapped

| # | Owner said | Root cause | Section |
|---|---|---|---|
| 1 | "the texts are half … render like they're being cut" | beats advance while `PopLetters` is still entering (45ms/letter); some titles never finish before the swap | §1 |
| 2 | "the sfx engine is severely subpar" | raw single-oscillator blips, no body, no space | §5 |
| 3 | "the start 26 25 feels like a weird fever dream cos everything is just mixed" | overture stacks the (loud, static) warp field + belt + cold-open overlay + logo in the same dead-center, all at once | §2 |
| 4 | "don't need to mention the 212 checked in" | `orbit.tickets.detail = "252 checked in"` | §3.1 |
| 5 | "tf is pts?" | topics word-list still surfaces junk tokens (`pts`, `don`) — a stronger noise filter is needed, and the beat should show only clean, real words | §3.2 |
| 6 | "orbit gallery is going to be more than 4 pictures … the mini 4 shuffling cards, heavily disapprove … same with devfest, 2-3 pages with stylised card frames" | Moments packs each event into ONE 4-photo scatter; ORBIT and DevFest each deserve a multi-page stylised spread | §4 |
| 7 | "the copy for devfest, wdym not ours … largest developer gathering on the continent, of course we had to show up … look as impressive as possible" | `DEVFEST.caption = "Not ours. We showed up anyway."` | §3.3 |
| 8 | "the whatsapp stats they just blitz through, ive told you to calm down … this is a journey" | group-chat beat holds too short, sub-elements land too fast | §6 |
| 9 | "i should really add music but i need the length and the bpm per story" | — | §7 (delivered as a shared artifact + here) |
| 10 | "our motion should rival something Rive outputs" | easing/choreography polish across the board | §8 |

---

## 1. Nothing renders half (P0 — law 11 extended)

The reveal animation must never be cut off by the beat swap. Two rules:

1. **Every text beat holds at least its own entrance time + a read floor.**
   Define, per beat: `entranceMs = charCount × staggerMs` (45 default / 24
   fast) `+ 350` settle. The beat's hold `ms` must be `≥ entranceMs + READ_FLOOR`
   where `READ_FLOOR = 1400`. Any scheduled beat shorter than that is
   raised in the same commit. This kills "half text" structurally — a
   title physically cannot swap before it finishes drawing.
2. **`PopLetters` gets a `speed` clamp for long strings.** For strings
   over 18 chars, `staggerMs` scales down so no headline takes more than
   900ms to fully enter (`effectiveStagger = min(stagger, 900 / charCount)`).
   Long titles stop feeling like a typewriter that outruns its own beat.
3. Audit every `overflow-hidden` ancestor of a `PopLetters`/`SlamStat` for
   vertical clip of the `y:14→0` entrance and of descenders — add
   `pb`/`leading` where a glyph tail is shaved. Verify with a mid-entrance
   screenshot per story, not just the settled frame.

---

## 2. The overture stops being a fever dream (`01-the-year.tsx`)

The opening must read as ONE clear idea at a time, with depth — not four
layers fighting for the center. Rebuild the drive beat as a **sequenced,
staged** cold open:

- **Stage the layers in Z and in TIME, never all-at-once:**
  - The warp field is *background*, and it is CALM: the static
    `WarpFieldFigure` drops to ~18% opacity behind a `bg-ink/40` scrim so
    it reads as texture, not a target (§2.1). The live shader field keeps
    its existing low intensity.
  - The belt travels in its own horizontal band (upper third), NOT through
    the logo/overlay. Numerals ride a lane, the logo owns the center, the
    cold-open line owns the lower third. Three lanes, no overlap.
- **Sequence:** field settles (0–400ms) → logo stamps center (300ms) →
  belt begins its travel in the upper lane (from 600ms) → cold-open line 1
  lower third (900ms, holds, fades) → line 2 (holds, fades) → hand to the
  CalmBeat. Each element has the stage to itself for a moment before the
  next joins.
- **The belt is quieter:** monument scale drops to `clamp(3rem, 22cqw,
  7rem)` (it was full `t-monument`, which is why "26" + a sliver of the
  next "2" filled the whole width and read as "262"). Smaller glyphs =
  several visible at once = obviously a *belt*, not a giant broken number.
- Reduced-motion / instant path unchanged in spirit (no belt, static line).

## 2.1 The static figures calm down globally

The owner was on the low-power path, so `static-figure.tsx` is what they
actually saw. Every static figure (`WarpFieldFigure`, `StripeCircleFigure`,
`StripeBandFigure`, `QuarterRingsFigure`) drops to a texture role: cap
opacity ≤ 0.22 and sit behind a field-appropriate scrim. A still figure
must whisper the shader's geometry (law 1's fallback), never shout.

---

## 3. Copy & content truth

### 3.1 Drop the check-in detail
`PRODUCT_SAGA.orbit.tickets.detail` → removed (null). The beat shows
`547 / TICKETS ISSUED`, full stop. (The 252 number survives in the data if
ever needed, just not on screen.)

### 3.2 The vocabulary shows real words only
Topics word-list adds a hard junk filter: drop tokens that are (a) < 4
chars unless whitelisted slang (`sha`, `dey`, `omo`, `abeg`, `una`), (b)
pure-consonant / no-vowel fragments (`pts`, `pvt`), (c) numeric-ish. Re-run
the operator script and paste a clean `GROUP_TOPICS.wordsOfYear` — the beat
must read as *chapter vocabulary a human would recognise*, not log exhaust.
The owner curates the final list before freeze (build6 §9 rule stands).

### 3.3 DevFest copy — pride, not disclaimer
`MOMENTS[1]` (DevFest): caption → **"DevFest. The continent's biggest. We
showed up in force."** Drop the "not ours" framing everywhere. It's the
largest developer gathering in Africa; showing up IS the flex. Kill the
old code comment that enforced the disclaimer.

---

## 4. Moments becomes designed spreads, not 4-card shuffles (`02-moments.tsx`)

The single-scatter-per-event model dies. ORBIT and DevFest each become a
**multi-page stylised spread**; every page is a composed frame, not a pile.

- **Frame system** (`components/moments/frame.tsx`, NEW): a small set of
  stylised photo frames — `polaroid` (paper border + caption lip),
  `filmstrip` (sprocket-hole edges, 2–3 photos in a strip), `postcard`
  (stamp corner + postmark), `ticket` (perforated stub). Each frame is a
  pure-CSS chrome around a `next/image`, with graceful initials/placeholder
  fallback (same onError pattern as the credits tiles).
- **ORBIT = 3 pages** (it's the flagship, a full arc): page 1 a hero
  polaroid + title; page 2 a filmstrip of 3; page 3 a postcard "547
  tickets" beat with 2 supporting frames. Scales to however many photos
  land — pages fill from `MOMENTS[0].images`, and each page uses
  placeholders only if a slot has no photo (never a broken frame).
- **DevFest = 2 pages**: a bold hero frame ("continent's biggest") + a
  filmstrip. Impressive, framed, proud.
- Games/Spaces stays one composed page each (fewer photos, that's honest).
- **Cadence:** each page holds ~3800ms with an internal deal/settle, then a
  page turn (a real page-turn or a card-slide, not the red wipe every
  time — vary the transition so it feels authored). Recompute `moments`
  `revealMs` for the new page count (§8 verify the 80% rule).
- **Owner supplies more ORBIT/DevFest photos** → drop into
  `public/moments/orbit|devfest/` as `NN.jpg`; the spread auto-expands.
  Until then the frames render the photos that exist + tasteful
  placeholders, never blank.

---

## 5. The SFX engine, rebuilt (`lib/sfx.ts`)

"Severely subpar" is fair — single naked oscillators with an exp decay are
thin and clicky. Rebuild each cue with body and space:

- **Master chain:** one shared `AudioContext` → a master gain (0.5) → a
  gentle `DynamicsCompressor` → a short convolver (algorithmic room
  impulse, ~180ms) mixed low, so cues sit in a space instead of on the
  glass. Every voice also has a 3–5ms attack ramp (no clicks) and a
  slightly longer release.
- **Voices, remade:**
  - `whoosh` — filtered noise **plus** a downward pitch-swept sine sub, the
    two crossfaded; band-pass 1200→300 with a resonance bump. Reads as air
    moving, not static.
  - `tick` — a short FM click (car mod) + a tiny pitched body, ~2400Hz, very
    short; crisp, not buzzy.
  - `thud` — a sine sub 140→48 with a click transient layered on the attack;
    a real "landing," with weight.
  - `shimmer` — 3 detuned partials (root/oct/oct+fifth) with a slow filter
    open and the convolver tail; a genuine sparkle, not a beep.
  - `blip-up` / `blip-down` — triangle+sine stack with a pitch glide and a
    soft attack; a UI note, not a square buzz.
- Keep: lazy unlock on first gesture, `isMuted()` gate, 80ms per-name
  cooldown, reduced-motion independence.
- **Verify:** offline-render each voice via `OfflineAudioContext`, assert a
  clean attack (no sample-0 discontinuity → no click) and a non-trivial
  spectral spread (not a single partial). Ship a `scripts/sfx-preview`
  route only under `ALLOW_DEBUG` if useful.

---

## 6. The group chat takes its time (`11-group-chat.tsx`)

"Calm down, this is a journey." Two moves:

1. **Longer holds:** every beat re-timed to the §1 floor with air on top —
   stat beats ~4000ms, list/podium/vocab beats ~4400ms, the busiest-day
   and streak "moment" beats ~4200ms. Bump `revealMs` to match and
   re-verify the 80% rule.
2. **Slower reveal WITHIN each beat:** sub-elements (label, detail, bars)
   stagger with more space (label +0.5s, detail +0.9s), and bar rows land
   one at a time at ~140ms apart instead of 90ms — you watch each fact
   arrive. The beat breathes before it swaps.
3. Consider trimming to fewer, richer beats rather than many quick ones if
   the total runs long — quality of hold over quantity of stat.

---

## 7. Music brief — length + BPM per story (delivered as an artifact)

Full table shipped as a shared artifact (styled, hand-to-your-composer
ready). Durations are the build7 **targets** (post-retiming), accurate to
±1–2s; exact final ms confirmed after §1/§4/§6 land. Design intent: each
story owns its tempo and hits its downbeat on the ~0.47s camera whip
between stories, so cues don't need to beat-match — a short riser/lift into
each new story reads as authored. Summary is an open loop (user-paced).

---

## 8. The Rive-grade motion pass

The through-line of every section: motion that looks *designed*, not
defaulted.

- No entrance without a considered exit (paired in/out on every swapped
  element).
- Overlap on every transition (no `mode="wait"` dead frames — build6 §8
  extended to the new moments page turns).
- Spring character tuned per role: heavy settle for slams, light snap for
  chips, slow drift for holds — never one default spring everywhere.
- Secondary motion: when the hero lands, something secondary is still
  easing (a frame settling, a shadow catching up) — depth, not a freeze.
- Freeze-frame test at 5 random ticks per story on a real production build;
  every frame must read as mid-considered-motion.

---

## 9. Sequencing — one commit per step (same gate: tsc/eslint/vitest/build + on-device verify)

1. `fix(type): no beat renders half — entrance-aware holds + long-string clamp` — §1
2. `fix(stories): the overture, staged — three lanes, calm field` — §2 + §2.1
3. `fix(content): tickets truth, clean vocabulary, DevFest pride` — §3
4. `feat(moments): stylised multi-page spreads — the frame system` — §4
5. `feat(audio): the sfx engine, with body and space` — §5
6. `fix(stories): the group chat breathes` — §6
7. `chore(motion): the Rive-grade polish pass` — §8

(§7 music brief ships now, alongside this doc — it's reference, not code.)

## 10. Needs from the owner (non-blocking except where noted)

- **More ORBIT + DevFest photos** for §4's spreads — drop into
  `public/moments/{orbit,devfest}/NN.jpg`. Frames scale to whatever lands;
  spreads ship with current photos + placeholders until then.
- Final call on the cleaned `wordsOfYear` list (§3.2) before copy freeze.
- The mixed music files → `public/audio/` once composed (the one-bed loader
  already exists; per-story cues would need a tiny registry, speced when
  the files exist).
