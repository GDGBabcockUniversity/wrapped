"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@vercel/analytics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { STORIES, TIMING, OVERTURE, SHADER_STORY } from "@/lib/stories";
import { STORY_COMPONENTS } from "@/components/stories";
import { CLUBS } from "@/lib/clubs";
import { ACCENT_HEX } from "@/components/gl/shaders";
import { StoryFrame } from "./story-frame";
import { ProgressBar } from "./progress-bar";
import { GestureHint } from "./gesture-hint";
import { TapZones } from "./tap-zones";
import { preloadStoryAssets } from "./preloader";
import { useStoryEngine } from "./use-story-state";
import { primeAudio, setStoryTrack } from "@/lib/audio";
import { initSfx, playSfx } from "@/lib/sfx";
import type { Snapshot } from "@/lib/snapshot";
import { copy } from "@/lib/copy";
import { ShareButton } from "@/components/share/share-button";

const ChapterGrid = dynamic(
  () => import("./chapter-grid").then((m) => m.ChapterGrid),
  { ssr: false }
);

const CLUB_PATTERN_INDEX = { grid: 0, waves: 1, halftone: 2, diagonals: 3 } as const;

type Vector = [number, number];

// The canvas camera (§11.3 build2.md) — stories live on a plane; advancing
// whips the camera to the next position, sometimes down, across, or
// diagonal. Screens overlap-travel — never mode="wait" — both must move
// together, driven by the engine's per-transition vector via `custom`.
const pct = (n: number) => `${n}%`;
const WHIP_TIMES = [0, 0.19, 1];
// Two-phase easing over one keyframe run (never chained animations): a 90ms
// anticipation coil, then a 380ms slow-fast-slow whip with a violent middle.
const WHIP_EASE: ["easeOut", [number, number, number, number]] = ["easeOut", [0.83, 0, 0.17, 1]];
const WHIP_DURATION = 0.47; // 90ms + 380ms
const ANTICIPATE_PCT = 1.5;
const SMEAR_TIMES = [0, 0.19, 0.745, 1];

const WHIP_TRANSITION = { duration: WHIP_DURATION, times: WHIP_TIMES, ease: WHIP_EASE };
const SMEAR_TRANSITION = { duration: WHIP_DURATION, times: SMEAR_TIMES, ease: WHIP_EASE };

// Motion blur without `filter`: the traveling screen scales ~4.5% along its
// dominant travel axis, easing back to 1 in the whip's last 120ms. Both
// scale axes are always present (Motion/TS need a stable shape) — the
// non-dominant one is just a constant no-op animation.
function smearKeyframes(v: Vector, axis: "x" | "y"): number[] {
  const dominant = v[1] !== 0 ? "y" : "x";
  return axis === dominant ? [1, 1, 1.045, 1] : [1, 1, 1, 1];
}

interface CameraCustom {
  v: Vector;
  reduceMotion: boolean;
}

const CAMERA_VARIANTS = {
  enter: ({ v }: CameraCustom) => ({ x: pct(v[0] * 100), y: pct(v[1] * 100), scaleX: 1, scaleY: 1 }),
  center: ({ v }: CameraCustom) => ({
    x: [pct(v[0] * 100), pct(v[0] * 100 + v[0] * ANTICIPATE_PCT), pct(0)],
    y: [pct(v[1] * 100), pct(v[1] * 100 + v[1] * ANTICIPATE_PCT), pct(0)],
    scaleX: smearKeyframes(v, "x"),
    scaleY: smearKeyframes(v, "y"),
    transition: { x: WHIP_TRANSITION, y: WHIP_TRANSITION, scaleX: SMEAR_TRANSITION, scaleY: SMEAR_TRANSITION },
  }),
  // §7.3: the leaving screen shears on sideways-energy exits (horizontal or
  // diagonal), holds straight on clean verticals — s = 0 for v[0] === 0
  // zeroes the rotate keyframes out naturally, no branching needed. Only
  // the exit variant tilts; entering screens stay untilted. Reduced motion
  // (§10 degradation map: "tilt/shear → none") zeroes it explicitly too.
  exit: ({ v, reduceMotion }: CameraCustom) => {
    const s = reduceMotion ? 0 : Math.sign(v[0]);
    return {
      x: [pct(0), pct(v[0] * ANTICIPATE_PCT), pct(-v[0] * 100)],
      y: [pct(0), pct(v[1] * ANTICIPATE_PCT), pct(-v[1] * 100)],
      scaleX: smearKeyframes(v, "x"),
      scaleY: smearKeyframes(v, "y"),
      rotate: [0, 0.4 * s, 2.2 * s],
      transition: {
        x: WHIP_TRANSITION,
        y: WHIP_TRANSITION,
        scaleX: SMEAR_TRANSITION,
        scaleY: SMEAR_TRANSITION,
        rotate: WHIP_TRANSITION,
      },
    };
  },
};

