# GDG Wrapped — build4: the glory pass (Spotify Wrapped 2025 motion parity)

This document AMENDS `build.md`, `build2.md`, and `build3.md`. Everything in
those files stays in force — especially the prime directive:

> **DO NOT INVENT.** Every design token, animation value, copy line, formula,
> and threshold you need is specified. If something seems missing, re-read the
> spec; if it is genuinely missing, stop and ask — do not fill the gap with
> your own idea.

Where this file conflicts with earlier build docs, **this file wins**. It
fully replaces the earlier draft of build4 (which was written before the
reference had been studied properly).

---

## 0. The reference, actually studied

The owner supplied a 50-second screen recording of the real Spotify Wrapped
2025 flow. It was extracted at 3fps end-to-end (150 frames, full timeline
mapped) plus 10fps bursts at the three densest moments (the op-art intro,
the stat slam, the pick-game response). Everything below cites what those
frames actually show — not memory, not vibes.

Reference timeline (t = seconds into the clip):

| t | Screen | What is MOVING while it holds |
|---|---|---|
| 0–4 | Op-art overture: giant red "2025" numerals drive through the frame at billboard scale over a black/white checker×ring warp field; Spotify logo pinned center; thin scribbles whip across | Everything — numerals travel, the pattern itself warps continuously |
| 4–7 | "We're ready for you." / "Come on down." — calm cream beat, red numeral band cropped at bottom | One thin scribble arc; the numeral band |
| 7–13 | "You listened. We counted." — ink field | Quarter-circle concentric rings bottom-left; ONE ring band highlighted purple, and the highlight cycles outward through the rings; scribbles drift |
| 13–17 | "5,495" minutes stat | Number slams in ALONE (no count-up, a slice-settle) → caption fades in ~1.1s later → "Share this story" pill ~1s after that; diagonal-stripe band at bottom with a purple runner segment sliding through it the whole time |
| 18–25 | "Taste like yours can't be defined." → "Your top genres" list | Full-screen polka-dot field: individual dots coin-flip between black and red continuously (3D flip, color swaps mid-flip); list items are white-on-black redacted-style bars popping in one-by-one; the exit slides up with a slight rotation/shear |
| 25–30 | "Age is just a number." | An hourglass is DRAWN stroke-by-stroke (single-line contour, ~2s) above the headline; bottom half is a checker×ring warp field that keeps bending; sub-line lands after |
| 30–35 | "Your listening age: 22" → "You listened to 665 songs" | Green 22 slams in (same three-beat layering); vertical-stripe broken-circle figure with purple runner; flower-outline scribble draws itself |
| 35–40 | "Make your pick." — the guess game | Five outlined song rows; user taps a guess; INSTANTLY: the true #1 fills green, tilts ~4°, gets a check; the wrong pick gets a red outline + X; the HEADLINE ITSELF swaps to "Failure builds character."; the green row settles 4°→0° over ~0.7s |
| 40–47 | "Your top song" reveal → "Your top songs" list | Album art with newsprint/xerox collage texture, stripe fragments overlapping its corners; list rows with a white sticker-chip title label; purple runner in the stripe band |
| 47–50 | Playlist outro: "Your Top Songs 2025" card | Giant purple "2025" numerals overlap the white card's bottom edge; "Add to Your Library" CTA |

## 1. The seven laws (what actually makes it great)

Every spec in §2–§9 exists to enforce one of these. When implementing,
check each screen against this list — a screen that violates law 1 or 2 is
wrong even if it matches its own section's letter.

1. **Nothing is ever still — but only ONE thing moves.** Every screen has
   exactly one continuously-running ambient subsystem (a runner band,
   coin-flipping dots, a warping field, a drifting scribble). Never two.
   Content holds; the ONE ambient system breathes. That's why it reads
   alive instead of busy.
2. **The field is monochrome; the accent is what moves.** The black/white
   (our ink/cream) geometry is the static bones. The single accent color
   is almost always attached to the MOVING element — the purple runner,
   the red flip-in dots. Accent = motion. Our existing "one accent per
   story at <10% of frame" rule (build.md §3) is unchanged; this law says
   WHERE that accent lives: on the thing that moves.
3. **Payoffs land in three beats.** Stat alone → caption → share
   affordance, ~1.1s apart. Never all at once. And big stats SLAM — they
   arrive whole with a slice-settle, they do not count up. (Count-ups
   survive only where the metaphor earns them: our receipt rows print,
   a till prints incrementally. Monument numerals slam.)
4. **Hand line-work is a first-class layer.** Two kinds, both single-line
   contour style: ambient scribbles that drift and redraw continuously,
   and one SUBJECT doodle per designated screen that draws itself as the
   screen's illustration (their hourglass).
5. **The op-art warp is the brand.** Checker × concentric-ring geometry,
   monochrome, continuously bending — used at three scales: full-screen
   spectacle (the overture), partial edge figures (ambient), and the
   connective tissue between chapters.
