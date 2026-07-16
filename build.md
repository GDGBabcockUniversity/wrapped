# GDG Wrapped 2025/2026 — Complete Build Specification

> **Who this document is for:** an implementing engineer/model executing this build inside the
> `gdgbabcockuniversity/wrapped` repository, with the sibling repos (`GDGWebsite`, `auth`, `radar`,
> `the-hundred`) checked out next to it at `../`.
>
> **The prime directive: DO NOT INVENT.** Every design token, animation value, copy line, formula,
> file name, and API shape you need is specified in this document. If something appears missing,
> re-read the relevant section — it is almost certainly specified. If it is genuinely absent, choose
> the most conservative option consistent with this spec and leave a `// SPEC-GAP:` comment. Never
> introduce a new color, font, easing, library, or design pattern that this document does not name.

---

## 0. What you are building

**GDG Wrapped** — Spotify-Wrapped-style year in review for GDG on Campus Babcock's 2025/2026
chapter year, at `wrapped.gdgbabcock.com`. A vertical, phone-first (9:16), tap-through story
experience:

- **Stories 1–4 + 9 are PUBLIC** (chapter-wide): The Year, The Moments, What We Built, The People,
  What's Next. Anyone with the link sees them with zero login and zero database reads.
- **Stories 5–8 + Summary are PERSONAL**: Your Events, Your Standing, Your Chapter, Your Club,
  and the Summary card. Unlocked by email + magic link. Non-members get a graceful
  invitation-framed fallback, never an error.
- **Every story has its own downloadable/shareable 1080×1920 card**, server-rendered.
- Pacing controls: auto-advance, hold-to-pause, tap back/forward, an overlay grid to revisit any
  story without restarting (this mirrors Spotify Wrapped 2025's pacing features).

Performance is a feature: the public path must be fully static and CDN-served; the personal path
does exactly one indexed database read per session bootstrap. Target: instant-feeling on a mid-range
Android phone on campus Wi-Fi, and safe under a viral spike (hundreds of thousands of hits land on
static/CDN surfaces, not on compute or the database).

### Non-negotiables

1. Palette is **ink + cream + the four GDG accents** only (§3.1). No other colors exist.
2. Typography does the heavy lifting. Big, confident type; graphic treatments are per-story but all
   inside the palette.
3. Every number on a reveal screen animates (count-up), except when `prefers-reduced-motion`.
4. Low-activity members are **never shamed** — their screens become invitations (§15).
5. WhatsApp message **content** is never stored, logged, or transmitted — counts and timestamps only.
6. The public experience must work with the database completely down.
7. **The immersive layer (§3.7–3.8) is progressive enhancement.** WebGL shader fields, kinetic
   variable type, view transitions, haptics, and live-card video are all feature-gated; a low-end
   device or a failed capability check silently gets the complete CSS experience. No user ever
   sees a degraded-looking or broken frame — they just see fewer layers of motion.

---

## 1. Ground rules, git, and workflow

### 1.1 Git conventions (mandatory)

- Work **directly on `main`**. No feature branches.
- Author identity — run once before the first commit:
  ```bash
  git config user.name "nekumartins"
  git config user.email "akpotohwoo@gmail.com"
  git config commit.gpgsign false
  ```
- Commits are **unsigned**, single-author, **no co-author trailers of any kind**.
- Message style: `type(scope): subject` — lowercase type, imperative subject, no trailing period.
  Types used here: `feat`, `fix`, `chore`, `docs`, `style`, `test`, `refactor`.
  Examples: `feat(engine): add story state machine`, `chore(repo): scaffold next 16 app`.
- Commit at the end of each numbered phase in §17 (one commit per phase, message given there).
  Push with `git push -u origin main` (retry up to 4 times with 2s/4s/8s/16s backoff on network
  failure only).

### 1.2 Working style

- TypeScript strict. No `any` unless interfacing with untyped exports data (then `unknown` + zod).
- Client components only where interactivity demands (`"use client"` on the player and its
  children; everything else server components).
- Animations: **only `transform` and `opacity`** are animated (compositor-friendly). Never animate
  `width`, `height`, `top`, `left`, `box-shadow`, or `filter` except where this doc explicitly says so.
- All copy comes from `lib/copy.ts` (§7). Components never hardcode sentences.
- All timing values come from `lib/stories.ts` constants (§6.1). Components never hardcode durations.

### 1.3 Environment variables (`.env.example` — create this file verbatim)

```bash
# --- Runtime (Vercel project settings) ---
# Neon Postgres connection string for the auth-hub database (read path: wrapped_snapshots, wrapped_meta).
# Ask the chapter organizer. Use the POOLED connection string for the app.
DATABASE_URL=

# 32+ char random secret for magic-link + session JWTs. Generate: openssl rand -base64 32
WRAPPED_SESSION_SECRET=

# Resend API key (ecosystem email provider). Ask the organizer; domain gdgbabcock.com must be verified in Resend.
RESEND_API_KEY=

# Sender address for magic links.
EMAIL_FROM="GDG Wrapped <wrapped@gdgbabcock.com>"

# Canonical origin, no trailing slash.
NEXT_PUBLIC_SITE_URL=https://wrapped.gdgbabcock.com

# --- Pipeline only (never set in Vercel; local .env for the person running the pipeline) ---
# Direct (non-pooled) Neon connection string; pipeline uses long-lived pg connections.
PIPELINE_DATABASE_URL=

# Wrapped year window (inclusive start, exclusive end)
WRAPPED_YEAR_START=2025-09-01
WRAPPED_YEAR_END=2026-08-01
```

`.gitignore` additions beyond the Next.js defaults:

```
.env
.env.local
data/
*.tsbuildinfo
```

**`data/` is gitignored and sacred**: raw WhatsApp exports (`data/exports/*.txt`),
`data/mapping.json`, `data/opt-out.json`, `data/unmatched.csv` must never be committed.

---

## 2. Phase 0 — Scaffold

Create these files exactly. Do not run `create-next-app`; author files directly.

### 2.1 `package.json`

```json
{
  "name": "wrapped",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "ts-lint": "tsc --noEmit --incremental",
    "test": "vitest run",
    "pipeline": "tsx scripts/pipeline/run.ts"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.1",
    "@vercel/analytics": "^2.0.1",
    "clsx": "^2.1.1",
    "jose": "^6.0.11",
    "motion": "^12.23.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "resend": "^6.9.1",
    "tailwind-merge": "^3.5.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pg": "^8.11.10",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "dotenv": "^17.2.0",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "pg": "^8.16.0",
    "tailwindcss": "^4",
    "tsx": "^4.20.0",
    "typescript": "^5",
    "vitest": "^3.2.0"
  }
}
```

Rationale you must not second-guess: `motion` is the single deliberate deviation from the
ecosystem's "hand-rolled CSS" convention — a Wrapped is choreography (springs, staggers, count-ups,
a 3D card flip) and `motion/react` is the smallest tool that does it well. **No Radix, no shadcn,
no icon library** — this app has two form controls and every icon is inline SVG.

### 2.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2.3 `postcss.config.mjs`

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### 2.4 `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // Immutable caching for versioned static assets under /moments and /people
        source: "/:dir(moments|people)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2.5 `eslint.config.mjs`

Copy `../the-hundred/eslint.config.mjs` verbatim (flat config for Next 16).

### 2.6 `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
  },
});
```

### 2.7 Directory skeleton

Create this exact tree (empty files are fine at scaffold time; later phases fill them):

```
app/
  layout.tsx
  globals.css
  page.tsx                        # landing
  wrapped/page.tsx                # story player route
  api/auth/request/route.ts
  api/auth/verify/route.ts
  api/auth/logout/route.ts
  api/me/route.ts
  api/share/[storyId]/route.tsx
  debug/cards/page.tsx
components/
  svg-filters.tsx
  grain.tsx
  counter.tsx
  initials-avatar.tsx
  gl/
    shader-field.tsx
    shaders.ts
    use-gl-quality.ts
  story-engine/
    player.tsx
    use-story-state.ts
    progress-bar.tsx
    tap-zones.tsx
    chapter-grid.tsx
    story-frame.tsx
    preloader.ts
  stories/
    01-the-year.tsx
    02-moments.tsx
    03-built.tsx
    04-people.tsx
    05-your-events.tsx
    06-standing.tsx
    07-your-chapter.tsx
    08-your-club.tsx
    09-whats-next.tsx
    10-summary.tsx
  share/
    share-button.tsx
    share-sheet.tsx
    live-card.ts
    card-layouts.tsx
lib/
  stories.ts
  copy.ts
  clubs.ts
  snapshot.ts
  content/chapter.ts
  session.ts
  db.ts
  email.ts
  utils.ts
scripts/pipeline/
  run.ts
  fetch-db.ts
  parse-whatsapp.ts
  parse-whatsapp.test.ts
  match-members.ts
  match-members.test.ts
  compute-stats.ts
  percentiles.ts
  percentiles.test.ts
  clubs.ts
  clubs.test.ts
  write-snapshot.ts
  seed-fake.ts
  report.ts
assets/fonts/                     # see §14.2 (satori, server)
public/
  fonts/                          # same three TTFs again (live-card FontFace, client — §10.6)
  moments/                        # see §14.1
  people/                         # see §14.1
data/                             # gitignored, empty in git (add data/.gitkeep? NO — fully gitignored)
```

`lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. The design system (do not deviate)

The aesthetic is **"beige and black"**: warm cream and near-black ink, typography-forward, bold and
premium, never busy. It inherits the GDG Babcock ecosystem language (GDGWebsite supplies the
ink + outlined-type system; the-hundred supplies the warm editorial cream). Stories alternate
ink-field and cream-field like turning pages. Each story uses **exactly one** GDG accent color, on
less than 10% of the frame — except Story 8 (Your Club), the only full-bleed accent story, and
Story 3, which uses all four accents as tiny status chips only.

### 3.1 Color tokens — the complete palette

| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#0f0f0f` | black fields, text on cream |
| `--color-ink-2` | `#161616` | raised surfaces on ink |
| `--color-cream` | `#fff6e0` | cream fields, text on ink |
| `--color-paper` | `#fdfbf7` | warmer layering tone on cream fields |
| `--color-cream-deep` | `#f8ecc9` | cards/insets on cream fields |
| `--color-gdg-blue` | `#4285f4` | accent — stories 1, 5 |
| `--color-gdg-red` | `#ea4335` | accent — stories 2, 6; Sprinter club |
| `--color-gdg-yellow` | `#faab00` | accent — stories 4; Observer club |
| `--color-gdg-green` | `#34a853` | accent — stories 7, 9; Builder club |

Derived (only these, never ad-hoc rgba): border on ink = `rgba(255,246,224,0.14)`; border on cream
= `rgba(15,15,15,0.14)`; muted text on ink = `rgba(255,246,224,0.55)`; muted text on cream =
`rgba(15,15,15,0.55)`. Connector club accent = `--color-gdg-blue`.

### 3.2 Typography

Two families, loaded two ways:

1. **Google Sans Flex** — the ecosystem signature family as a full VARIABLE font (weight axis
   100–1000), self-hosted via `next/font/google` (the radar repo's precedent — no external CDN,
   zero render-blocking):
   ```ts
   import { Google_Sans_Flex } from "next/font/google";
   const googleSans = Google_Sans_Flex({
     subsets: ["latin"], variable: "--font-google-sans", display: "swap", axes: ["wght"] as never,
   });
   ```
   (If the `axes` option errors on this next/font version, request
   `weight: "variable"` — the point is the full weight axis must load, because kinetic type §3.8
   animates it.) Apply `googleSans.variable` on `<html>`. **Outlined type stays pinned at
   weight 700** — synthesized weights beyond the axis ghost the stroke filter (see comment block
   in `../GDGWebsite/app/globals.css` lines 258–290 explaining the bug).
2. **Bricolage Grotesque** — the single editorial voice, via `next/font/google` in `app/layout.tsx`:
   ```ts
   import { Bricolage_Grotesque } from "next/font/google";
   const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
   ```
   Used **only** for the `.t-editorial` class — at most one line per story.

Type scale — define these utility classes in `globals.css` (values are final, not suggestions):

```css
/* Display: story titles, reveal headlines */
.t-display   { font-weight: 700; letter-spacing: -0.02em; line-height: 0.95;
               font-size: clamp(3rem, 17.5cqw, 6.5rem); }
/* Monument numeral: the single huge number on personal reveals */
.t-monument  { font-weight: 700; letter-spacing: -0.04em; line-height: 0.85;
               font-size: clamp(9rem, 62cqw, 22rem); }
/* Stat numbers on multi-stat screens */
.t-stat      { font-weight: 700; letter-spacing: -0.02em; line-height: 1;
               font-size: clamp(2.75rem, 15cqw, 5.5rem); }
/* Body / reveal support copy */
.t-body      { font-weight: 500; line-height: 1.35; font-size: clamp(1rem, 4.6cqw, 1.25rem); }
/* Small-caps labels, eyebrows, progress captions */
.t-label     { font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em;
               font-size: clamp(0.625rem, 2.9cqw, 0.75rem); }
/* The one editorial line per story */
.t-editorial { font-family: var(--font-bricolage), serif; font-style: italic; font-weight: 500;
               line-height: 1.25; font-size: clamp(1.375rem, 6.5cqw, 2rem); }
```

`cqw` units are container-query units relative to the 9:16 stage (§6.4 makes the stage a
`container-type: size` element) so type scales with the stage, not the window — this is what keeps
desktop letterboxing correct. **Do not change these to `vw`.**

### 3.3 `app/globals.css` — write this file exactly