// Content parallax: the screen travels 100% on the whip above; its content
// travels an extra 12% on a softer, slightly slower spring — two layers at
// different speeds is what reads as space, not a slide change. Variants
// only, no `animate` prop — it inherits enter/center/exit from the parent.
const PARALLAX_SPRING = { type: "spring" as const, stiffness: 260, damping: 32 };
const PARALLAX_VARIANTS = {
  enter: (v: Vector) => ({ x: pct(v[0] * 12), y: pct(v[1] * 12) }),
  center: { x: "0%", y: "0%", transition: { x: PARALLAX_SPRING, y: PARALLAX_SPRING } },
  exit: (v: Vector) => ({
    x: pct(-v[0] * 12),
    y: pct(-v[1] * 12),
    transition: { x: PARALLAX_SPRING, y: PARALLAX_SPRING },
  }),
};

// Story screens are transparent (the shader field lives beneath them), so
// each traveling screen carries an opaque field-colored backdrop: solid
// while moving — no double-exposure — fading out once settled so the live
// shader shows through. Exit snaps it back solid instantly (duration 0).
// Reaches the child via variant-label propagation; it must NOT set animate.
const BACKDROP_VARIANTS = {
  enter: { opacity: 1 },
  center: { opacity: 0, transition: { delay: 0.15, duration: 0.3 } },
  exit: { opacity: 1, transition: { duration: 0 } },
};

// The seam flash: a blink of the incoming chapter's color at the moment of
// crossing — connective tissue between stories. Also variant-propagated.
const SEAM_VARIANTS = {
  enter: { opacity: 0.9 },
  center: { opacity: 0, transition: { delay: 0.1, duration: 0.3 } },
  exit: { opacity: 0 },
};

function seamEdge(v: Vector): "top" | "bottom" | "left" | "right" {
  // Diagonals use the vertical edge of their corner-adjacent pair.
  if (v[1] !== 0) return v[1] > 0 ? "top" : "bottom";
  return v[0] > 0 ? "right" : "left";
}

interface MeResponse {
  member: boolean;
  snapshot?: Snapshot;
  degraded?: boolean;
}