6. **Type is physical.** Lists are redacted-style bars sized to their text.
   Labels are sticker chips slapped on at a slight angle. Chosen things
   tilt then settle. Screens exit with a slight shear/rotation, not a
   straight slide.
7. **The experience talks back.** The copy REACTS to what the visitor does
   — their headline literally swaps to "Failure builds character." when
   you guess wrong. One reactive beat like this is worth ten animations.

---

## 2. The living-background engine (law 1 + 2 + 5)

The single biggest gap between our build and the reference: our WebGL
ambient layer (`components/gl/shaders.ts`) is *subtle* — 5–16% opacity
mixes, texture-grade. The reference's ambient layer is *bold* — full-
contrast monochrome geometry covering 25–45% of the frame, with the accent
runner cycling through it. Same architecture, different conviction.

### 2.1 The three new shader figures

Rewrite three story branches in `FRAGMENT_SRC` (`components/gl/shaders.ts`).
All three share the runner helper — add above `main()`:

```glsl
// Accent runner: returns 1.0 on the stripe/ring whose index the runner is
// currently crossing. idx = which band this fragment is in; n = band count.
// The runner sweeps continuously (not stepped) and wraps with a 25% rest gap.
float runner(float idx, float n, float t) {
  float pos = mod(t * 2.2, n * 1.25);          // 2.2 bands/sec, wraps past the end
  return smoothstep(1.0, 0.0, abs(idx - pos)); // soft one-band-wide highlight
}
```

**Story 0 — THE YEAR (ink/blue): the diagonal stripe band.** Replaces the
current scanline+motes branch. A band of 45° stripes occupying the bottom
18% of the frame (and its mirror, top 8%, half opacity), cream stripes on
ink, with the blue runner sliding through:

```glsl
if (u_story == 0) {
  float band = smoothstep(0.19, 0.18, uv.y) + 0.5 * smoothstep(0.91, 0.92, uv.y);
  float sIdx = floor((p.x + p.y) * 22.0);
  float stripe = step(0.5, fract((p.x + p.y) * 11.0));
  vec3 stripeCol = mix(base, CREAM * 0.92, stripe * 0.85);
  stripeCol = mix(stripeCol, u_accent, stripe * runner(sIdx, 30.0, u_time) * 0.9);
  col = mix(col, stripeCol, band);
}
```

**Story 3 — PEOPLE (cream/yellow): the quarter-rings.** Replaces the
spotlight sweep. Concentric ring quarters anchored at the bottom-left
corner, ink rings on cream, covering roughly the bottom-left 40% of frame,
yellow runner cycling outward through the rings — the reference's "You
listened. We counted." figure exactly:

```glsl
if (u_story == 3) {
  vec2 c = vec2(-0.42, -0.95);                  // anchor: bottom-left, off-frame
  float r = length(p - c);
  float rIdx = floor(r * 14.0);
  float ring = step(0.5, fract(r * 7.0));
  float mask = smoothstep(1.15, 0.55, r);       // fade out past ~half the frame
  vec3 ringCol = mix(base, INK, ring * 0.88);
  ringCol = mix(ringCol, u_accent, ring * runner(rIdx, 16.0, u_time) * 0.95);
  col = mix(col, ringCol, mask);
}
```