```css
@import "tailwindcss";

@theme inline {
  --color-ink: #0f0f0f;
  --color-ink-2: #161616;
  --color-cream: #fff6e0;
  --color-paper: #fdfbf7;
  --color-cream-deep: #f8ecc9;
  --color-gdg-blue: #4285f4;
  --color-gdg-red: #ea4335;
  --color-gdg-yellow: #faab00;
  --color-gdg-green: #34a853;
  --font-sans: var(--font-google-sans, "Google Sans"), system-ui, sans-serif;
}

* { font-family: var(--font-sans); }

html, body { background: var(--color-ink); color: var(--color-cream); }

/* ---------- Type scale (§3.2 — paste the six .t-* classes here) ---------- */

/* ---------- Outlined display type (ported from GDGWebsite; see §3.4) ---------- */
.text-outline-base {
  color: black !important;
  -webkit-text-fill-color: black !important;
  line-height: 1.14;
  font-weight: 700;
  letter-spacing: 0.045em;
  font-synthesis: none;
  text-rendering: geometricPrecision;
}
.text-outline-cream  { filter: url(#stroke-cream); }
.text-outline-blue   { filter: url(#stroke-blue); }
.text-outline-red    { filter: url(#stroke-red); }
.text-outline-yellow { filter: url(#stroke-yellow); }
.text-outline-green  { filter: url(#stroke-green); }
@media (max-width: 48rem) {
  .text-outline-base { line-height: 1.18; font-weight: 500; letter-spacing: 0.035em; }
  .text-outline-cream  { filter: url(#stroke-cream-mobile); }
  .text-outline-blue   { filter: url(#stroke-blue-mobile); }
  .text-outline-red    { filter: url(#stroke-red-mobile); }
  .text-outline-yellow { filter: url(#stroke-yellow-mobile); }
  .text-outline-green  { filter: url(#stroke-green-mobile); }
}

/* ---------- Film grain (§3.5) ---------- */
.grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 60;
  opacity: 0.055;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

/* ---------- Dotted leader line (Story 1 receipt rows) ---------- */
.leader { flex: 1; margin: 0 0.6em;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1.5px);
  background-size: 8px 2px; background-repeat: repeat-x; background-position: bottom;
  height: 0.9em; opacity: 0.4; }

/* ---------- Perforated receipt edge (Story 1) ---------- */
.perforation { height: 12px;
  background-image: radial-gradient(circle at 6px 6px, var(--color-ink) 4px, transparent 4.5px);
  background-size: 16px 12px; background-repeat: repeat-x; }

/* ---------- Reduced motion: kill non-essential animation globally ---------- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

(The `.t-*` classes from §3.2 must be pasted where the comment indicates. Nothing else goes in
this file except the club patterns in §9.8.)

### 3.4 `components/svg-filters.tsx` — copy VERBATIM

Copy `../GDGWebsite/components/svg-filters.tsx` into `components/svg-filters.tsx` unchanged.
It renders ten SVG `<filter>` defs (`#stroke-{cream,blue,red,yellow,green}` at dilate radius 1.5
for desktop and `#stroke-*-mobile` at 0.75). Mount `<SvgFilters />` once in `app/layout.tsx`
directly inside `<body>`. The `.text-outline-*` classes reference these filter IDs. This is the
ecosystem's signature stroke-only display type. If the file cannot be copied for any reason,
recreate it exactly: for each color `{cream:#fff6e0, blue:#4285f4, red:#ea4335, yellow:#faab00,
green:#34a853}`, a filter of `feMorphology(dilate, SourceAlpha)` → `feFlood(color)` →
`feComposite(in)` → `feComposite(out, SourceAlpha)`.

**Hard rule:** outlined type ALWAYS pairs `.text-outline-base` with exactly one color variant, and
its element must have `font-weight: 700` or lighter (the base class enforces this — do not add
`font-extrabold`).

### 3.5 `components/grain.tsx`

```tsx
export function Grain() {
  return <div aria-hidden className="grain" />;
}
```