export function Player() {
  const { state, dispatch, progressRef, activeIndexes } = useStoryEngine();
  const reduceMotion = useReducedMotion();
  const [me, setMe] = useState<MeResponse>({ member: false });
  const [dbDegraded, setDbDegraded] = useState(false);
  const verifiedTracked = useRef(false);
  // The overture's drive-through window (build4 §4, cover beat 2026-07-20):
  // the-year's setup shows the warp field (shader story 10) only during the
  // DRIVE beat — after the cover title card, before the calm resolve.
  // Reset-on-prop-change happens synchronously during render (React's
  // sanctioned pattern for this — see "Adjusting state when a prop
  // changes" in the React docs) rather than in the effect below, which
  // only owns the async window flips so it never calls setState
  // synchronously from its own body.
  const setupCycleKey = `${state.storyIndex}-${state.phase}`;
  const [warpKey, setWarpKey] = useState(setupCycleKey);
  const [setupWarpActive, setSetupWarpActive] = useState(false);
  if (setupCycleKey !== warpKey) {
    setWarpKey(setupCycleKey);
    setSetupWarpActive(false);
  }
  useEffect(() => {
    if (state.storyIndex !== 0 || state.phase !== "setup") return;
    const on = setTimeout(() => setSetupWarpActive(true), OVERTURE.coverMs);
    const off = setTimeout(
      () => setSetupWarpActive(false),
      OVERTURE.coverMs + OVERTURE.driveMs
    );
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [state.storyIndex, state.phase]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const fixture = params.get("fixture");
    const url = fixture ? `/api/me?fixture=${fixture}` : "/api/me";
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMe(data);
        setDbDegraded(!!data.degraded);
        dispatch({ type: "SET_MEMBER", isMember: !!data.member });
        if (!verifiedTracked.current) {
          verifiedTracked.current = true;
          track("magiclink_verified", { member: !!data.member });
        }
      })
      .catch(() => {
        setMe({ member: false });
        dispatch({ type: "SET_MEMBER", isMember: false });
      });
    return () => controller.abort();
  }, [dispatch]);

  // One event per story visited (not per setup/reveal phase beat).
  useEffect(() => {
    track("story_view", { id: STORIES[state.storyIndex]!.id });
  }, [state.storyIndex]);

  // build6 §5.1: the camera whip gets a whoosh — every genuine index
  // change, not the initial mount (prevIndexRef starts equal to the first
  // render's index, so the first effect run is a no-op).
  const prevIndexRef = useRef(state.storyIndex);
  useEffect(() => {
    if (prevIndexRef.current !== state.storyIndex) playSfx("whoosh");
    prevIndexRef.current = state.storyIndex;
  }, [state.storyIndex]);

  useEffect(() => {
    if (!dbDegraded) return;
    const timeout = setTimeout(() => setDbDegraded(false), 5000);
    return () => clearTimeout(timeout);
  }, [dbDegraded]);

  useEffect(() => {
    preloadStoryAssets(state.storyIndex);
  }, [state.storyIndex]);

  // Every story carries its own song (lib/soundtrack.ts). Safe before the
  // first gesture — the engine remembers the track and starts it on unlock.
  useEffect(() => {
    setStoryTrack(STORIES[state.storyIndex]!.id);
  }, [state.storyIndex]);

  // The soundtrack and the SFX engine can only start from a user gesture
  // (autoplay policy). primeAudio() owns the listeners now and RETRIES on
  // every gesture until a `playing` event confirms real sound — the old
  // `once: true` pair gave the browser exactly one chance to say no, and a
  // single swallowed rejection meant silence for the whole session.
  useEffect(() => {
    const disarm = primeAudio();
    function unlockSfx() {
      initSfx();
    }
    window.addEventListener("pointerdown", unlockSfx, { capture: true });
    window.addEventListener("keydown", unlockSfx, { capture: true });
    return () => {
      disarm();
      window.removeEventListener("pointerdown", unlockSfx, { capture: true });
      window.removeEventListener("keydown", unlockSfx, { capture: true });
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        dispatch({ type: "NEXT" });
      } else if (e.key === "ArrowLeft") {
        dispatch({ type: "PREV_STORY" });
      } else if (e.key === "ArrowDown") {
        // The keyboard mirror of the swipe — whole chapters, both ways.
        e.preventDefault();
        dispatch({ type: "NEXT_STORY" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        dispatch({ type: "PREV_STORY" });
      } else if (e.key === "Escape") {
        dispatch({ type: state.gridOpen ? "CLOSE_GRID" : "OPEN_GRID" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.gridOpen]);

  const def = STORIES[state.storyIndex]!;
  const StoryComponent = STORY_COMPONENTS[def.id];
  const currentPos = activeIndexes.indexOf(state.storyIndex);
  const clubMeta = me.snapshot ? CLUBS[me.snapshot.club.id] : null;
  const shaderAccentHex =
    def.accent === "club" ? clubMeta?.hex ?? ACCENT_HEX.green : ACCENT_HEX[def.accent];
  const shaderPattern = clubMeta ? CLUB_PATTERN_INDEX[clubMeta.pattern] : 0;
  // Every story is shareable (owner, 2026-07-20) — the header chip appears
  // on every reveal EXCEPT summary, which carries its own primary share CTA.
  // Personal "your-*" beats still require membership: a guest has no
  // snapshot to render, so those cards would 401.
  const showShareChip =
    def.id !== "summary" && state.phase === "reveal" && (!def.personal || me.member);
  const seamEdgeName = seamEdge(state.vector);
  const seamEdgeIsVertical = seamEdgeName === "top" || seamEdgeName === "bottom";
  // The-year's setup swaps in the overture warp field (shader story 10,
  // build4 §2.2) instead of its own story-0 treatment; refined to a
  // sub-beat window once the drive-through timing lands (build4 §4).
  // Otherwise the shader branch is looked up by story id (build5 §4.4,
  // SHADER_STORY) — raw storyIndex no longer maps 1:1 to a shader branch
  // once group-chat sits between built and people.
  const shaderStory =
    state.storyIndex === 0 && state.phase === "setup" && setupWarpActive ? 10 : SHADER_STORY[def.id];

  return (
    <StoryFrame
      field={def.field}
      storyIndex={shaderStory}
      accentHex={shaderAccentHex}
      pattern={shaderPattern}
      progressRef={progressRef}
    >
      {/* Story-level: the canvas camera whips to the next position — down,
          across, or diagonal, per the engine's travel vector. Outgoing and
          incoming screens travel together (never mode="wait"). Phase-level
          (setup→reveal) stays an in-place crossfade INSIDE the screen, so a
          story never whips for its own second beat. */}
      <AnimatePresence initial={false} custom={{ v: state.vector, reduceMotion: !!reduceMotion }}>
        <motion.div
          key={def.id}
          custom={{ v: state.vector, reduceMotion: !!reduceMotion }}
          variants={CAMERA_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 z-10 will-change-transform"
        >
          <motion.div
            aria-hidden
            variants={BACKDROP_VARIANTS}
            className={`absolute inset-0 ${def.field === "ink" ? "bg-ink" : "bg-cream"}`}
          />
          <motion.div
            aria-hidden
            variants={SEAM_VARIANTS}
            className="absolute pointer-events-none"
            style={
              seamEdgeIsVertical
                ? { background: shaderAccentHex, left: 0, right: 0, height: 2, [seamEdgeName]: 0 }
                : { background: shaderAccentHex, top: 0, bottom: 0, width: 2, [seamEdgeName]: 0 }
            }
          />
          {/* Content parallax: travels an extra 12% past the screen's 100%,
              settling ~60ms later — two speeds read as depth, not a slide. */}
          <motion.div variants={PARALLAX_VARIANTS} custom={state.vector} className="absolute inset-0">
            {/* initial={false}: a freshly whipped screen arrives fully drawn —
                only in-story phase changes transition. Setup exits by scaling
                TOWARD the viewer while the reveal rises from slightly beneath:
                you pass THROUGH the tease into the payoff, not across a flat
                fade. build6 §8.4: no mode="wait" — every setup→reveal
                crossfade must overlap (the incoming screen visible before
                the outgoing hits opacity 0), which mode="wait"'s strictly
                sequential exit-then-enter can never do. */}
            <AnimatePresence initial={false}>
              <motion.div
                key={state.phase}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.06 }}
                transition={{ duration: TIMING.storyFadeMs / 1000, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <StoryComponent
                  phase={state.phase}
                  active={true}
                  snapshot={me.snapshot ?? null}
                  guest={!me.member}
                  paused={state.paused || state.gridOpen}
                  onReplay={() => dispatch({ type: "GOTO", index: 0 })}
                  onComplete={() => dispatch({ type: "NEXT" })}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <TapZones
        onNext={() => dispatch({ type: "NEXT" })}
        onPrev={() => dispatch({ type: "PREV_STORY" })}
        onNextStory={() => dispatch({ type: "NEXT_STORY" })}
        onPrevStory={() => dispatch({ type: "PREV_STORY" })}
        onPause={() => dispatch({ type: "PAUSE" })}
        onResume={() => dispatch({ type: "RESUME" })}
        paused={state.paused}
      />

      <ProgressBar
        progressRef={progressRef}
        total={activeIndexes.length}
        currentPos={currentPos}
        phase={state.phase}
        field={def.field}
        forceVisible={state.paused || state.gridOpen}
        onOpenGrid={() => dispatch({ type: "OPEN_GRID" })}
        shareSlot={
          showShareChip ? (
            <div key={def.id} className="share-chip-enter">
              <ShareButton storyId={def.id} variant="chip" snapshot={me.snapshot} />
            </div>
          ) : undefined
        }
      />

      {/* build6 §4.2: the reference Wrapped's own cue that a visitor CAN
          act even though the story auto-advances — once per session, only
          over story 0's reveal. */}
      <GestureHint active={state.storyIndex === 0 && state.phase === "reveal"} />

      {/* build6 §2.4: never on summary — revealMs 0 means there's no timer
          to pause, so the toast was pure noise sitting on top of the
          card's own CTAs there. Moved to bottom-28 (clear of every
          story's own bottom-24 CTA band) and pointer-events-none
          everywhere else. */}
      {state.paused && !state.gridOpen && def.id !== "summary" && (
        <div className="toast absolute bottom-28 left-1/2 -translate-x-1/2 z-20 rounded-full bg-ink/70 text-cream px-3 py-1 pointer-events-none">
          <span className="t-label">PAUSED</span>
        </div>
      )}

      {dbDegraded && (
        <div className="toast absolute bottom-8 left-4 right-4 z-20 rounded-xl bg-ink/85 text-cream px-4 py-3">
          <p className="t-body text-sm">{copy.errors.dbDown}</p>
        </div>
      )}

      {state.gridOpen && (
        <ChapterGrid
          seen={state.seen}
          isMember={me.member}
          onSelect={(i) => dispatch({ type: "GOTO", index: i })}
          onClose={() => dispatch({ type: "CLOSE_GRID" })}
        />
      )}
    </StoryFrame>
  );
}