**Story 2 — BUILT (ink/blue): the stripe circle.** Replaces the blueprint
grid. Vertical stripes clipped to a large circle bleeding off bottom-left
(the reference's "665 songs" figure), blue runner walking across the
stripes:

```glsl
if (u_story == 2) {
  vec2 c = vec2(-0.30, -0.75);
  float inCircle = smoothstep(0.68, 0.66, length(p - c));
  float sIdx = floor(uv.x * 16.0);
  float stripe = step(0.5, fract(uv.x * 8.0));
  vec3 sc = mix(base, CREAM * 0.92, stripe * 0.8);
  sc = mix(sc, u_accent, stripe * runner(sIdx, 22.0, u_time) * 0.9);
  col = mix(col, sc, inCircle);
}
```

Stories 4–9 keep their existing treatments (constellation, stamp rings,
aurora, club foil, embers, orbit dots) — they were already choreography-
correct; the three above were the texture-grade ones. Story 1 (Moments)
keeps its paper grain: its scrapbook photos ARE its motion; adding a bold
figure would break law 1's "only one thing moves."

### 2.2 The overture warp field (shader story 10)

A NEW branch, `u_story == 10`, used only by the cold open (§4): the full-
screen checker×ring warp — a checkerboard displaced radially by an
expanding wave, which is exactly what the reference's morphing intro field
is (checker cells bending around ring centers):

```glsl
if (u_story == 10) {
  vec2 c1 = vec2(0.0, 0.55 * sin(u_time * 0.21));
  float d1 = length(p - c1);
  // radial displacement wave: checker cells bend around the moving center
  vec2 warped = p + normalize(p - c1 + 1e-4) * 0.10 * sin(d1 * 18.0 - u_time * 1.6);
  float cx = step(0.5, fract(warped.x * 5.0));
  float cy = step(0.5, fract(warped.y * 5.0));
  float checker = abs(cx - cy);              // 1.0 on alternating cells
  float rings = step(0.5, fract(d1 * 9.0 - u_time * 0.35));
  float fig = mix(checker, rings, smoothstep(0.75, 0.2, d1)); // rings near center, checker out
  col = mix(CREAM * 0.96, INK, fig * 0.92);
}
```

Wiring: `player.tsx` currently passes `state.storyIndex` to `StoryFrame` →
`ShaderField`. Compute instead:

```ts
const shaderStory = state.storyIndex === 0 && state.phase === "setup" ? 10 : state.storyIndex;
```

and pass `shaderStory`. Nothing else in `ShaderField` changes — its
crossfade machinery already handles the story-value swap at reveal.

### 2.3 The DOM fallback rule

`useGlQuality()` returns `"off"` on low-memory/save-data/no-WebGL2 devices
and the canvas self-kills below 42fps — on those devices the figures
simply don't exist today, which was acceptable for texture but not for
law 1. Rule: every story whose shader figure is load-bearing gets a static
DOM stand-in — a plain CSS render of the same geometry (repeating
linear/radial gradients, no animation) at 60% opacity, rendered only when
quality is `"off"`. Expose quality from `StoryFrame` via context
(`GlQualityContext`), one new file `components/gl/quality-context.tsx`.
Static is fine: law 1 is aspirational on a device that can't afford it —
a still figure beats a missing one, and reduced-motion users get the same
static render.

## 3. The coin-flip dot field (law 1 + 2, DOM lane)

The reference's genre screens: a cream field with big polka dots in bands
at top and bottom, where individual dots continuously coin-flip (3D flip
around the X axis, color swapping at the 90° edge-on point) between black
and red. Constant, hypnotic, cheap.

New component `components/dot-field.tsx`:

- Props: `{ accent: string; edge: "top" | "bottom" | "both"; rows?: number }`
  (default 2 rows per edge).
- Renders rows of circles, diameter `11cqw` capped 44px, gap `4.5cqw`,
  offset alternate rows by half a diameter (the reference's grid is
  half-dropped).
- Each dot is a `motion.div` with `transformStyle: preserve-3d` flipping
  `rotateX: 0 → 180 → 360` on a loop; two absolutely-stacked faces
  (`backface-visibility: hidden`): ink face and accent face. The color
  swap at the edge-on moment comes free from backface culling.
- Deterministic stagger, no `Math.random` (SSR rule): dot i flips with
  `delay: ((i * 41) % 23) * 0.35s`, `duration: 0.9s`, `repeatDelay:
  ((i * 17) % 11) + 4s`. Net effect ≈ 2–4 dots mid-flip at any moment —
  matches the reference's density.
- Reduced motion / quality "off": static dots, ~1 in 5 pre-set to the
  accent face (deterministic: `i % 5 === 2`).

Placement (exactly two stories — law 1 forbids stacking it on stories
that already have a figure):

- **standing (cream/red)**: `edge="both"`, red. The dot bands frame the
  stamp. Mount in both setup and reveal phases.
- **whats-next (cream/green)**: `edge="bottom"`, green. Replaces the
  shader ember motes as the story's one ambient system (turn story 8's
  shader branch down to grain-only when this lands: delete the mote
  block, keep the fbm darkening).

## 4. The overture (law 5) — rebuild of the cold open

The current cold open (§11.4/§12.1 build2) is four hard-cut text lines.
The reference's intro is not text cuts — it is a continuous **numeral
drive-through**: billboard-scale numerals sweeping through the frame over
the warp field, logo pinned center as the still anchor, resolving into a
calm beat. Rebuild `ColdOpen` in `components/stories/01-the-year.tsx`:

Timeline (setupMs for the-year: 4200 → **5600**; every other registry
value untouched):

- **0–3400ms, the drive-through.** Over the §2.2 warp field (shader story
  10): the numerals "25" then "26" travel through the frame at monument
  scale — `t-monument` sizing (`clamp(9rem, 62cqw, 22rem)`), `text-gdg-red`,
  one motion.div per numeral pair, path: enters at `{x: "70%", y: "-30%",
  rotate: -8}`, exits at `{x: "-70%", y: "30%", rotate: 6}`, linear ease,
  3400ms, the "26" starting 1400ms after the "25" on the mirrored
  diagonal (enter bottom-left, exit top-right). The glyphs are so large
  only parts are ever on screen — that's the billboard effect; do NOT
  shrink them to fit.
  Pinned center the whole time: the GDG sticker logomark
  (`/Sticker Logomark.png`, 64px, drop-shadow-md), static — the anchor
  the world moves around.
  Two cold-open lines ride ON the drive-through as small centered
  overlays (`t-label`, cream, on 55%-opacity ink pill): "One chapter." at
  400ms, "One unhinged year." at 1900ms, each holding 1200ms then
  fading 150ms. (The four-line §12.1 cadence is superseded here — two
  lines overlay the spectacle, and the remaining two get the calm beat.)