Mounted once in `app/layout.tsx`. It sits above everything (z-60) at 5.5% opacity and sells the
physical-media texture (Wrapped 2025's mixtape/scrapbook energy) without any image asset.

### 3.6 Motion constants — `lib/stories.ts` exports these (used everywhere; never inline timing)

```ts
export const TIMING = {
  setupMs: 3500,          // setup beat duration
  revealMs: 7000,         // public reveal duration
  personalRevealMs: 8000, // personal reveal duration
  momentsMs: 12000,       // story 2 reveal (photo cycle needs longer)
  peopleMs: 14000,        // story 4 reveal (credits roll)
  storyFadeMs: 240,       // crossfade between stories/phases
  countUpMs: 1200,        // number roll-up
  staggerMs: 120,         // list item stagger
} as const;

export const SPRING = {
  default: { type: "spring", stiffness: 260, damping: 30 } as const,
  stamp:   { type: "spring", stiffness: 420, damping: 22 } as const,   // story 6 slam
  flip:    { type: "spring", stiffness: 190, damping: 24 } as const,   // story 8 card flip
  photo:   { type: "spring", stiffness: 300, damping: 28 } as const,   // story 2 flick
};
```

Motion grammar (memorize):
- Phase entrances: `opacity 0→1` + `y: 12→0`, `TIMING.storyFadeMs`, ease-out.
- Numbers: count up over `TIMING.countUpMs` with `easeOut` (component in §5.3).
- Lists: stagger children by `TIMING.staggerMs`.
- `useReducedMotion()` from `motion/react`: when true, render final values immediately —
  no count-ups, no springs, crossfade only (the CSS in §3.3 backstops this).

### 3.7 The immersive layer — WebGL2 shader fields (write the GLSL verbatim)

Every story's background is a **living shader field**: one persistent fullscreen-triangle WebGL2
canvas behind the story DOM, driven by tiny uniforms. This is what separates the experience from
"a slideshow" — the frame itself breathes, reacts to the pointer, and shifts personality per story.
It is **pure progressive enhancement**: no library (raw WebGL2, ~6 KB of GLSL strings), and a
device that fails any gate silently keeps the CSS fields from §9 (which remain painted beneath the
canvas as the fallback).

**Layering inside the stage (§6.4)**: CSS field color (z-0, always painted) → `<ShaderField />`
canvas (z-[1], `position:absolute inset-0`) → story content (z-10) → engine UI (z-20) → grain (z-60).

#### `components/gl/shader-field.tsx` + `components/gl/shaders.ts`

Behavior contract:
- Create context: `canvas.getContext("webgl2", { alpha: false, antialias: false,
  powerPreference: "low-power", preserveDrawingBuffer: false })`.
- **Quality gates — skip the layer entirely** (render nothing, CSS field shows) when ANY of:
  context creation fails; `prefers-reduced-motion`; `navigator.deviceMemory < 4` (when defined);
  `navigator.connection?.saveData`. Expose the decision as `useGlQuality(): "full" | "off"`.
- Resolution: `min(devicePixelRatio, 1.5)`; `ResizeObserver` on the stage resizes the drawing
  buffer. The shader is cheap by construction (≤ 4 fbm octaves) — 60 fps on a 2022 mid-range
  Android is the bar; if `requestAnimationFrame` deltas average > 24 ms over 60 frames, drop DPR
  to 1.0; if still slow, permanently switch to `"off"` for the session.
- Uniforms, updated per frame: `u_time` (s), `u_res` (px), `u_pointer` (0..1 stage coords,
  lerp-smoothed at factor 0.08/frame toward the real pointer; idle drift = slow lissajous
  `0.5 + 0.22*sin(t*0.13), 0.5 + 0.22*cos(t*0.09)`), `u_progress` (active phase progress 0..1
  from the engine), `u_fade` (see below).
- Uniforms updated per story change: `u_story` (int, the story index 0–9), `u_field`
  (0 ink / 1 cream), `u_accent` (vec3 from the story accent hex; for `your-club` use the member's
  `CLUBS[id].hex`), `u_pattern` (int 0 grid / 1 waves / 2 halftone / 3 diagonals; only read by the
  club story).
- **Story transitions**: on story change animate `u_fade` 1→0 over 120 ms, swap `u_story`/
  `u_accent`/`u_field`/`u_pattern`, animate `u_fade` 0→1 over 120 ms (total = `TIMING.storyFadeMs`,
  in JS, not CSS). The shader multiplies its story layer by `u_fade` over the base field color.
- Pause RAF on `document.hidden`; keep running while story-paused (the ambience continuing while
  paused is intentional).

Vertex shader (fullscreen triangle, no buffers — `gl.drawArrays(gl.TRIANGLES, 0, 3)`):

```glsl
#version 300 es
void main() {
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);
}
```

Fragment shader — ONE program for all ten stories (paste verbatim into `shaders.ts`):

```glsl
#version 300 es
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // 0..1, y up
uniform vec3  u_accent;    // story accent, linearized 0..1 rgb
uniform float u_field;     // 0 = ink, 1 = cream
uniform int   u_story;     // 0..9
uniform int   u_pattern;   // club pattern id
uniform float u_progress;  // phase progress 0..1
uniform float u_fade;      // story crossfade 0..1
out vec4 frag;

const vec3 INK   = vec3(0.059, 0.059, 0.059);   // #0f0f0f
const vec3 CREAM = vec3(1.000, 0.965, 0.878);   // #fff6e0

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;               // 0..1
  vec2 p  = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;  // centered, aspect-correct
  vec3 base = mix(INK, CREAM, u_field);
  vec3 col = base;
  float d = distance(uv, u_pointer);

  if (u_story == 0) {            // THE YEAR: receipt-printer scanlines + drifting ink motes
    float scan = smoothstep(0.996, 1.0, sin(uv.y * 420.0 + u_time * 1.5) * 0.5 + 0.5);
    col += u_accent * scan * 0.05;
    float motes = smoothstep(0.985, 1.0, noise(p * 6.0 + vec2(0.0, u_time * 0.05)));
    col += u_accent * motes * 0.12;
  } else if (u_story == 1) {     // MOMENTS: warm paper grain + breathing vignette
    col -= (fbm(p * 5.0 + u_time * 0.02) - 0.5) * 0.035;
    col -= smoothstep(0.45, 1.1, length(p)) * 0.06 * (0.8 + 0.2 * sin(u_time * 0.4));
  } else if (u_story == 2) {     // BUILT: blueprint grid, parallax toward pointer
    vec2 g = p * 14.0 + (u_pointer - 0.5) * 1.6;
    float grid = max(smoothstep(0.97, 1.0, abs(fract(g.x) - 0.5) * 2.0),
                     smoothstep(0.97, 1.0, abs(fract(g.y) - 0.5) * 2.0));
    col += u_accent * grid * 0.10;
  } else if (u_story == 3) {     // PEOPLE: slow spotlight sweep across the credits
    vec2 c = vec2(0.5 + 0.4 * sin(u_time * 0.15), 0.5 + 0.4 * cos(u_time * 0.11));
    col += u_accent * exp(-6.0 * distance(uv, c)) * 0.07;
  } else if (u_story == 4) {     // YOUR EVENTS: constellation — twinkling attendance stars
    vec2 cell = floor(p * 10.0); vec2 fp = fract(p * 10.0);
    float star = smoothstep(0.06, 0.0, length(fp - 0.5 - 0.3 * (vec2(hash(cell), hash(cell + 7.0)) - 0.5)));
    float tw = 0.5 + 0.5 * sin(u_time * (1.0 + hash(cell) * 2.0) + hash(cell) * 6.28);
    col += u_accent * star * tw * 0.35;
  } else if (u_story == 5) {     // STANDING: stamp shockwave rings on reveal
    float ring = abs(length(p) - u_progress * 1.2);
    col -= smoothstep(0.06, 0.0, ring) * 0.10 * (1.0 - u_progress);
    col -= (fbm(p * 4.0) - 0.5) * 0.03;
  } else if (u_story == 6) {     // YOUR CHAPTER: green aurora flow, left to right
    float a = fbm(vec2(p.x * 2.0 - u_time * 0.06, p.y * 3.0));
    col += u_accent * smoothstep(0.55, 0.9, a) * 0.16;
  } else if (u_story == 7) {     // YOUR CLUB: full-bleed accent + pattern + iridescent foil
    col = u_accent * mix(0.72, 1.0, uv.y);
    float pat = 0.0;
    vec2 q = p * 16.0;
    if (u_pattern == 0)      pat = max(smoothstep(0.9, 1.0, abs(fract(q.x) - 0.5) * 2.0),
                                       smoothstep(0.9, 1.0, abs(fract(q.y) - 0.5) * 2.0));
    else if (u_pattern == 1) pat = smoothstep(0.85, 1.0, sin(length(p - vec2(0.0, -1.2)) * 40.0) * 0.5 + 0.5);
    else if (u_pattern == 2) pat = smoothstep(0.35, 0.25, length(fract(q * 0.75) - 0.5));
    else                     pat = smoothstep(0.85, 1.0, sin((p.x + p.y) * 45.0) * 0.5 + 0.5);
    col = mix(col, INK, pat * 0.13);
    vec3 iri = 0.5 + 0.5 * cos(6.2832 * (d * 2.2 - u_time * 0.08 + vec3(0.0, 0.33, 0.67)));
    col += iri * exp(-3.5 * d) * 0.18;                 // thin-film foil chasing the pointer
  } else if (u_story == 8) {     // WHAT'S NEXT: cream field, rising ember motes in green
    vec2 e = fract(p * 4.0 - vec2(0.0, u_time * 0.05));
    float m = smoothstep(0.05, 0.0, length(e - 0.5)) * step(0.72, hash(floor(p * 4.0 - vec2(0.0, u_time * 0.05))));
    col -= vec3(0.02) * fbm(p * 5.0);
    col = mix(col, u_accent, m * 0.5);
  } else {                       // SUMMARY: near-still vignette + four faint orbiting dots
    col -= smoothstep(0.5, 1.15, length(p)) * 0.08;
    for (int i = 0; i < 4; i++) {
      float ang = u_time * 0.1 + float(i) * 1.5708;
      vec3 dotc = i == 0 ? vec3(0.26, 0.52, 0.96) : i == 1 ? vec3(0.92, 0.26, 0.21)
                : i == 2 ? vec3(0.98, 0.67, 0.00) : vec3(0.20, 0.66, 0.33);
      col += dotc * exp(-9.0 * distance(p, 0.42 * vec2(cos(ang), sin(ang)))) * 0.08;
    }
  }

  col = mix(base, col, u_fade);
  frag = vec4(col, 1.0);
}
```

Hex→vec3 for `u_accent` (linear pass-through of sRGB/255 is fine at these subtle intensities):
blue `(0.259, 0.522, 0.957)`, red `(0.918, 0.263, 0.208)`, yellow `(0.980, 0.671, 0.000)`,
green `(0.204, 0.659, 0.325)`.

**Do not add post-processing, bloom, three.js, or more octaves.** The restraint IS the premium
feel; the shader must stay invisible-until-you-notice-it on every story except `your-club`, where
it becomes the field.

### 3.8 Kinetic type, view transitions, haptics (the 2026 CSS layer)

All progressive enhancement — feature-queried, zero-cost where unsupported.

1. **Kinetic variable weight.** Register the axis and animate real weight, not scale:
   ```css
   @property --wght { syntax: "<number>"; inherits: false; initial-value: 700; }
   .kinetic { font-variation-settings: "wght" var(--wght); }
   .kinetic-breathe { animation: breathe 6s ease-in-out infinite; }
   @keyframes breathe { 0%,100% { --wght: 550; } 50% { --wght: 800; } }
   ```
   Used on: the landing "WRAPPED" title (breathe); setup lines enter as a **weight cascade** —
   each word wrapped in a span animating `--wght` 300→700 over 500 ms, staggered `TIMING.staggerMs`
   (drive with `motion` animating the CSS variable). Never combine `.kinetic` with outlined type
   (the filter needs the pinned 700).
2. **Optical text trimming.** On `.t-monument` and `.t-display`:
   `text-box: trim-both cap alphabetic;` — kills the phantom leading above cap-height so monuments
   center optically. Progressive (Chrome/Safari ship it; Firefox ignores harmlessly).
3. **CSS spring easing** for non-`motion` transitions (progress-bar fill, chip pulses) — define
   once on `:root` and use verbatim:
   ```css
   --ease-spring: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%,
     0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%,
     1.017 63.9%, 1.001 85.4%, 1);
   ```
4. **Cross-document View Transition** landing → player: in globals
   `@view-transition { navigation: auto; }`; give the landing "WRAPPED" title and the player's
   story-1 setup line `view-transition-name: wrapped-title;` — the title morphs from the landing
   into the first story. Feature-queried by nature (no-op in unsupporting browsers). Keep default
   240 ms; do not customize further.
5. **`@starting-style` entrances** for pure-CSS mounted elements (paused chip, toasts):
   `.toast { transition: opacity .24s, translate .24s; @starting-style { opacity: 0; translate: 0 8px; } }`
6. **Haptics** (Android; iOS ignores `navigator.vibrate` silently): tap-advance `vibrate(8)`;
   stamp landing and club flip `vibrate([12, 40, 12])`; guard behind
   `!prefers-reduced-motion && document.hasFocus()`. Wire in `tap-zones.tsx` (advance) and the two
   story components (impact moments). Never vibrate on auto-advance.
7. **No audio.** Immersion here is visual + haptic. Do not add sound.

---

## 4. Architecture & performance requirements

Read this section twice. It is why the app survives a viral spike.

### 4.1 The precomputed-snapshot architecture

Nothing personal is computed at request time. An **offline pipeline** (§12, run locally by a lead)
reads the auth-hub Postgres + WhatsApp exports and writes one JSONB snapshot per member into the
auth-hub database (new additive tables, §11). The app then has exactly two data surfaces:

1. **Public path** (`/`, `/wrapped`, public share cards): statically rendered at build time from
   `lib/content/chapter.ts`. **Zero runtime DB dependency.** If Neon is down, the public experience
   is untouched.
2. **Personal path**: after magic-link verification, `GET /api/me` does **one** query —
   `SELECT data FROM wrapped_snapshots WHERE lower(email) = $1` (hits the expression index) — and
   the client holds the snapshot in memory for the whole session. Personal share cards re-read the
   same single row.

### 4.2 Latency budgets & mechanics (enforce all of these)

| Surface | Budget | Mechanism |
|---|---|---|
| Landing / player first paint | LCP < 1.8s on mid-range Android | static prerender, zero blocking fetch, self-hosted variable font with swap |
| Client JS | < 190 KB gzipped app JS | no UI libraries; single player bundle; `next/dynamic` ONLY for `chapter-grid`, `live-card`, `debug/cards` |
| Shader layer | steady 60 fps; init < 80 ms; ≤ 8 KB GLSL | raw WebGL2 fullscreen triangle (no three.js), DPR capped 1.5, auto-degrade then auto-off per §3.7 gates |
| Live-card export | ≤ 3.5 s total on a 2023 mid-range phone | half-res GL upscaled, 30 fps fixed-step, lazy-loaded module |
| Story advance | 0 added latency | all 10 stories mount in one client tree; images preloaded one story ahead (§6.6) |
| `/api/me` | < 120 ms p95 | Neon serverless HTTP driver (no TCP handshake per invocation), single indexed query, session verified locally via `jose` (no DB hit for auth) |
| Auth verify redirect | < 200 ms | JWT verify + one SELECT + Set-Cookie + 302 |
| Public share cards | CDN hit ≈ 0 ms origin | `Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800` |
| Personal share cards | < 900 ms cold | satori render ~1080×1920; fonts loaded from `assets/fonts` at module scope (cached across warm invocations); `Cache-Control: private, no-store` |
| Magic link email | non-blocking UX | fire Resend call, respond immediately; UI says "check your inbox" regardless |

Additional rules:
- **Images**: all event/people photography served via `next/image` with explicit `sizes`
  (`(max-width: 480px) 100vw, 420px`), AVIF/WebP auto. Source files must be ≤ 400 KB (§14.1).
- **DB connections**: the app uses `@neondatabase/serverless` `neon()` HTTP queries only — never a
  pool, never `pg` (that's pipeline-only). Vercel functions + pooled connection string.
- **No client-side data waterfalls**: the player calls `/api/me` once, in parallel with first
  paint; public stories never wait on it.
- **Rate limiting** magic-link requests: fixed-window, 3 requests/email/hour + 20/IP/hour, in-memory
  `Map` (single-region deployment makes this acceptable; do not add Redis).
- **Analytics**: `@vercel/analytics` `track()` on: `story_view {id}`, `share {id}`,
  `magiclink_request`, `magiclink_verified {member}`. Nothing else. Never track email addresses.

### 4.3 Rendering strategy per route

| Route | Strategy |
|---|---|
| `/` | static (prerendered) |
| `/wrapped` | static shell; client player; personal data hydrates in |
| `/api/me` | node runtime, `dynamic = "force-dynamic"` |
| `/api/auth/*` | node runtime, force-dynamic |
| `/api/share/[storyId]` | node runtime (needs `fs` for fonts); public cards set CDN cache headers |
| `/debug/cards` | `notFound()` in production (`process.env.NODE_ENV === "production" && !process.env.ALLOW_DEBUG`) |

---

## 5. Shared primitives

### 5.1 `lib/snapshot.ts` — THE data contract (pipeline writes it, app reads it)

```ts
import { z } from "zod";

export const ClubId = z.enum(["builder", "connector", "observer", "sprinter"]);
export type ClubId = z.infer<typeof ClubId>;

export const SnapshotSchema = z.object({
  version: z.literal(1),
  name: z.string(),            // full_name from users table
  firstName: z.string(),       // first token of name, for copy
  joinDate: z.string(),        // ISO date
  joinMonthLabel: z.string(),  // e.g. "September 2024" — precomputed, copy uses it verbatim
  tenureMonths: z.number().int().min(0),
  isNewMember: z.boolean(),    // joined after 2026-03-01
  events: z.object({
    checkins: z.number().int().min(0),
    registrations: z.number().int().min(0),
    titles: z.array(z.string()).max(8),  // most recent first, for the ticker list
    firstEventTitle: z.string().nullable(),
  }),
  messages: z.discriminatedUnion("matched", [
    z.object({
      matched: z.literal(true),
      count: z.number().int().min(0),
      activeDays: z.number().int().min(0),
      peakMonthLabel: z.string().nullable(), // e.g. "November"
    }),
    z.object({ matched: z.literal(false) }),
  ]),
  standing: z.object({
    percentile: z.number().int().min(1).max(100), // 1 = top 1%
    tier: z.enum(["top1", "top5", "top10", "top25", "member"]),
  }),
  club: z.object({
    id: ClubId,
    rarityPct: z.number().int().min(1).max(100), // share of chapter in this club
  }),
  flags: z.object({
    zeroCheckins: z.boolean(),
    lowActivity: z.boolean(),  // checkins <= 1 AND (unmatched OR messages < 20)
  }),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ChapterMetaSchema = z.object({
  version: z.literal(1),
  members: z.number().int(),        // total members in the chapter (headline number)
  eventsRun: z.number().int(),
  totalCheckins: z.number().int(),
  messagesParsed: z.number().int(),
  productsShipped: z.number().int(),
  clubDistribution: z.record(ClubId, z.number()),
  computedAt: z.string(),
});
export type ChapterMeta = z.infer<typeof ChapterMetaSchema>;
```

Every reader (`/api/me`, share cards, stories) parses with `SnapshotSchema.parse` — a malformed
snapshot must fail loudly in development and fall back to the guest flow in production.

### 5.2 `lib/clubs.ts` — club metadata (rendering only; the algorithm lives in §12.5)

```ts
import type { ClubId } from "@/lib/snapshot";

export const CLUBS: Record<ClubId, {
  name: string;        // display name
  vibe: string;        // one-liner on the card
  accent: "green" | "blue" | "yellow" | "red";
  hex: string;
  pattern: "grid" | "waves" | "halftone" | "diagonals";
  role: string;        // "the role you play" line
}> = {
  builder:   { name: "BUILDER",   vibe: "Show up. Ship it. Repeat.",
               accent: "green",  hex: "#34a853", pattern: "grid",
               role: "The chapter's hands. When something exists that didn't before, you were near it." },
  connector: { name: "CONNECTOR", vibe: "The chat moves when you type.",
               accent: "blue",   hex: "#4285f4", pattern: "waves",
               role: "The chapter's pulse. Conversations start, and somehow you're already in them." },
  observer:  { name: "OBSERVER",  vibe: "Sees everything. Wastes nothing.",
               accent: "yellow", hex: "#faab00", pattern: "halftone",
               role: "The chapter's quiet radar. You watch, you pick your moments, and they count." },
  sprinter:  { name: "SPRINTER",  vibe: "Zero to everywhere in one week.",
               accent: "red",    hex: "#ea4335", pattern: "diagonals",
               role: "The chapter's surge. When you switch on, the whole feed knows about it." },
};
```

### 5.3 `components/counter.tsx` — the count-up number

Props: `{ value: number; className?: string; durationMs?: number }`.
Behavior: on mount (when the parent reveal becomes active), animate from 0 to `value` over
`durationMs ?? TIMING.countUpMs` using `animate()` from `motion` with `ease: "easeOut"`, rendering
via `useMotionValue` + rounding. When `useReducedMotion()` is true, render `value` immediately.
Format with `toLocaleString("en-US")` (so 1,204 not 1204).

### 5.4 `components/initials-avatar.tsx`

Port the concept from `../GDGWebsite/components/initials-avatar.tsx`: a circle with the person's
initials, background cycling through the four GDG accents by index
(`["#4285f4","#34a853","#faab00","#ea4335"][i % 4]`), text ink. Used wherever a headshot is
missing. Size via prop `sizePx` (default 40).

---

## 6. The story engine

The heart of the app. One client component tree mounted at `/wrapped`.

### 6.1 `lib/stories.ts` — the registry (single source of truth for order and behavior)

```ts
export type StoryId =
  | "the-year" | "moments" | "built" | "people"
  | "your-events" | "standing" | "your-chapter" | "your-club"
  | "whats-next" | "summary";

export interface StoryDef {
  id: StoryId;
  index: number;            // 0-based order
  personal: boolean;        // needs snapshot (or renders invitation/guest variant)
  accent: "blue" | "red" | "yellow" | "green" | "club"; // "club" = story 8 resolves at runtime
  field: "ink" | "cream";   // background field
  setupMs: number;          // TIMING.setupMs unless noted
  revealMs: number;         // per-story reveal duration (TIMING values)
  label: string;            // chapter-grid + progress caption, e.g. "The Year"
}

export const STORIES: StoryDef[] = [
  { id: "the-year",     index: 0, personal: false, accent: "blue",   field: "ink",   setupMs: 3500, revealMs: 7000,  label: "The Year" },
  { id: "moments",      index: 1, personal: false, accent: "red",    field: "cream", setupMs: 3500, revealMs: 12000, label: "The Moments" },
  { id: "built",        index: 2, personal: false, accent: "blue",   field: "ink",   setupMs: 3500, revealMs: 9000,  label: "What We Built" },
  { id: "people",       index: 3, personal: false, accent: "yellow", field: "cream", setupMs: 3500, revealMs: 14000, label: "The People" },
  { id: "your-events",  index: 4, personal: true,  accent: "blue",   field: "ink",   setupMs: 3500, revealMs: 8000,  label: "Your Events" },
  { id: "standing",     index: 5, personal: true,  accent: "red",    field: "cream", setupMs: 3500, revealMs: 8000,  label: "Your Standing" },
  { id: "your-chapter", index: 6, personal: true,  accent: "green",  field: "ink",   setupMs: 3500, revealMs: 8000,  label: "Your Chapter" },
  { id: "your-club",    index: 7, personal: true,  accent: "club",   field: "ink",   setupMs: 4000, revealMs: 10000, label: "Your Club" },
  { id: "whats-next",   index: 8, personal: false, accent: "green",  field: "cream", setupMs: 3000, revealMs: 7000,  label: "What's Next" },
  { id: "summary",      index: 9, personal: true,  accent: "green",  field: "ink",   setupMs: 0,    revealMs: 0,     label: "Your Card" },
];
```

Story 3 note: registry accent is `blue` but the status chips use each product's own color (§9.3).
Story 10 (`summary`) has `setupMs: 0, revealMs: 0` — it does **not** auto-advance; it is the resting
end state with the share CTA.

### 6.2 `use-story-state.ts` — the state machine

State (a reducer — do not use multiple `useState`s):

```ts
interface EngineState {
  storyIndex: number;          // 0..9
  phase: "setup" | "reveal";
  paused: boolean;
  gridOpen: boolean;
  seen: boolean[];             // per story, persisted to sessionStorage("wrapped-seen")
}
```

Actions and exact semantics:

| Action | Behavior |
|---|---|
| `NEXT` | setup→reveal of same story; reveal→setup of story+1; from story 9 (`summary`) do nothing (end state). Marks story seen. |
| `PREV` | reveal→setup of same story; setup→setup of story−1; at story 0 setup, restart its setup timer. |
| `GOTO(i)` | jump to story i, phase `setup` (from the chapter grid); closes grid. |
| `PAUSE` / `RESUME` | freeze/unfreeze the phase timer (see timer rules). |
| `OPEN_GRID` / `CLOSE_GRID` | grid implies paused; closing resumes. |
| `TICK_DONE` | timer elapsed → same as NEXT. |

Timer rules (implement exactly):
- One `requestAnimationFrame` loop (not `setInterval`) accumulates elapsed time per phase; store
  `elapsedMs` in a ref, expose progress `0..1` for the progress bar via a callback ref — **do not
  put per-frame progress in React state** (that re-renders 60×/s; unacceptable).
- Pausing stops accumulation; resuming continues from the same elapsed value.
- `document.visibilitychange` → auto-pause when hidden, stay paused on return.
- On `summary` (durations 0) the loop idles.

URL sync: on story change, `history.replaceState` with `?story=<id>`. On mount, if `?story=` is a
valid id, `GOTO` that index. This gives shareable deep links like `/wrapped?story=your-club`
without page reloads.

### 6.3 `tap-zones.tsx` — gestures

Full-stage transparent layer (below the progress/header UI, above story content):

- **Tap right ⅔** → `NEXT`. **Tap left ⅓** → `PREV`.
- **Press-and-hold ≥ 250 ms** anywhere → `PAUSE` (release → `RESUME`). Distinguish from taps: on
  pointerdown start a 250 ms timeout; if pointerup earlier, it's a tap.
- **Swipe down > 80 px** → `OPEN_GRID`.
- Keyboard (desktop): `ArrowRight`/`Space` = NEXT, `ArrowLeft` = PREV, `Escape` = grid toggle,
  `M` = mute-independence not applicable (no audio — do not add audio).
- While paused, show a `t-label` "PAUSED" chip fading in at top-center below the progress bars.

### 6.4 `story-frame.tsx` — the 9:16 stage

```
<div className="fixed inset-0 grid place-items-center bg-ink">
  <div className="stage relative overflow-hidden w-full h-[100dvh]
                  md:aspect-[9/16] md:h-[min(100dvh,900px)] md:w-auto md:rounded-2xl">
    {children}
  </div>
</div>
```

Plus in globals.css: `.stage { container-type: size; }` — this is what the `cqw` type units in
§3.2 resolve against. On mobile the stage is the full viewport (`100dvh` — never `100vh`, which
breaks under iOS Safari's collapsing chrome). On desktop it letterboxes to a 9:16 card, max
900 px tall, rounded, floating on ink — outside the stage stays pure `--color-ink`.

The stage's first child is `<ShaderField />` (§3.7) at `absolute inset-0 z-[1]`; the CSS field
color painted by each story (§9) sits beneath it at z-0 and doubles as the no-WebGL fallback.
Story content renders at z-10, engine UI (progress, tap zones, grid) above that.

### 6.5 `progress-bar.tsx`

Top of stage, `pt-[max(12px,env(safe-area-inset-top))] px-3`, 10 segments, 3 px tall,
`rounded-full`, gap 4 px. Colors: on ink field `bg-cream/25` track + `bg-cream` fill; on cream field
`bg-ink/20` track + `bg-ink` fill. Filled = stories before current; animating segment = current
(setup fills 0→30%, reveal fills 30→100% — one bar per story, two sub-beats); empty = after.
The active fill is driven imperatively (§6.2 callback ref sets `transform: scaleX()` on the fill
element; `transform-origin: left`). Below the bars, left-aligned: `t-label` current story label,
right-aligned: a ⊞ grid button (opens chapter grid) and, on personal stories when authenticated,
the ShareButton chip (§10.4).

### 6.6 `preloader.ts`

`preloadStoryAssets(index)` — for story `index+1`, create `new Image()` for each asset URL in that
story's manifest (export `ASSET_MANIFEST: Partial<Record<StoryId, string[]>>` from
`lib/content/chapter.ts` — Story 2 photos, Story 4 headshots). Call it whenever `storyIndex`
changes. Skip if `navigator.connection?.saveData`.

### 6.7 `chapter-grid.tsx` (lazy-loaded via `next/dynamic`)

Full-stage overlay, `bg-ink/90` + `backdrop-blur-sm`, fade in `TIMING.storyFadeMs`. A 2×5 grid of
story tiles: each tile = field-colored rounded rect (mini 9:16, `aspect-[9/16]`), story label in
`t-label`, a 1-line teaser (from `copy.grid[storyId]`), accent-colored dot, and a lock glyph on
personal stories when unauthenticated. Seen stories at full opacity; unseen at 55%. Tap → `GOTO`.
Close button top-right (×) and swipe-up also closes. This is the Wrapped-2025 "revisit key stories
without starting over" control.

### 6.8 `player.tsx` — orchestration

- Fetch `/api/me` once on mount (`useEffect`, `AbortController`); result:
  `{ member: true, snapshot } | { member: false } | error → treated as { member: false }`.
- Renders: `<StoryFrame>` → progress bar, tap zones, `AnimatePresence mode="wait"` around the
  active story component (fade+slide per §3.6), chapter grid when open.
- Story components receive `{ phase, active, snapshot | null, guest: boolean }`.
- The player owns the `ShaderField` uniform feed: on story change push
  `{ story: index, field, accentHex, patternId }` (club story resolves accent/pattern from the
  snapshot); per frame, forward the same progress value the progress bar uses to `u_progress`
  (imperative ref, same no-React-state rule as §6.2).
- While `/api/me` is in flight and the user reaches story 5 (index 4), show the story's setup beat
  anyway (it never depends on data); if still unresolved when reveal should start, hold setup until
  resolution (in practice /api/me returns in ms).
- On `member: false`, stories 5–8 render their **invitation/guest variants** (§15) — the flow
  NEVER blocks; summary renders the guest card.
- Mount `<Analytics />` tracking per §4.2.

---

## 7. `lib/copy.ts` — every line of copy (verbatim; do not rewrite, "improve", or add)

Voice: second person, confident, warm, a little cheeky, never corporate. Setup teases; reveal pays
off. `{placeholders}` are interpolated from the snapshot/chapter meta.

```ts
export const copy = {
  landing: {
    eyebrow: "GDG ON CAMPUS BABCOCK",
    title: "WRAPPED",
    year: "2025–26",
    sub: "The year the chapter shipped, showed up, and showed off. Now it's your turn to see where you fit in it.",
    ctaWatch: "Watch the year",
    ctaPersonal: "Get your Wrapped",
    emailLabel: "Your email",
    emailPlaceholder: "you@school.edu",
    emailSubmit: "Send my link",
    emailSent: "Check your inbox. Your Wrapped is waiting.",
    emailHint: "We'll email you a magic link. No password, no signup.",
  },
  theYear: {
    setup: "What a year.",
    setupSub: "No, really. Look at the receipts.",
    revealLabel: "GDG BABCOCK · 2025/26",
    rows: [
      { label: "EVENTS RUN", key: "eventsRun" },
      { label: "MEMBERS", key: "members" },
      { label: "PRODUCTS SHIPPED", key: "productsShipped" },
      { label: "CHECK-INS LOGGED", key: "totalCheckins" },
      { label: "MESSAGES SENT", key: "messagesParsed" },
    ],
    footer: "ONE CHAPTER. ONE YEAR. KEEP THE RECEIPT.",
  },
  moments: {
    setup: "Some nights you just had to be there.",
    reveal: "The moments that made the year.",
  },
  built: {
    setup: "Talk is cheap.",
    setupSub: "We ship.",
    revealLabel: "SHIPPED 2025/26",
    footer: "ALL LIVE. ALL OURS.",
  },
  people: {
    setup: "None of this happened by itself.",
    reveal: "Roll credits.",
  },
  yourEvents: {
    setup: "You didn't just watch from the sidelines.",
    reveal: "You checked into {checkins} events this year.",
    revealOne: "You checked into 1 event this year. It counted.",
    sub: "Out of {registrations} you signed up for. We noticed.",
    subPerfect: "Every single one you signed up for. Flawless.",
    zeroSetup: "The room was always open.",
    zeroReveal: "{eventsRun} events happened this year.",
    zeroSub: "Next year, one of those seats has your name on it. Literally — we do check-ins.",
    guestSetup: "This part's members-only.",
    guestReveal: "Not a flex — an invitation.",
    guestSub: "Join GDG Babcock and next year this screen is about you.",
  },
  standing: {
    setup: "You showed up. Loudly.",
    setupQuiet: "We did the math on you.",
    revealTier: "TOP {percentile}%",
    revealTierSub: "of the GDG Babcock community this year, by activity.",
    sealText: "GDG BABCOCK · CERTIFIED · 25/26",
    revealStats: "You made yourself known.",
    statMessages: "MESSAGES SENT",
    statEvents: "EVENTS CHECKED IN",
    revealStatsSub: "Part of the signal, not the noise.",
    lowSub: "Quietly present. That still counts for something here.",
  },
  yourChapter: {
    setup: "You've been here longer than you think.",
    setupNew: "Some people wait years to find their people.",
    reveal: "Here since {joinMonthLabel}.",
    revealNew: "You found us in {joinMonthLabel}.",
    tenure: "{tenureMonths} months of showing up.",
    tenureUnderOne: "And you're just getting started.",
    loreBefore: "That's before {milestone} was even an idea.",
    loreNew: "Late to the year, right on time for what's next.",
  },
  yourClub: {
    setup: "Everyone plays this their own way.",
    setupSub: "We sorted the whole chapter into four clubs. Here's yours.",
    revealPrefix: "YOU'RE A",
    rarity: "{rarityPct}% OF THE CHAPTER",
    guestNames: "BUILDER · CONNECTOR · OBSERVER · SPRINTER",
    guestLine: "Four clubs. Every member belongs to one. Which one are you? Join and find out next year.",
  },
  whatsNext: {
    setup: "This isn't an ending.",
    revealTitle: "THE 100 IS LIVE.",
    revealSub: "100 students shaping Babcock, documented for good — built by this chapter. And a new leadership era starts now.",
    ctaHundred: "See The 100",
    ctaJoin: "Join GDG Babcock",
  },
  summary: {
    title: "WRAPPED 25/26",
    memberSince: "MEMBER SINCE",
    club: "CLUB",
    standing: "STANDING",
    standingValue: "TOP {percentile}%",
    standingValueMember: "PRESENT & COUNTED",
    statEvents: "EVENTS",
    statMessages: "MESSAGES",
    statMonths: "MONTHS IN",
    share: "Share your card",
    download: "Save image",
    replay: "Watch again",
    guestTitle: "THE YEAR GDG BABCOCK SHIPPED",
    guestSub: "Be on this card next year.",
    guestCta: "Join the chapter",
  },
  grid: {
    "the-year": "The receipts.",
    moments: "You had to be there.",
    built: "Five products. All live.",
    people: "Roll credits.",
    "your-events": "Your attendance record.",
    standing: "Where you rank.",
    "your-chapter": "Your era.",
    "your-club": "Which club are you?",
    "whats-next": "The 100 is live.",
    summary: "Your card.",
  },
  email: {
    subject: "Your GDG Wrapped is ready",
    heading: "Your year, wrapped.",
    body: "Tap the button to unlock your personal GDG Babcock Wrapped — your events, your standing, your club.",
    button: "Open my Wrapped",
    expiry: "This link works for 15 minutes. If it expires, just request a new one.",
    ignore: "If you didn't request this, you can safely ignore this email.",
  },
  errors: {
    linkExpired: "That link has expired. Request a fresh one — it takes ten seconds.",
    generic: "Something hiccuped. Try again.",
    dbDown: "Your personal stories are having a moment. The chapter's year still plays — try yours again in a bit.",
  },
} as const;
```

Interpolation helper (put in `lib/copy.ts`):

```ts
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
```

Variant selection rules (the component logic, spelled out):
- **Story 5**: `guest` → guest lines; `flags.zeroCheckins` → zero lines; `checkins === 1` →
  `revealOne`; `checkins === registrations && checkins > 0` → `subPerfect`; else reveal + sub.
- **Story 6**: tier `top1|top5|top10|top25` → stamp treatment with `revealTier`
  (percentile displays as the tier number: 1, 5, 10, 25); tier `member` → stats treatment;
  if unmatched messages AND zeroCheckins → `lowSub` replaces `revealStatsSub`. Guests never see
  this story — it is removed from their story list entirely (§15).
- **Story 7**: `isNewMember` → `setupNew/revealNew/loreNew`; `tenureMonths < 12` → `tenureUnderOne`
  instead of `tenure`. `{milestone}` resolution: joined before 2025-09-01 → "ORBIT"; before
  2026-01-01 → "DevFest"; else → "The 100". Guests never see this story either (§15).
- **Story 8**: guest → `guestNames/guestLine` with all four card backs face down.

---

## 8. Chapter content & landing page

### 8.1 `lib/content/chapter.ts`

All chapter-wide content, typed and exported. **Numbers marked `TBD` are placeholders the
organizer confirms before launch** (§14.4) — build with these values so the experience is complete:

```ts
export const CHAPTER = {
  members: 500,          // TBD-confirm
  eventsRun: 23,         // TBD-confirm
  productsShipped: 5,
  totalCheckins: 1400,   // TBD-confirm (pipeline report will supply the real value)
  messagesParsed: 13000, // TBD-confirm (pipeline report will supply the real value)
} as const;

export interface Moment {
  id: string; title: string; caption: string; images: string[]; // /moments/<id>/NN.jpg
}
export const MOMENTS: Moment[] = [
  { id: "orbit",   title: "ORBIT",          caption: "The flagship. A full first-semester arc.", images: ["/moments/orbit/01.jpg", "/moments/orbit/02.jpg", "/moments/orbit/03.jpg"] },
  { id: "devfest", title: "DEVFEST",        caption: "The big one. Babcock showed up.",          images: ["/moments/devfest/01.jpg", "/moments/devfest/02.jpg"] },
  { id: "games",   title: "GAME NIGHTS",    caption: "Competitive. Unnecessarily so.",           images: ["/moments/games/01.jpg", "/moments/games/02.jpg"] },
  { id: "spaces",  title: "TWITTER SPACES", caption: "The conversations that ran too long.",     images: ["/moments/spaces/01.jpg"] },
];

export const PRODUCTS = [
  { num: "01", name: "GDG WEBSITE",  color: "blue",   url: "gdgbabcock.com" },
  { num: "02", name: "BABCOCKVOTES", color: "green",  url: "babcockvotes.com" },
  { num: "03", name: "RADAR",        color: "blue",   url: "radar.gdgbabcock.com" },
  { num: "04", name: "ORBIT",        color: "red",    url: "orbit.gdgbabcock.com" },
  { num: "05", name: "BABCOCK 100",  color: "yellow", url: "babcock100.com" },
] as const;

export interface Person { name: string; role: string; section: string; photo: string | null; }
// SECTIONS order is fixed: CORE, TRACKS, DEV, MEDIA, EVENTS
export const PEOPLE: Person[] = [ /* §14.3 tells you exactly how to fill this from the CSV */ ];

export const ASSET_MANIFEST: Partial<Record<string, string[]>> = {
  moments: MOMENTS.flatMap((m) => m.images),
  people: [], // fill with PEOPLE photos once §14.3 is done
};
```

### 8.2 `app/page.tsx` — the landing

Ink field, statically rendered. Layout top→bottom, centered column, `max-w-sm mx-auto px-6`:

1. `t-label` eyebrow: `copy.landing.eyebrow`, cream at 55%.
2. The word **WRAPPED** in outlined cream (`.text-outline-base .text-outline-cream`), sized
   `clamp(4rem, 22vw, 9rem)`, one line.
3. Directly under it, `2025–26` in solid `--color-gdg-blue`, `t-display` sized down (~0.4×), same
   x-position — the only accent on the page.
4. `t-body` sub line, cream 75%.
5. Primary CTA (link to `/wrapped`): pill, `bg-cream text-ink`, `rounded-full px-8 py-4 t-label` —
   `copy.landing.ctaWatch`. (This is the GDGWebsite primary-button convention.)
6. Secondary: `copy.landing.ctaPersonal` — pill, `border border-cream/40 text-cream`, opens an
   inline email form (input + submit → `POST /api/auth/request`); on success swap the form for
   `copy.landing.emailSent` in `t-body` + green check glyph. Show `emailHint` under the input.
7. Footer, `t-label` at 35%: "BUILT BY GDG ON CAMPUS BABCOCK · 2026".

A slow marquee strip (reuse GDGWebsite's `.animate-marquee` keyframes: translateX 0→−50%, 40 s
linear infinite, content duplicated twice) runs behind the title at 6% opacity, `t-label` scale
text: `ORBIT · DEVFEST · RADAR · BABCOCK 100 · GAME NIGHTS · 500+ MEMBERS · `.

If the visitor already has a session cookie, still render the same page (the player handles data).

---

## 9. Story-by-story screen specifications

Universal rules first:
- Every story component signature: `function Story({ phase, active, snapshot, guest }: StoryProps)`.
- **Setup beat**: near-empty frame, one or two lines centered, generous negative space. Line 1
  enters with the standard entrance (§3.6); line 2 (if any) enters +240 ms later at 55% opacity.
  Setup screens have NO share button and NO numbers.
- **Reveal beat**: the payoff. Numbers count up. This is the screen the share card mirrors.
- All content sits inside `px-6 pt-20 pb-16` within the stage (clear of progress bar and safe areas).
- Field colors per registry (§6.1): ink stories = `bg-ink text-cream`; cream = `bg-cream text-ink`.

### 9.1 Story 1 — The Year · "the receipt" (ink, blue)

**Setup**: `copy.theYear.setup` in `t-display` cream, centered; `setupSub` in `t-body` below.
Behind the text, "2025/26" repeats in a single marquee line, outlined cream at 4% opacity,
font-size ~30cqw.
**Reveal**: a till-receipt panel: `bg-paper text-ink rounded-sm mx-4 px-5 py-6`, with `.perforation`
strips top and bottom (they punch ink-colored holes). Content: `revealLabel` in `t-label` centered
with a dashed rule under it; then one row per `copy.theYear.rows` entry:
`[VALUE][.leader dotted line][LABEL]` — value in `t-stat` with `<Counter>`, label in `t-label`
right-aligned. Rows stagger in by `TIMING.staggerMs`. Values come from `CHAPTER`
(`eventsRun, members, productsShipped, totalCheckins, messagesParsed` — members renders as
`500+`: append "+" via suffix prop on Counter). Footer: `copy.theYear.footer` in `t-label`
centered under a second dashed rule. The receipt panel enters with `SPRING.default` from
`y: 40, rotate: -1.5deg` to `y: 0, rotate: -0.5deg` (it rests slightly tilted). Accent: the row
values' counters flash `--color-gdg-blue` for 300 ms as each finishes counting, then settle to ink.

### 9.2 Story 2 — The Moments · "the scrapbook" (cream, red)

**Setup**: `copy.moments.setup` in `t-editorial` ink, centered on cream. A strip of
`--color-gdg-red` "masking tape" (a 90×28 px rounded-sm div, rotate −4°, opacity 0.9) sits above
the text like it's taping the line to the page.
**Reveal**: a photo-stack. All images from `MOMENTS[].images` flattened into one deck of "prints":
each print = `next/image` in a `bg-paper p-2 pb-8 shadow-lg rounded-sm` frame (polaroid), rotated
alternately −3°/+2.5°/−1.5°, stacked with the active print on top. Every 1.8 s the top print flicks
away (`SPRING.photo`, exit `x: 120%, rotate: 12deg`, opacity→0) revealing the next; loop the deck.
Under the stack: the active moment's `title` in `t-display` (ink, solid) and `caption` in
`t-editorial`, cross-fading with each print change. A red tape strip anchors each print's top edge.
While **paused**, the deck fans out: prints spread to a loose arc (`x: (i-center)*18%`,
`rotate: (i-center)*6deg`) so the user can see several at once; resuming restacks.
Images get `sizes="(max-width: 480px) 90vw, 380px"`. Duotone: wrap prints in a div with
`bg-ink` and set image `opacity-90 contrast-105 saturate-[0.85]` via Tailwind classes — warm,
slightly desaturated, consistent (do NOT use css `filter: grayscale(1)` full duotone; keep faces
natural).

### 9.3 Story 3 — What We Built · "the index" (ink, four-color chips)

**Setup**: `copy.built.setup` in `t-display` cream; beat; `setupSub` ("We ship.") slams in
`t-display` outlined cream (`.text-outline-cream`) 240 ms later with `SPRING.stamp`.
**Reveal**: `revealLabel` eyebrow in `t-label` cream 55%. A table-of-contents list of `PRODUCTS`:
each row = `num` in tabular monospaced style (use `font-variant-numeric: tabular-nums`, cream 40%),
product `name` in `t-stat` cream, and a status chip (`rounded-full px-2.5 py-0.5 t-label` scaled
85%, `LIVE`, background = the product's GDG color, text ink for yellow/green, cream for blue/red —
the ecosystem PILL convention). Rows stagger in. Then an "active row" highlight cycles down the
list every 1.4 s: the active row's name swells to 1.06 scale and full opacity while others sit at
70%; its chip pulses once (scale 1→1.15→1, 300 ms). Footer: `copy.built.footer` `t-label` cream 55%.

### 9.4 Story 4 — The People · "the credits" (cream, yellow)

**Setup**: `copy.people.setup` in `t-editorial` ink centered.
**Reveal**: a film-credits roll. `copy.people.reveal` ("Roll credits.") holds at top in `t-display`
ink for 1 s, then shrinks to a `t-label` eyebrow pinned top-left, and the roll begins: a vertical
auto-scroll (CSS `transform: translateY` animation over `TIMING.peopleMs`, linear) of the `PEOPLE`
list grouped by section in fixed order CORE → TRACKS → DEV → MEDIA → EVENTS. Each section: header
in `t-label` ink 55% with a 2 px `--color-gdg-yellow` underline that sweeps in (scaleX 0→1, 400 ms,
`transform-origin: left`); people as rows of 36 px circular headshot (`next/image`, or
`InitialsAvatar` fallback) + name in `t-body` font-weight 700 + role in `t-label` ink 45%.
**Pause freezes the roll** (`animation-play-state: paused` toggled by the `paused` prop) so names
are actually readable — this is the point of the story. If the roll finishes before the timer,
hold the final frame ("…and everyone who showed up." in `t-editorial`, centered).

### 9.5 Story 5 — Your Events · "the numeral" (ink, blue) — PERSONAL

**Setup**: `copy.yourEvents.setup` in `t-display` cream.
**Reveal (standard)**: the check-in count as a **monument**: `t-monument` outlined blue
(`.text-outline-base .text-outline-blue`), centered, ~70% of frame height. It does not count up —
it *lands*: `SPRING.stamp` scale 1.4→1 with opacity 0→1 (a monument arrives; it doesn't tick).
Under it: `copy.yourEvents.reveal` with the number bolded inline (`fmt`), `t-body` cream; then
`sub`/`subPerfect` in `t-body` cream 55%. Then `snapshot.events.titles` (max 5 shown) tick in as a
stacked `t-label` list, staggered, each prefixed by a 6 px blue square.
**Reveal (zero check-ins)**: NO numeral. An outlined-blue ticket shape (SVG: rounded rect
280×140 with two notches, dashed inner border, "ADMIT ONE" in `t-label`) floats center with a slow
2° rotate oscillation (4 s ease-in-out infinite alternate). Copy: `zeroReveal` with `<Counter>` on
`{eventsRun}`, then `zeroSub`. Tone: door held open, zero guilt.
**Reveal (guest)**: `guestSetup/guestReveal/guestSub` + a cream pill CTA "Join GDG Babcock" →
`https://gdgbabcock.com`. (§15 consolidates guest behavior.)

### 9.6 Story 6 — Your Standing · "the stamp" (cream, red) — PERSONAL

**Setup**: tier members get `copy.standing.setup` ("You showed up. Loudly."); tier `member` gets
`setupQuiet` ("We did the math on you."). `t-display` ink.
**Reveal (tiers top1/top5/top10/top25)**: the flex card. `revealTier` → "TOP 1%" (tier number) in
`t-monument` scaled ~0.7, solid `--color-gdg-red`, slammed on with `SPRING.stamp` from
`scale: 1.6, rotate: -8deg, opacity: 0` to `scale: 1, rotate: -2deg, opacity: 1` — it rests at −2°
like a rubber stamp. Grain does the texture (no extra assets). Around it a circular seal: SVG
circle r=54 dashed `stroke-ink/30` with `copy.standing.sealText` on a `<textPath>` around the top
arc, rotating extremely slowly (60 s linear infinite). Under: `revealTierSub` in `t-body` ink 65%.
**Reveal (tier member)**: two stacked stat blocks, ink on cream: `<Counter>` of messages count over
`statMessages` label, and check-ins over `statEvents` (omit the messages block entirely when
`messages.matched === false`; center the events block). Headline `revealStats` in `t-display`;
`revealStatsSub` (or `lowSub` per §7 rules) beneath. **A percentile NEVER appears on this variant.**

### 9.7 Story 7 — Your Chapter · "the timeline" (ink, green) — PERSONAL

**Setup**: `setup` / `setupNew` in `t-display` cream.
**Reveal**: `copy.yourChapter.reveal` with `{joinMonthLabel}` in `t-editorial` cream — the one
editorial line. Below, a horizontal timeline: 2 px cream/25 line drawing itself left→right (scaleX
0→1, 900 ms ease-out); milestone nodes tick in as it passes them: 8 px `--color-gdg-green` circles
with `t-label` captions beneath (fixed milestones: `SEP '25 ORBIT`, `NOV '25 DEVFEST`,
`MAY '26 THE 100`, `JUL '26 WRAPPED`). The member's join point renders as a cream flag glyph
(12×16 SVG pennant) planted ON the line. The visible line spans the wrapped year (Sep 2025 at the
left edge → "NOW" at the right edge); the flag sits at the join date's proportional position within
that span. If the member joined before Sep 2025, the flag sits at the far-left edge and the line
visibly extends off-frame to the left — the visual statement that they predate the window. Under the timeline:
`tenure`/`tenureUnderOne`, then the lore line (`loreBefore` with resolved `{milestone}` / `loreNew`)
in `t-body` cream 55%.

### 9.8 Story 8 — Your Club · "the foil card" (full-bleed club accent) — THE SHOWPIECE

The only story allowed to leave ink/cream for its field. Design it like a trading card reveal.

**Setup** (on ink): `copy.yourClub.setup` in `t-display` cream; `setupSub` in `t-body` 55%. Four
card backs (aspect 5/7, w-16, `bg-ink-2` with a 1 px cream/20 border and a small GDG four-dot motif)
shuffle in a loose row — idle animation: each oscillates y ±4 px, phase-offset 300 ms, 2 s
ease-in-out infinite.
**Reveal**: the field floods to the club's hex (`CLUBS[club.id].hex`) over 400 ms. One card flips
in center-stage: a `rotateY 180°` 3D flip (`SPRING.flip`, `transform-style: preserve-3d`,
`perspective: 1200px` on the parent, `backface-visibility: hidden` on both faces), landing at
`w-[78cqw]` max 340 px, aspect 5/7, `rounded-2xl`, `bg-ink`, border `1px solid rgba(255,246,224,0.25)`.
Card face composition (top→bottom, `p-5`):
  - `t-label` row: `copy.yourClub.revealPrefix` ("YOU'RE A") left; club monogram (first letter,
    outlined in club accent) right.
  - Patterned field (h-[34%] rounded-lg, the club pattern in accent at 25% opacity on ink —
    patterns defined below).
  - Club `name` in `t-display` solid accent hex, tight.
  - `vibe` in `t-editorial` cream.
  - `role` in `t-body` cream 65%, 2 lines max.
  - Bottom row: rarity badge — `t-label` in ink on an accent chip, `fmt(copy.yourClub.rarity,
    {rarityPct})`, clipped into a folded-corner shape (`clip-path: polygon(0 0, 100% 0, 100% 70%,
    92% 100%, 0 100%)`).
**Foil tilt**: on pointermove over the card, tilt `rotateX/rotateY` up to ±7° toward the pointer
(spring-smoothed), plus a `linear-gradient(115deg, transparent 40%, rgba(255,246,224,0.18) 50%,
transparent 60%)` sheen whose `background-position` follows the pointer. On touch devices use
`deviceorientation` if permission-free, else skip — never request motion permission.
**Patterns** (pure CSS, add to globals.css as utility classes; accent color via `currentColor`):
  - `.pattern-grid`: `background-image: linear-gradient(currentColor 1px, transparent 1px),
    linear-gradient(90deg, currentColor 1px, transparent 1px); background-size: 14px 14px;`
  - `.pattern-waves`: `background-image: repeating-radial-gradient(circle at 0 120%, transparent 0,
    transparent 18px, currentColor 18px, currentColor 19px);`
  - `.pattern-halftone`: `background-image: radial-gradient(circle, currentColor 1.6px,
    transparent 2px); background-size: 12px 12px;`
  - `.pattern-diagonals`: `background-image: repeating-linear-gradient(45deg, currentColor 0,
    currentColor 2px, transparent 2px, transparent 12px);`
**Guest variant**: stays on ink; the four card backs line up face-down with the club names under
them in `t-label` (`guestNames`), `guestLine` in `t-body`, join CTA pill.

### 9.9 Story 9 — What's Next · "the door" (cream, green)

**Setup**: `copy.whatsNext.setup` in `t-editorial` ink.
**Reveal**: `revealTitle` ("THE 100 IS LIVE.") in `t-display` outlined green
(`.text-outline-base .text-outline-green`) — on the cream field outlined type reads as engraved.
An upward arrow glyph (SVG chevron-up 48×48, `--color-gdg-green`) rises slowly beneath it
(y: 8→−8 px, 3 s ease-in-out infinite alternate). `revealSub` in `t-body` ink 65%. Two pill CTAs:
primary `bg-ink text-cream` → `copy.whatsNext.ctaHundred` linking `https://babcock100.com`;
secondary `border border-ink/30 text-ink` → `ctaJoin` linking `https://gdgbabcock.com`. Calm story:
no other animation. This is the exhale after the club high.

### 9.10 Story 10 — Summary · "the membership card" (ink) — the end state

No setup/reveal split; no auto-advance. Center-stage: the summary card at `w-[82cqw]` max 360 px,
`aspect-[9/14]` (taller than the club card), `bg-cream text-ink rounded-2xl p-5`, entering with
`SPRING.default` from y: 24. Composition top→bottom:
  1. Header row: four 8 px GDG-color dots left; `copy.summary.title` in `t-label` right.
  2. `snapshot.name` in `t-display` (auto-shrink: if > 16 chars use 0.8×, > 24 chars 0.65×).
  3. Divider 1 px ink/14.
  4. Three labeled fields in a column, each `t-label` ink 45% caption over `t-stat`-scaled-0.6
     value: `memberSince` → joinMonthLabel; `club` → club name in its accent hex; `standing` →
     `standingValue` (tiers) or `standingValueMember`.
  5. Stats row (3 columns): `statEvents` → checkins, `statMessages` → count (omit column when
     unmatched), `statMonths` → tenureMonths.
  6. Bottom: a decorative barcode (18 vertical ink bars of pseudo-random widths derived from the
     member name's char codes — deterministic per member) with "GDG·BABCOCK·2025–26" in `t-label`
     under it.
Under the card, two buttons: primary cream pill `copy.summary.share` (ShareButton for `summary`);
ghost `copy.summary.replay` → `GOTO(0)`. Guest variant: card shows `guestTitle`, the chapter's
`CHAPTER` numbers in the stats row, `guestSub` + `guestCta` linking gdgbabcock.com.

---

## 10. Share cards

### 10.1 Principles

Two tiers:

1. **Baseline (every story): server-rendered PNG** with `next/og` (`ImageResponse`) — never
   client html-to-image (fragile with SVG filters and iOS canvas limits). Cards are 1080×1920,
   bolder and simpler than the screens: satori cannot run the SVG-filter outline, so outlined type
   on cards uses satori's supported `WebkitTextStroke: "6px <color>"` with
   `color: "transparent"` — if a card looks muddy, prefer solid type; cards must be legible as a
   thumbnail.
2. **Flagship (your-club + summary): client-rendered LIVE CARDS** — 3-second animated video
   exports of the actual shader-driven card (§10.6). This is the share that beats a static
   Wrapped screenshot: the foil moves in people's feeds. The PNG tier remains the automatic
   fallback whenever recording or file-sharing is unsupported.

### 10.2 Fonts for satori

Place TTFs in `assets/fonts/` (§14.2). Load once at module scope in the route file:

```ts
import fs from "node:fs";
import path from "node:path";
const fontsDir = path.join(process.cwd(), "assets/fonts");
const googleSansBold = fs.readFileSync(path.join(fontsDir, "GoogleSans-Bold.ttf"));
const googleSansMedium = fs.readFileSync(path.join(fontsDir, "GoogleSans-Medium.ttf"));
const bricolageItalic = fs.readFileSync(path.join(fontsDir, "BricolageGrotesque-Italic.ttf"));
```

Pass all three in `ImageResponse`'s `fonts` array (`name: "Google Sans", weight: 700` /
`weight: 500` / `name: "Bricolage", style: "italic"`).

### 10.3 `app/api/share/[storyId]/route.tsx`

- `GET`, `{ params: { storyId } }`. Validate storyId against the registry; 404 otherwise.
- **Public cards** (`the-year`, `moments`, `built`, `people`, `whats-next`): render from `CHAPTER` /
  static content. Headers: `Cache-Control: public, max-age=86400, s-maxage=86400,
  stale-while-revalidate=604800`.
- **Personal cards** (`your-events`, `standing`, `your-chapter`, `your-club`, `summary`): read the
  `wrapped_session` cookie (via `next/headers` `cookies()`); no valid member session → 401 JSON.
  Fetch snapshot by session email, render the member variant. Headers:
  `Cache-Control: private, no-store`.
- Size `{ width: 1080, height: 1920 }`.

Card layouts live in `components/share/card-layouts.tsx` as plain functions returning satori-safe
JSX (only `div`/`img`/`span` with explicit `display: flex` on every multi-child div — satori
requires it). One layout per story + summary, each visually echoing §9 but flattened:

| Card | Composition (all on ink `#0f0f0f` unless noted) |
|---|---|
| `the-year` | cream receipt panel centered on ink, same rows as §9.1 with final values, "GDG BABCOCK WRAPPED 25/26" footer |
| `moments` | cream field; 3 rotated paper frames fanned (use solid `--color-cream-deep` rects — no photos on cards, keeps them fast and rights-safe); "SOME NIGHTS YOU HAD TO BE THERE." in big ink type |
| `built` | the five-product index list with color chips; "ALL LIVE. ALL OURS." |
| `people` | "ROLL CREDITS." huge cream; section names listed in `t-label` style; yellow underlines |
| `your-events` | the monument number in stroked blue (WebkitTextStroke 8px), "{firstName} checked into N events" in cream; zero-variant: ticket motif + "{eventsRun} events happened. 26/27 has my name on it." |
| `standing` (tiers) | "TOP N%" in red at −2°, seal ring, "GDG BABCOCK COMMUNITY · 25/26"; (member) two stat blocks on cream |
| `your-chapter` | "HERE SINCE {joinMonthLabel}" cream + green timeline strip with flag |
| `your-club` | the full trading card from §9.8 at card scale on the club's hex field — pattern, name, vibe, rarity badge. THE flagship share. |
| `whats-next` | cream; "THE 100 IS LIVE." outlined-style green stroke; arrow |
| `summary` | the §9.10 membership card, full-bleed cream on ink with name, club (accent), standing, stats, barcode |

Every card carries the watermark row bottom-center: four 10 px GDG dots + "wrapped.gdgbabcock.com"
in 500-weight cream/ink at 60% — this is how the card markets the app with zero context.

### 10.4 `components/share/share-button.tsx`

Props: `{ storyId: StoryId; label?: string; variant?: "chip" | "primary" }`.

```
onClick:
  res = await fetch(`/api/share/${storyId}`)          // same-origin, sends cookie
  blob = await res.blob()
  file = new File([blob], `gdg-wrapped-${storyId}.png`, { type: "image/png" })
  if (navigator.canShare?.({ files: [file] }))
    await navigator.share({ files: [file], title: "GDG Wrapped 25/26" })
  else
    trigger <a download> with URL.createObjectURL(blob), then revokeObjectURL
  track("share", { id: storyId })
```

States: idle (share glyph + "Share"), loading (pulsing dots, disable), error (shake 300 ms, revert).
Chip variant lives in the story header (§6.5) on reveal screens; primary variant is the summary
CTA. AbortError from the user canceling the share sheet is silent — not an error.

### 10.5 `app/debug/cards/page.tsx`

Dev-only (§4.3). Grid of `<img>` tags hitting `/api/share/<id>` for every public card, plus every
personal card × fixture variants — implement fixtures by accepting `?fixture=<name>` on the share
route **in non-production only**: `top1`, `member`, `zero`, `newmember`, `unmatched`, and one per
club. Fixture snapshots live in `lib/fixtures.ts` (write realistic values; e.g. top1 fixture:
34 checkins, 2100 messages, sprinter, joined 2023-09).

### 10.6 Live cards — `components/share/live-card.ts` (flagship shares as video)

A 3-second seamless-loop video of the animated card, generated entirely on-device with zero
dependencies: an offscreen 1080×1920 composition canvas → `canvas.captureStream(30)` →
`MediaRecorder`.

Pipeline (implement exactly):

1. **Compose**: a hidden `<canvas width=1080 height=1920>` (2D context). Each frame:
   - Draw the background: a second, offscreen WebGL2 canvas (540×960 — half res, upscaled; the
     shader is soft, nobody can tell) running the SAME fragment shader from §3.7 with
     `u_story = 7` (club) or `9` (summary), `u_pointer` on a scripted orbit
     (`0.5 + 0.35*cos(t*2.1), 0.5 + 0.35*sin(t*1.7)` — this animates the foil with no user input),
     `u_fade = 1`. `ctx.drawImage(glCanvas, 0, 0, 1080, 1920)`.
   - Draw the card content with 2D canvas text on top — same composition, coordinates, and copy as
     the corresponding satori layout (§10.3 table), using `FontFace` instances loaded from the
     same font files served from `public/fonts/` (copy the three TTFs there too; wait for
     `document.fonts.load("700 90px 'Google Sans'")` etc. before the first frame).
   - Draw the watermark row.
2. **Record**: `captureStream(30)` + `new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })`
   where `mimeType` = first of `["video/mp4;codecs=avc1.42E01E", "video/mp4",
   "video/webm;codecs=vp9", "video/webm"]` passing `MediaRecorder.isTypeSupported` (Safari records
   mp4 natively; Chrome mp4 or vp9 webm — mp4 strongly preferred because WhatsApp/IG accept it
   directly). Drive frames with a fixed-step RAF loop for exactly 3.0 s (t goes 0→3, the scripted
   orbit makes t=0 and t=3 identical → seamless loop), then `recorder.stop()`.
3. **Share**: wrap the blob in `File("gdg-wrapped-club.mp4" | ".webm")`; if
   `navigator.canShare({ files: [file] })` → `navigator.share`; else download the file; and if
   `MediaRecorder` itself is unavailable → fall back to the §10.4 PNG path transparently.
4. **UX**: the club and summary ShareButtons render a two-option sheet (own component, not the OS
   sheet): "Share live card" (video, shows a 1-line "rendering… ~3s" progress state while
   recording) and "Share image" (instant PNG). Everything else uses PNG only.
5. **Budget**: the recorder module is lazy-loaded (`next/dynamic`/dynamic `import()`) only when a
   flagship share sheet opens; it must add 0 bytes to the initial player bundle.

---

## 11. Auth-hub migration (the ONLY change outside this repo)

File: `../auth/database/migrations/005_wrapped.sql` — committed to the auth repo (`main`, same
git author/style rules):

```sql
-- Wrapped 2025/26: precomputed per-member snapshots + chapter aggregates.
-- Additive and idempotent, following 003_radar.sql conventions.
-- Written by the wrapped pipeline (scripts/pipeline in the wrapped repo);
-- read by the wrapped app. The auth service itself does not use these tables.

CREATE TABLE IF NOT EXISTS wrapped_snapshots (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  year        TEXT NOT NULL DEFAULT '2025-2026',
  data        JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wrapped_meta (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wrapped_snapshots_email
  ON wrapped_snapshots (lower(email));
```

Apply it the same way the auth repo applies its other migrations (check
`../auth/scripts/` for the migration runner; if none fits, `psql "$DATABASE_URL" -f` is
acceptable — coordinate with the organizer).

---

## 12. The data pipeline (`scripts/pipeline/`)

Runs locally via `npm run pipeline` — NEVER in the deployed app. Uses `pg` +
`PIPELINE_DATABASE_URL`. Flags: `--seed` (generate + use synthetic data end-to-end, no real DB
writes unless `--write` also passed), `--dry-run` (everything except the final DB write),
`--write` (real write; requires interactive `yes` confirmation printing the target DB host).
Order of operations in `run.ts`: fetch-db → parse-whatsapp → match-members → compute-stats →
percentiles → clubs → report → (write-snapshot if allowed).

### 12.1 `fetch-db.ts`

Queries (all bounded by the year window `[WRAPPED_YEAR_START, WRAPPED_YEAR_END)`):

```sql
-- members (all active users; join date NOT window-bound)
SELECT id, email, full_name, whatsapp_number, created_at FROM users
WHERE is_active = TRUE AND deleted_at IS NULL;

-- check-ins with event titles
SELECT c.user_id, c.checked_in_at, e.title, e.starts_at
FROM event_checkins c JOIN events e ON e.id = c.event_id
WHERE c.checked_in_at >= $1 AND c.checked_in_at < $2;

-- registrations
SELECT r.user_id, r.registered_at FROM event_registrations r
WHERE r.status = 'registered' AND r.registered_at >= $1 AND r.registered_at < $2;

-- radar activity (builder signal)
SELECT user_id, COUNT(*) AS reads FROM radar_reads GROUP BY user_id;
SELECT user_id, COUNT(*) AS plays FROM radar_game_scores GROUP BY user_id;

-- events run (chapter number)
SELECT COUNT(*) FROM events WHERE status IN ('published','ended')
  AND starts_at >= $1 AND starts_at < $2;
```

### 12.2 `parse-whatsapp.ts`

Input: every `.txt` under `data/exports/` (each file = one exported group chat, "without media").
Known real-world format for this community's exports (verified against the chapter's 2023 data):
Android dialect with 4-digit years — `DD/MM/YYYY, HH:MM - Sender: message`. Support all three:

```
A1: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})\s?([ap]m)? - ([^:]+): ([\s\S]*)$/i
A2 (system, no sender-colon): /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})\s?([ap]m)? - ([\s\S]*)$/i
IOS: /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AP]M)?\] ([^:]+): ([\s\S]*)$/
```

Rules:
1. Strip U+200E/U+200F/U+202A–U+202E marks from every line before matching.
2. A line matching A1/IOS starts a new message. A line matching only A2 is a **system line — drop
   it** (joins, subject changes, "Messages and calls are end-to-end encrypted…", pinned, polls).
3. A non-matching line is a continuation of the previous message — it does NOT increment any count.
4. `<Media omitted>` / `null` (image-only) **count as messages** (sharing a photo is participation);
   strip a trailing `<This message was edited>` marker; a message whose entire body is
   "This message was deleted"/"You deleted this message" does not count.
5. Two-digit years: `20xx`. Dates are day-first. Discard messages outside the year window.
6. Sender keys: raw sender string. Normalize phone-like senders (starts with `+` or is digits/spaces/
   dashes) to digits-only; keep display-name senders as trimmed strings.
7. Emit per sender across ALL files: `{ senderKey, isPhone, messageCount, firstAt, lastAt,
   activeDayKeys: Set<yyyy-mm-dd>, monthlyCounts: Record<yyyy-mm, n> }`.
8. **Never write message bodies anywhere** — not to disk, not to logs, not to errors.

### 12.3 `match-members.ts`

- Phone senders: match `last10(sender) === last10(users.whatsapp_number)`. (`last10` = last 10
  digits; Nigerian numbers `+234803…` ↔ `0803…` collide correctly on last-10.)
- Name senders and unmatched phones → rows in `data/unmatched.csv`
  (`senderKey,messageCount,suggestion`) where `suggestion` = closest `users.full_name` by
  normalized Levenshtein similarity ≥ 0.85, else blank.
- A human fills `data/mapping.json`: `{ "<senderKey>": "<user uuid | email>" }`. Re-runs apply it.
  Multiple senders may map to one member (device changes) — sum their counts.
- Report metric: % of total message volume matched. **Gate: ≥ 80% before a real `--write` run.**

### 12.4 `percentiles.ts`

```
pct(xs, x) = fraction of members with value strictly below x   // 0..1
activityScore(m) = m.whatsappMatched
  ? 0.6 * pct(log1p(messages)) + 0.4 * pct(checkins)
  : pct(checkins)
percentile(m) = max(1, ceil(100 * (1 - rankFraction(activityScore))))
  where rankFraction = fraction of members with a LOWER score (higher score → percentile → 1)
tier: percentile ≤1 → top1; ≤5 → top5; ≤10 → top10; ≤25 → top25; else member
```

`log1p` tames the hyperactive-outlier problem (one person with 4,000 messages must not own the
curve). Ties share the better percentile.

### 12.5 `clubs.ts` — the sorting algorithm

Signals per member, each normalized to [0,1] as percentile among members (Pm among matched only):

```
Pm   = pct(log1p(messages))            // null if unmatched
Pc   = pct(checkins)
Pr   = pct(registrations)
Prad = pct(radarReads + radarPlays)
attendance  = checkins / max(registrations, checkins, 1)
consistency = activeMonths / eligibleMonths
  // activeMonth = month with ≥1 check-in or ≥5 messages
  // eligibleMonths counted from max(joinDate, yearStart) to yearEnd, min 1
burst = totalActivity >= 20 ? max over 30-day sliding windows of windowActivity/totalActivity : 0
  // activity = 10*checkins + messages, window slides by day
```

Scores:

```
builder   = 0.45*Pc + 0.20*attendance + 0.20*Prad + 0.15*consistency
connector = Pm === null ? 0 : 0.55*Pm + 0.25*consistency + 0.20*Pc
sprinter  = totalActivity < 20 ? 0 : 0.65*burst + 0.35*max(Pc, Pm ?? 0)
observer  = 0.40*(1 - (Pm ?? 0.5)) + 0.35*Pr + 0.25*(1 - burst)
```

Assignment: argmax; ties break `sprinter > builder > connector > observer`. Members with zero
activity everywhere → `observer` (their copy is warm; see §7/§15 — never shame).
**Rebalance pass**: every club must hold ≥ 8% of members. While any club is under-floor, move into
it the members (from clubs above 8%) whose winning-margin over that club is smallest; recompute;
repeat. `rarityPct` = round(100 × final club share), min 1.

### 12.6 `compute-stats.ts` + `write-snapshot.ts`

Assemble each member's `Snapshot` (§5.1) — `joinMonthLabel` via
`toLocaleDateString("en-US", { month: "long", year: "numeric" })`; `isNewMember` =
`created_at > 2026-03-01`; `events.titles` = up to 8 checked-in event titles, most recent first;
`peakMonthLabel` = month name of max monthlyCounts (null if < 10 messages). Validate every snapshot
with `SnapshotSchema.parse`. Skip members whose email appears in `data/opt-out.json` (array of
emails) — delete any existing row for them on write.
Write: single transaction; upsert per member
(`INSERT ... ON CONFLICT (user_id) DO UPDATE SET email, data, computed_at`), then upsert
`wrapped_meta` keys `chapter` (ChapterMetaSchema), `clubs` (distribution), `run`
({ at, matchRatePct, membersWritten }).

### 12.7 `seed-fake.ts`

Generates: 300 synthetic members (faker-free — use deterministic name/word lists in the file,
seeded RNG (mulberry32, seed 25026)); join dates spread 2021–2026 (15% after 2026-03-01); message
counts power-law (`floor(exp(rand()*ln(2000)))`, ~20% unmatched); check-ins 0–30 skewed low
(25% zero); a synthetic 3-file WhatsApp export in all three dialects written to
`data/exports/` (so the REAL parser code path is exercised); cohort plants: one hyperactive
outlier (4000 msgs), one perfect-attendance member, one zero-everything member. With `--seed` the
pipeline runs end-to-end on this data and prints the report.

### 12.8 `report.ts`

Prints: members processed; match rate %; club populations (must all be ≥ 8%) with 10 sample names
each; percentile histogram (10 buckets); top-10 by activity score (for lead spot-checks); chapter
totals destined for `wrapped_meta.chapter`; and — critically — the values the organizer must copy
into `lib/content/chapter.ts` (§8.1) at copy-freeze.

### 12.9 Pipeline tests (vitest — write these, they gate §17)

- `parse-whatsapp.test.ts`: fixture strings per dialect (Android 2-digit + 4-digit year, iOS with
  seconds, am/pm variants); continuation lines; system lines dropped; media counts; deleted
  doesn't; LRM stripping; window filtering.
- `match-members.test.ts`: `+234 803 123 4567` ↔ `08031234567` matches; mapping.json override;
  multi-sender merge.
- `percentiles.test.ts`: known small arrays → exact percentiles; unmatched uses checkins-only;
  outlier taming (4000-msg member doesn't push a 300-msg member below top25).
- `clubs.test.ts`: hand-built members land in expected clubs; tie-break order; rebalance floor
  invariant (`every club ≥ 8%` on a skewed population); zero-activity → observer.

---

## 13. Magic-link auth & API routes

Wrapped is **self-contained**: it mints its own tokens with `jose` and `WRAPPED_SESSION_SECRET`.
It does NOT use the platform JWT, does NOT know the auth service's `JWT_SECRET`, and requires no
auth-service code changes. Email via Resend.

### 13.1 `lib/session.ts`

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.WRAPPED_SESSION_SECRET!);

// magic-link token: 15 min
export async function signMagicToken(email: string) {
  return new SignJWT({ email, purpose: "magic" })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m")
    .setIssuer("wrapped").sign(secret());
}
// session token: 30 days
export async function signSessionToken(email: string, member: boolean) {
  return new SignJWT({ email, member, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d")
    .setIssuer("wrapped").sign(secret());
}
export async function verifyToken(token: string, purpose: "magic" | "session") {
  const { payload } = await jwtVerify(token, secret(), { issuer: "wrapped" });
  if (payload.purpose !== purpose) throw new Error("wrong purpose");
  return payload as { email: string; member?: boolean };
}
```

Cookie: name `wrapped_session`, `httpOnly: true, secure: true, sameSite: "lax", path: "/",
maxAge: 60*60*24*30`.

### 13.2 `lib/db.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { SnapshotSchema, type Snapshot } from "@/lib/snapshot";

const sql = neon(process.env.DATABASE_URL!);

export async function getSnapshotByEmail(email: string): Promise<Snapshot | null> {
  const rows = await sql`
    SELECT data FROM wrapped_snapshots WHERE lower(email) = ${email.toLowerCase().trim()} LIMIT 1`;
  if (rows.length === 0) return null;
  const parsed = SnapshotSchema.safeParse(rows[0].data);
  return parsed.success ? parsed.data : null;   // malformed row → treat as non-member (prod-safe)
}
```

### 13.3 `lib/email.ts`

Resend send of the magic link. HTML email, table-free simple layout matching the brand: ink
background block, cream heading `copy.email.heading`, body, a cream-pill button (`copy.email.button`)
linking `${NEXT_PUBLIC_SITE_URL}/api/auth/verify?token=${token}`, then `expiry` and `ignore` lines
in muted text. Subject `copy.email.subject`. From `EMAIL_FROM`. Plain-text alternative with the raw
link. `await` the Resend call but cap with `Promise.race` at 3 s — on timeout still return success
to the route (the email usually lands; the UI already says "check your inbox").

### 13.4 Routes

**`POST /api/auth/request`** — body `{ email }` (zod: `z.string().email()`).
Rate limit first (§4.2: 3/email/hour, 20/IP/hour via in-memory Map keyed on
`lower(email)` and `x-forwarded-for` first hop; over limit → 429 with a friendly message).
Then sign token, send email, `202 { ok: true }` — **always the same response whether or not the
email belongs to a member** (no enumeration).

**`GET /api/auth/verify?token=`** — verify magic token (expired/invalid → redirect
`/?error=expired`; landing shows `copy.errors.linkExpired` when that param is present).
Look up snapshot → `member = snapshot !== null`. Set the session cookie, redirect `/wrapped`.
Track `magiclink_verified { member }`.

**`GET /api/me`** — read cookie; missing/invalid → `200 { member: false }` (guests are a normal
state, not an error). Valid member session → `getSnapshotByEmail`; DB error → `503
{ member: false, degraded: true }` (player shows `copy.errors.dbDown` toast on personal stories but
continues). Response: `200 { member: true, snapshot }`. Header `Cache-Control: private, no-store`.

**`POST /api/auth/logout`** — clear cookie, `204`.

---

## 14. Assets & every user-supplied input (exact names, locations, formats)

Everything the implementing model cannot produce itself, with precise placement so a human can
drop files in without reading code. **Build placeholders first** (the app must run with zero
user assets); swap-in is a file-drop, never a code change.

### 14.1 Event photography → `public/moments/<momentId>/NN.jpg`

| Path | What | Who supplies |
|---|---|---|
| `public/moments/orbit/01.jpg` … `03.jpg` | ORBIT photos — **copy the best 3 from `../GDGWebsite/public/images/gallery/orbit/` (8 exist: 01–08.jpg)** | you (copy now) |
| `public/moments/devfest/01.jpg`, `02.jpg` | DevFest photos | media team |
| `public/moments/games/01.jpg`, `02.jpg` | Game Nights photos | media team |
| `public/moments/spaces/01.jpg` | Twitter Spaces cover/screenshot | media team |

Requirements to communicate to the media team: JPG, portrait or square preferred, longest edge
1600 px, ≤ 400 KB each (`npx sharp-cli` or squoosh to compress), no text baked in.
**Placeholder rule until real photos land**: generate flat `--color-cream-deep` JPGs with the
moment title centered in ink `t-label` style (a tiny `scripts/make-placeholders.ts` using sharp is
acceptable as a devDependency, or check in hand-made 9:16 SVG-exported JPGs). The layout must not
depend on real photo dimensions.

### 14.2 Fonts → `assets/fonts/` (needed by share cards only)

| File | Source |
|---|---|
| `GoogleSans-Bold.ttf` | static-instance the app font: open `https://fonts.cdnfonts.com/css/google-sans`, take the weight-700 TTF URL and `curl -o` it (or instantiate Google Sans Flex at wght 700 with `fonttools varLib.instancer`) |
| `GoogleSans-Medium.ttf` | same, weight 500 |
| `BricolageGrotesque-Italic.ttf` | Google Fonts download (`https://fonts.google.com/specimen/Bricolage+Grotesque`) — any optical size, weight 500, italic; a static instance is required (satori cannot use variable fonts reliably) |

If a Google Sans TTF cannot be obtained, fall back to `GoogleSansFlex` static instances, and only
as a last resort Inter Bold/Medium — but then note it in the PR/commit body. **The share route must
fail at build (module scope) if fonts are missing, not at request time.**

Copy the same three TTFs to `public/fonts/` — the live-card recorder (§10.6) loads them client-side
via `FontFace`. They are the only font binaries in `public/`; the app UI itself uses the
next/font-hosted variable font (§3.2) and never touches these.

### 14.3 The People roster → fill `PEOPLE` in `lib/content/chapter.ts`

Source of truth: `../GDGWebsite/public/2025_2026 Website Data Form (Responses) - Form Responses 1.csv`
(58 rows). Columns: `Full name`, `Role/title`, `Team` (values: Core/Tracks/Dev/Media/Events
variants), `Position (Lead/Co-Lead/Member)`, `Consent to display`.

Procedure:
1. **Only include rows where `Consent to display` is affirmative** ("I do"/"Yes").
2. Map `Team` → section: Core team → `CORE`; Tracks → `TRACKS`; Development/Dev → `DEV`;
   Media/Marketing → `MEDIA`; Events/Logistics → `EVENTS`.
3. Within a section, Leads/Co-Leads sort first, then alphabetical.
4. `role` = the `Role/title` cell, trimmed, title-cased.
5. Photos: copy matching headshots from `../GDGWebsite/public/team/**` (files are named
   `firstname-lastname[-role].jpg`) into `public/people/<slug>.jpg` where slug =
   lowercased-hyphenated full name; ≤ 200 KB, square-cropped 400×400 (they render at 36 px).
   No match → `photo: null` (InitialsAvatar renders).
6. Write the result as literal data in `chapter.ts` (do not parse CSV at runtime), and update
   `ASSET_MANIFEST.people`.

### 14.4 Numbers the organizer confirms at copy-freeze (all in `lib/content/chapter.ts`)

`members`, `eventsRun`, `totalCheckins`, `messagesParsed` — the pipeline `report.ts` prints the
real values for the last three; `members` is the organizer's call (source: users table count or
the "500+" marketing number — the receipt row renders `500+` style with a `+`).

### 14.5 Human/ops inputs (not files in this repo)

| Input | Where it goes | Owner |
|---|---|---|
| Neon pooled connection string | Vercel env `DATABASE_URL` | organizer |
| Neon direct connection string | local `.env` `PIPELINE_DATABASE_URL` of whoever runs the pipeline | organizer |
| `WRAPPED_SESSION_SECRET` | Vercel env (generate once) | you |
| Resend key + verified domain | Vercel env `RESEND_API_KEY` | organizer |
| DNS `wrapped.gdgbabcock.com` → Vercel | domain registrar | organizer |
| WhatsApp exports (`.txt`, no media) of the community groups | `data/exports/` on the pipeline machine | community leads |
| `data/mapping.json` unmatched-sender resolutions | pipeline machine | leads workshop |
| `data/opt-out.json` | pipeline machine | organizer |
| Migration 005 applied to Neon | psql / auth migration runner | organizer + you |

---

## 15. Edge cases & the guest experience (consolidated truth table)

| Situation | Detection | Experience |
|---|---|---|
| Member, zero check-ins | `flags.zeroCheckins` | Story 5 ticket variant (§9.5) — never a "0". Story 6: stats variant, events block shows 0 only alongside a matched message count; if ALSO unmatched → `lowSub` copy, no numbers at all. Summary omits the events column. |
| Member, unmatched WhatsApp | `messages.matched === false` | Message counts treated as **unknown, never zero**: standing formula is checkins-only (§12.4); no message copy anywhere; summary omits messages column. |
| Member, joined after 2026-03-01 | `isNewMember` | Story 7 `setupNew/revealNew/loreNew`; standing unaffected (they can still hit a tier). |
| Non-member email (guest) | `/api/me → { member: false }` | Full public stories; 5 renders guest variant; **6 and 7 are skipped entirely** (the engine must support per-story skip: filter STORIES for guests to indexes [0,1,2,3,4(guest),7(guest),8,9(guest)]); 8 renders the four-face-down variant; summary renders the guest card. Progress bar shows the reduced segment count. |
| Not logged in at all | no cookie | Same as guest, plus story 5's guest frame carries the inline email form from the landing so they can unlock without leaving the player. |
| Magic link expired | verify fails | Redirect `/?error=expired`, landing shows `copy.errors.linkExpired`, form focused. |
| DB down mid-session | `/api/me` 503 | `copy.errors.dbDown` toast once; guest flow; public untouched. |
| Opt-out member | no snapshot row | Indistinguishable from guest — by design. |
| Reduced motion | `useReducedMotion()` | Final values immediately; crossfades only; Story 8 flip becomes a fade; Story 4 roll becomes manual scroll (overflow-y auto). |
| Offline mid-story | images fail | Every image sits on a `bg-cream-deep`/`bg-ink-2` block with the story's label — layout never collapses. |

---

## 16. Verification (run all of it; a phase is not done until its checks pass)

1. **Static checks**: `npm run ts-lint` and `npm run lint` clean after every phase.
2. **Unit tests**: `npm test` — the §12.9 suites pass.
3. **Seed end-to-end**: `npm run pipeline -- --seed --dry-run` prints a report with: 300 members,
   match rate > 80%, four clubs each ≥ 8%, sane percentile histogram, planted outlier NOT top-1
   by messages alone.
4. **Build**: `npm run build` succeeds; confirm route table shows `/` and `/wrapped` as static (○),
   APIs as dynamic (ƒ).
5. **Player smoke (npm run dev, phone-width viewport)**: tap through all 10 stories; hold-to-pause
   freezes progress + Story 4 roll fans Story 2; left-tap goes back; swipe-down opens grid; grid
   jumps; `?story=your-club` deep-links; reduced-motion (devtools emulation) shows no count-ups.
6. **Guest flow**: no cookie → stories 5/8/summary in guest variants, 6/7 skipped, progress bar
   segment count matches.
7. **Member flow (local)**: with a local `.env` + a seeded Neon-branch (or local Postgres) row:
   request magic link (log the link in dev instead of sending if `RESEND_API_KEY` unset — implement
   this dev fallback), verify, confirm personal stories render fixture data; `/api/me` under
   120 ms warm.
8. **Cards**: `/debug/cards` renders every card × fixture; visually confirm: readable as
   thumbnails, watermark present, club card patterns distinct, no missing-font tofu.
9. **Share**: desktop → downloads PNG; mobile emulation → `navigator.share` path (falls back
   cleanly when `canShare` is false).
10. **Lighthouse (mobile, /wrapped)**: Performance ≥ 90, CLS < 0.05, JS under budget (§4.2).
11. **Immersive layer**: with WebGL forcibly disabled (Chrome devtools → Rendering →
    "Disable WebGL", or `--disable-webgl`), every story still renders complete on its CSS field —
    no blank frames, no errors. With GL on: shader crossfades on story change, foil chases the
    pointer on the club story, constellation twinkles on story 5.
12. **Kinetic type + VT**: landing title breathes weight (inspect computed
    `font-variation-settings`); navigating landing → player morphs the title in Chrome/Safari and
    hard-cuts harmlessly in Firefox. `text-box` trim visibly centers the monument numeral.
13. **Live cards**: on Chrome + Safari, "Share live card" produces a 3 s seamless-loop video file
    (mp4 preferred) with moving foil; canceling mid-render aborts cleanly; a browser without
    MediaRecorder silently offers only "Share image". Recorded file plays in WhatsApp.
14. **Haptics** (physical Android): tap-advance ticks; stamp and club flip double-pulse; nothing
    vibrates with reduced-motion on.

---

## 17. Build order & commit plan (one commit per phase, exactly these messages)

| # | Phase | Verify | Commit message |
|---|---|---|---|
| 1 | §2 scaffold + §3 design system + `lib/utils.ts` + Grain/SvgFilters + landing skeleton | builds, ts-lint | `chore(repo): scaffold next 16 app with design tokens` |
| 2 | §5 primitives + §6.1 registry + §7 copy + §8 content/landing complete | landing renders | `feat(landing): title, marquee and magic-link entry` |
| 3 | §6 story engine (state machine, progress, gestures, frame, grid, preloader) with placeholder story bodies | smoke §16.5 | `feat(engine): story state machine, gestures and pacing controls` |
| 4 | §9.1–9.4 + 9.9 public stories | public flow watchable | `feat(stories): public chapter stories` |
| 5 | §13 auth + db + email + `/api/me` | §16.7 dev-fallback flow | `feat(auth): email magic link and session` |
| 6 | §9.5–9.8 + 9.10 personal stories + §15 guest variants incl. story-skip | member + guest flows | `feat(stories): personal stories and guest variants` |
| 7 | §10 share cards + button + debug grid + §14.2 fonts | §16.8–9 | `feat(share): server-rendered story cards and web share` |
| 8 | §12 pipeline + tests + §11 migration (auth repo gets its own commit: `feat(db): wrapped snapshot tables` on auth main) | §16.2–3 | `feat(pipeline): whatsapp parsing, standing and club assignment` |
| 9 | §14.1/14.3 assets: ORBIT copies, placeholders, PEOPLE from CSV | §16.5 with images | `feat(content): moments photography and people roster` |
| 10 | polish pass: reduced-motion, offline blocks, analytics events, Lighthouse | §16.10 | `style(app): motion, a11y and performance polish` |
| 11 | §3.7 shader fields (GL loader, quality gates, per-story uniforms) + §3.8 kinetic type, view transition, `text-box`, haptics | §16.11–12 | `feat(gl): webgl shader fields and kinetic type layer` |
| 12 | §10.6 live cards (composer, recorder, share sheet) + `public/fonts` | §16.13 | `feat(share): animated live card video export` |

Phases 11–12 depend only on phases 3 and 7 respectively — if the schedule compresses, they are
the LAST things cut, not the first: they are the difference between "nice recap" and "the most
impressive thing the chapter has shipped." Cut §17 phase-10 polish scope before cutting these.

After each phase: commit on `main`, push (`git push -u origin main`, backoff per §1.1).

**Launch runbook (for the humans, after phase 12):** apply migration → set Vercel envs → deploy →
run pipeline `--seed` against a Neon branch → leads workshop `mapping.json` → real run `--dry-run`,
review report → `--write` → paste report numbers into `chapter.ts`, copy-freeze commit
(`docs(content): freeze chapter numbers`) → soft-launch to core team 48 h → launch during grad week.

---

*End of specification. If you read this far: the bar is "the most beautiful thing the chapter has
ever shipped." Every screen must survive being screenshotted and posted with zero context. When in
doubt, remove elements rather than add them — the type IS the design.*