- **3400–3700ms, the resolve.** The warp field's shader fade runs (the
  existing `ShaderField` crossfade handles it when `shaderStory` flips at
  reveal — but here we're still in setup, so: pass `shaderStory = 10`
  only while `setupElapsed < 3400`; player owns a `setupBeat` state
  flipped by one timeout). Field settles to the story-0 stripe band.
  Haptic `vibrate(8)`.
- **3700–5600ms, the calm.** Cream-on-ink centered: "What a year." in
  `t-display` (PopLetters, profile "fast"), then 900ms later "We kept the
  receipts." in `t-editorial` with `accentWord` blue on "receipts"
  (existing `ColdOpenLine` accent mechanism). Both hold until reveal.
  This is the reference's "We're ready for you. / Come on down." beat —
  spectacle, then a breath, then the show.

Reduced motion: skip the drive-through entirely; render the calm beat for
the whole setup (both lines, no PopLetters).

## 5. Stat slams — the three-beat payoff (law 3)

### 5.1 `components/slam-stat.tsx` — slice-assemble numeral

New primitive replacing count-up where the number is monumental. The
reference's "5,495" arrives whole, sliced into three horizontal bands that
are momentarily offset and converge:

- Three absolutely-stacked copies of the SAME final string, each clipped
  to a horizontal third via `clipPath: inset(0 0 66.6% 0)` / `inset(33.3%
  0 33.3% 0)` / `inset(66.6% 0 0 0)`.
- Initial x offsets: `-14px, +18px, -10px`. All animate to 0, `duration
  0.24s`, stagger 40ms, ease `[0.83, 0, 0.17, 1]`; the wrapping div
  simultaneously does `scale: 1.04 → 1` on `SPRING.stamp`. Haptic
  `vibrate(10)` on mount.
- Reduced motion: plain static text.

Adopt in:
- `05-your-events.tsx` — the monumental check-in numeral (currently
  Counter): a till prints rows; a monument slams. `SlamStat`.
- `06-standing.tsx` — the "TOP X%" figure inside the stamp keeps the
  existing stamp spring (it already slams — no double treatment), but the
  two big stat blocks in the non-tier variant become `SlamStat`.
- `01-the-year.tsx` receipt rows: KEEP Counter (law 3's explicit carve-out
  — the receipt prints).

### 5.2 The layering discipline

On every personal reveal screen the three beats are mandatory and timed
from reveal start: **stat at 0ms** (slam), **caption at +1100ms** (opacity
0→1, y 8→0, 300ms), **share affordance at +2200ms**. The header share
chip currently appears instantly with reveal (`showShareChip` in
player.tsx) — gate it: pass the existing `state.phase === "reveal"`
condition through a 2200ms-delayed opacity transition in `ProgressBar`'s
`shareSlot` wrapper (`transition: opacity 0.3s 2.2s`). One CSS change, no
new state.

## 6. The line-work system (law 4)

### 6.1 `components/ambient-scribbles.tsx`

Two thin paths per designated screen that never stop moving. Component
renders one `<svg viewBox="0 0 400 700" preserveAspectRatio="none">` with
2 paths; each path loops forever through: draw in (`pathLength 0→1`,
1.6s, ease `[0.83, 0, 0.17, 1]`) → hold with slow drift (parent group
`translate ±8px` over 6s, alternate) → fade out (`opacity → 0`, 0.4s) →
swap `d` to the next variant → redraw. Three `d` variants per slot,
cycled; offsets between the two paths so they never draw simultaneously.

Variants (loose single-line curves, drawn in the reference's felt-tip
voice — these exact paths, deterministic):

```
A1: M-10,120 C90,60 210,150 410,70
A2: M-10,90  C140,140 260,40 410,120
A3: M-10,60  C60,120 330,90 410,150
B1: M-10,620 C120,560 300,650 410,590
B2: M-10,580 C90,640 280,560 410,640
B3: M-10,650 C150,590 250,660 410,570
```

Stroke: `currentColor`, width 1.5, opacity 0.5 on ink fields / 0.35 on
cream. Color: `text-cream/60` on ink, `text-ink/40` on cream — never the
accent (the accent belongs to the runner, law 2).

Placement: every ink-field story reveal (`the-year`, `built`,
`your-events`, `your-chapter`, `summary`) plus `people`'s reveal. NOT on
moments (photos own it), NOT on your-club (foil owns it), NOT on standing
or whats-next (dots own them). Law 1: the scribbles on those six screens
are quiet enough to coexist with the shader figure only because they're
monochrome and ≤2 paths; never add a third system.

Reduced motion / quality off: render both paths static at full length.

### 6.2 Subject doodles — the self-drawing illustration

Three screens get ONE subject doodle each, drawn during the setup phase
above the setup line, `pathLength 0→1` over 1.8s, stroke width 2,
`currentColor` at full opacity, ~120px tall, centered:

- **your-chapter setup** (the time story — the reference's hourglass joke
  lands here): an hourglass,
  `M140,40 h120 l-44,90 44,90 h-120 l44,-90 -44,-90 z` plus the loose
  crossing scribble `M110,220 C160,190 240,250 290,215`.
- **your-events setup**: a ticket outline,
  `M100,80 h200 a0,0 0 0 1 0,60 v40 a0,0 0 0 1 0,60 h-200 a0,0 0 0 0
  0,-60 v-40 a0,0 0 0 0 0,-60 z` with a perforation dash line
  `M200,80 v220` (stroke-dasharray 4 6).
- **standing setup**: a five-point star drawn in one stroke,
  `M200,60 L235,170 350,170 258,238 293,350 200,280 107,350 142,238
  50,170 165,170 z`.

After drawing, the doodle holds and drifts with the same ±8px 6s drift as
§6.1. Reduced motion: static full-length path.

## 7. Physical type (law 6)

### 7.1 Redacted bars — `built`'s product list

`03-built.tsx`'s rows restyle from open text to the reference's
redacted-bar list: each product name sits on a filled bar sized to its
text (`inline-block`, `bg-cream text-ink`, padding `0.1em 0.35em`,
`rounded-[3px]`), the row number outside the bar in `text-cream/40`. Bars
pop in one-by-one: `scaleX 0.9→1, y 10→0, opacity 0→1`, `SPRING.default`,
stagger 90ms, transform-origin left. The active-row swell (§10.7 build2)
now scales the BAR (1 → 1.06) and flips it to the product's accent
(`BG_CLASS[p.color]` + matching `CHIP_TEXT`) while active — the bar IS
the highlight; delete the separate LIVE chip pulse (the LIVE chip stays,
static).

### 7.2 Sticker chips

New global class in `app/globals.css` (inside `@layer components`):

```css
.sticker-chip {
  background: var(--color-paper);
  color: var(--color-ink);
  padding: 0.35rem 0.8rem;
  border-radius: 4px;
  rotate: -1.5deg;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.18);
  display: inline-block;
}
```

Applied to (with `t-label` type): the `built` reveal label, `people`'s
CastMoment chapter label, and the summary card's "WRAPPED 25/26" header
line. Mount animation wherever one appears: `scale 1.25→1, rotate -6°→
-1.5°, opacity 0→1`, `SPRING.stamp` — slapped on, not faded in.

### 7.3 Tilt-settle and exit shear

- **Tilt-settle** (the reference's green row): anything "chosen" arrives
  tilted and settles: `rotate: chosen ? [4, 0] : 0` with `SPRING.default`
  on the rotate channel, 700ms visible settle. Used by the guess game
  (§8) and the built active bar (tilt 2°, subtler).
- **Exit shear**: the camera whip (`CAMERA_VARIANTS.exit`, player.tsx)
  gains a rotation keyframe on horizontal/diagonal exits only:
  `rotate: [0, 0.4 * s, 2.2 * s]` degrees where `s = Math.sign(v[0])`,
  same `SMEAR_TRANSITION` times; pure-vertical exits keep `rotate: 0`
  (the reference tilts on its sideways-energy exits, holds straight on
  clean verticals). `enter` stays untilted — only the leaving screen
  shears.

## 8. The guess game (law 7) — reactive beat in `built`

The reference mechanic, verified frame-by-frame in the 10fps burst: it is
a TAP-TO-GUESS LIST, not a swipe stack. Response is instant (<100ms).

### 8.1 Content (`lib/content/chapter.ts`)

```ts
export const GUESS_GAME = {
  question: "One of these went live first. Which?",
  answerIndex: 0, // TBD-confirm with leads (index into PRODUCTS)
  right: "First try. You were paying attention.",
  wrong: "Wrong. The receipts don't lie.",
  timeout: "No guess? It was {answer}.",
} as const;
```

(Copy lines live here rather than copy.ts because they're bound to the
PRODUCTS data; keep our voice — the reference's "Failure builds
character." is the register: short, dry, a little smug.)

### 8.2 Mechanic (`components/stories/built-guess.tsx`)

Mounts as the final beat of `built`'s reveal, after one full table cycle
(existing `ACTIVE_CYCLE_MS * 5 = 9000ms`); registry: built `revealMs 9000
→ 15000` (interaction window 6000ms — visitor-paced, so the §10.0 80%
rule applies to the post-answer auto-advance, not the wait; a real
interaction is never rushed, same principle as hold-to-pause).

- The five product rows morph in place: bars (§7.1) → outlined cards
  (`border border-cream/30 rounded-lg`, transparent fill, art-less — 
  layout-animated with `layout` prop on the existing row motion.divs, no
  remount). Headline swaps to `GUESS_GAME.question` (PopLetters, fast).
- Tap a row (rows are real `<button>`s — TapZones' `interactiveBelow`
  forwarding already handles buttons; verified pattern from build3 §3):
  - **Instantly, same frame**: the CORRECT row (answerIndex) fills
    `bg-gdg-green text-ink`, gets a ✓ (checkmark span, `t-label`), and
    tilt-settles (§7.3, 4°). If the tapped row ≠ answer, the tapped row
    gets `border-2 border-gdg-red` + ✗, stays untilted. Headline swaps
    instantly to `right`/`wrong` line. Haptic: `vibrate(10)` right,
    `vibrate([8, 30, 8])` wrong.
  - Hold 2400ms, then auto-advance the story (dispatch NEXT via a new
    optional `onComplete` StoryProps callback — same wiring pattern as
    `onReplay`).
- No tap within 6000ms: correct row fills + tilts, headline swaps to
  `timeout` with `{answer}` interpolated (`fmt()` from copy.ts), hold
  2400ms, advance.
- Guests and members see the same beat (it's chapter data, not personal).
- Reduced motion: no tilt (fill + check only); everything else identical
  — the interaction is not motion, it stays.

## 9. Collage texture and the bookend numerals

### 9.1 Newsprint collage on the club card

The reference's top-song reveal treats the album art as a xerox collage:
grayscale, high contrast, halftone, with monochrome stripe fragments
overlapping the corners. Apply to `08-your-club.tsx`'s FoilCard pattern
panel (the `h-[34%]` div): add inside it a `pattern-halftone` overlay at
`opacity 0.5, color: #0f0f0f`, and TWO stripe fragments — absolutely
positioned strips (`h-3`, repeating-linear-gradient 90°, cream/ink 8px
bars) overlapping the panel's top-right corner (`rotate 4°, w-24,
-top-1.5 -right-3`) and bottom-left (`rotate -3°, w-16`). One fragment
carries the accent runner as CSS: a `::after` band of `club.hex` 8px wide
animating `left: -8px → 100%` on a 2.6s linear infinite loop (compositor:
animate `translateX`, not `left` — the strip is `overflow-hidden` with a
child span). Reduced motion: fragments static, no runner.

### 9.2 The bookend — giant numerals on the summary

The reference closes the way it opens: giant accent numerals overlapping
the closing card. `10-summary.tsx`: behind-and-below the membership card,
a cropped monument "25/26" — `t-monument`, `text-gdg-green`, `rotate
-6°`, positioned `absolute -bottom-[6%] -left-[8%]`, `z-0` (card is
above it), `opacity 1`. It enters when the card settles: `y 60→0,
opacity 0→1`, `SPRING.default`, delay 600ms. The overture opens with red
numerals driving through; the summary parks green ones under the card —
open loud, close settled, same voice.

## 10. Performance & degradation contract

- DOM animation channels remain `transform`/`opacity` only (build.md
  §1.2). The dot-field flips are `rotateX`; the runner fragment is
  `translateX`; bars are `scaleX/y/opacity`. No `filter`, no layout
  animation except the one `layout` morph in §8.2.
- Per-screen ambient budget (law 1, enforced numerically): at most ONE of
  {shader figure, dot field, photo choreography} plus at most 2 ambient
  scribble paths plus at most 1 subject doodle. A screen at the cap takes
  no additions.
- The shader figures cost what the current shader costs (same single
  fullscreen triangle, same uniform set — branch complexity is
  negligible); the existing 42fps self-degrade → self-kill ladder in
  `shader-field.tsx` stays the safety net, now backstopped by §2.3's
  static DOM stand-ins.
- Dot field: ≤ 28 dots per screen (2 rows × 2 edges × 7), each a single
  compositor layer only while mid-flip (motion sets `will-change`
  transiently). Static between flips.
- Reduced motion, complete map: overture → calm beat only; figures/dots/
  runners/scribbles/doodles → static renders; slams → plain text; tilt/
  shear → none; guess game → fill+check, fully playable; three-beat
  layering → kept (opacity only). Nothing is ever an empty region.

## 10A. Product receipts — real platform stats in What We Built

Added after the second data drop (2026-07-19). The owner: ORBIT, Babcock
Votes, and Radar all have real usage stats, and "itd be nice if all of
these were displayed." This section puts them in the one story that is
about the products — `03-built.tsx` — as the payoff layer the reference's
stat screens taught us (§law 3): each product's number slams in when its
row takes focus.

### 10A.1 The data (already in place — `lib/content/chapter.ts`)

`PRODUCT_STATS: Record<name, ProductStat | null>` with
`ProductStat = { value: number; label: string; detail?: string }`. Static
content, NOT a DB read — the public story path keeps its zero-database
guarantee (build.md architecture); the pipeline report prints platform
totals (Radar's reads + plays come from the auth DB's radar tables) and a
lead copies final numbers in before copy freeze.

Current state: ORBIT confirmed real (`547 TICKETS ISSUED`, detail
"252 checked in" — read off the ORBIT admin dashboard 2026-07-19; the
site has no CSV export UI yet, the per-guest export follows later). The
other four are `null` (TBD-confirm: BabcockVotes total votes cast, Radar
reads + plays via the pipeline report, website analytics, Babcock 100).

### 10A.2 Step-by-step display spec

1. **Row anatomy** (`03-built.tsx`): under each product row's name bar, a
   stat line slot, height reserved only when that product's stat is
   non-null (a null stat renders NOTHING — no blank, no "0", per the
   §15 build.md rule).
2. **The beat**: the existing active-row cycle (`ACTIVE_CYCLE_MS = 1800`)
   already walks the five rows. When a row with a stat becomes active:
   - the stat line mounts: `SlamStat` (§5.1) at `t-stat` sized
     `clamp(1.1rem, 5cqw, 1.6rem)`, tabular-nums, in the product's accent
     (`text-gdg-{color}`), followed by the `label` in `t-label
     text-cream/60`, and `detail` (when present) in `t-body text-cream/45
     text-xs` right-aligned on the same line.
   - haptic none (five slams in nine seconds would cheapen the club
     flip's haptic — the visual slam is enough here).
   - when the cycle moves on, the stat line collapses (`opacity 0, height
     0`, 200ms) — one stat on screen at a time, law 1.
3. **Reduced motion**: stat renders statically with its row, always
   visible for stat-carrying rows, no slam, no collapse.
4. **The guess game handoff** (§8): the stats cycle completes one full
   pass BEFORE the game morph (the game's 9000ms trigger already equals
   one full cycle — unchanged). During the game, stat lines stay hidden
   (the outlined-card morph replaces the bars entirely) — the guess is
   about history, not the numbers just shown.
5. **Share card**: `BuiltCard` (`components/share/card-layouts.tsx`) adds
   the same stat under each product row it lists, same null-renders-
   nothing rule — satori layout, plain text, no animation.

### 10A.3 Verification

With only ORBIT filled: exactly one row ever shows a stat, the other four
cycle without empty space (measure row heights — stat-less rows must not
reserve the slot). Fill a second fake stat locally and confirm two-stat
cycling; revert before commit. Reduced-motion pass shows ORBIT's stat
statically. `BuiltCard` renders unchanged for stat-less products.

## 10B. The People story — website order, real faces, reference-grade credits

Owner instruction (2026-07-19): the credits must follow gdgbabcock.com/team's
order, use that repo's photos "entirely," and reach the reference's level.
The data/order/photo work is BUILT (this section documents it and the
re-sync recipe); the remaining presentation items below join the build
order.

### 10B.1 Source of truth and order contract (BUILT)

- Canonical roster = the website team page's own data: served live by
  `auth.gdgbabcock.com/team` (Postgres, `team_members`), previously
  hardcoded in GDGWebsite `lib/team-data.ts`. The sync used the last
  pre-migration roster from that file's git history (61 members —
  identical content to what the endpoint serves).
- Display order = the /team page's own algorithm, reproduced exactly:
  `TEAM_SECTIONS` order (Core → Tracks → Dev → Media → Events) → declared
  subteam order within a section (Tracks: Software Dev & Eng, Data & AI,
  Infra & Security, Design & Mgmt; Dev: Frontend, Backend, Product
  Design, Product Management; Media: Photographers, Content Creators,
  Graphic Designers, Video Editors, RADAR) → **leads first** within each
  group → raw roster order. `PEOPLE` in `lib/content/chapter.ts` is
  stored ALREADY SORTED this way; render order is array order, nothing
  re-sorts downstream.
- Wrapped section mapping: core→CORE; the four track subteams→SOFTWARE /
  DATA / INFRASTRUCTURE / DESIGN; dev→DEV (new section); media→MEDIA;
  events→EVENTS. SPONSORS and SPECIAL_THANKS remain wrapped-only
  trailing chapters (lead-supplied placeholders).
- `Person` gained `isLead?: boolean` and `subteam?: string`. Leads render
  first (already, via order), larger (68px vs 54px avatar), with a 2px
  accent ring.
- Photos: all 61 headshots copied from GDGWebsite `public/team/**` into
  `public/people/` (flattened kebab names, `-lead`/`-organizer` suffixes
  stripped); 26 orphaned generic photos deleted. 100% coverage — the
  InitialsAvatar fallback now exists only for the 4 sponsor/thanks
  placeholders.
- **Re-sync recipe** (when the roster changes): fetch
  `https://auth.gdgbabcock.com/team` (or re-extract `lib/team-data.ts`
  from the GDGWebsite history), re-run the ordering algorithm above,
  regenerate the `PEOPLE` literal, re-copy photos. The one-off generator
  lives in the session scratchpad pattern — 60 lines, documented here so
  it can be rewritten from this contract alone.

### 10B.2 Cadence (BUILT — supersedes build2 §12.1's people numbers)

Ten chapters (8 cast + sponsors + special), each: ONE combined chapter
card — accent panel, PopLetters title, the section's editorial line from
`copy.people.transitions` beneath (title and transition are one beat, not
two) — holding 1600ms, then the cast grid for
`min(2200 + 130 × count, 5200)`ms. Exact schedule: cards 16000 + content
30450 = **46,450ms**; registry `peopleMs`/`revealMs` 45000 → **60000**
(§10.0 80% rule: 46.45s ≤ 48s). The closer line renders in the
`finished` state for the remainder.

### 10B.3 Remaining presentation items (NOT built — join the build order)

1. **Subteam sticker chips** (§7.2's `.sticker-chip`) as group headers
   inside the MEDIA cast grid only — RADAR (7), VIDEO EDITORS (5),
   GRAPHIC DESIGNERS (2); the two single-member subteams stay unlabeled
   (a chip per lone face is noise, and the full labeled layout measured
   ~702px against a ~700px stage — it does NOT fit with every subteam
   labeled). DEV stays flat: five people across four subteams means the
   chips would outnumber the faces.
2. **The quarter-rings figure** (§2.1, story 3) with the yellow runner is
   the story's ambient layer — verify the cream cast grids stay legible
   over it at the figure's bottom-left anchor; if faces collide with
   rings on the 16-person MEDIA grid, cap that chapter's grid at
   `max-w-sm` (its current `max-w-md` is the widest).
3. **Chapter-card slam**: the combined card's title should land with the
   §5.1 slam treatment (slice-assemble) instead of PopLetters once
   SlamStat exists — PopLetters stays for cast-grid labels. One-line swap,
   listed here so it isn't forgotten when commit 4 lands.

## 11. Sequencing

Each its own commit, this order (every step leaves the app shippable):

1. `feat(gl): bold ambient figures with accent runners` — §2.1 shader
   rewrite (stories 0/2/3), §2.2 overture branch + `shaderStory` wiring,
   §2.3 quality context + static stand-ins.
2. `feat(ambient): coin-flip dot field on standing and whats-next` — §3
   (including the story-8 shader mote removal).
3. `feat(stories): the overture` — §4 cold-open rebuild (registry:
   the-year setupMs 5600).
4. `feat(stories): slam stats and three-beat payoffs` — §5 (SlamStat,
   adoption in your-events/standing, share-chip delay).
5. `feat(type): line-work system` — §6 (ambient scribbles + three subject
   doodles).
6. `feat(type): redacted bars, sticker chips, tilt-settle, exit shear` —
   §7.
7. `feat(stories): the guess game` — §8 (GUESS_GAME content + built-guess
   + registry built revealMs 15000 + onComplete wiring).
8. `feat(stories): product stat slams in What We Built` — §10A (depends
   on §5's SlamStat; the PRODUCT_STATS content block already shipped
   with the data-drop commits).
9. `feat(stories): credits polish — media subteam chips, rings-figure
   legibility, chapter-card slam` — §10B.3 (depends on §2's figure, §5's
   SlamStat, §7.2's sticker chips; §10B.1–.2 already shipped).
10. `feat(stories): club collage and summary bookend` — §9.

Verification gates (run after 2, 5, and 10): `tsc`, `eslint`, `vitest`,
production build, then a real-device pass on one iPhone + one Android
checking, in order: the overture reads as spectacle-then-breath (not two
unrelated screens); every screen has exactly one thing visibly alive
during its hold; the runner reads as the accent "walking" its figure; the
guess game responds the same frame you tap; reduced-motion end-to-end
shows no dead regions and no motion. The §10.0 80% rule holds for every
scripted sequence at its story's revealMs; the guess game's wait window
is exempt per §8.2.

## 12. What this pass deliberately does not do

- No new snapshot fields and no DB reads on the public path — the guess
  game and the §10A product stats both run on static chapter facts
  (§10A.2 step 5's BuiltCard tweak is the one piece of share-card work
  in this pass, and it's layout-only).
- No per-story music stingers (build2 §12.2's one-bed rule stands).
- Moments and your-club keep their existing choreography cores — they
  were built to their own metaphors (scrapbook, foil ritual) and already
  satisfy law 1; §9.1 dresses the club card, it does not re-choreograph
  it.
- The reference's swipe-driven navigation is TikTok's video player, not
  Wrapped's own chrome — our tap/hold/grid engine (build.md §6) stands.
