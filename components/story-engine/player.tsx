"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@vercel/analytics";
import { AnimatePresence, motion } from "motion/react";
import { STORIES, TIMING } from "@/lib/stories";
import { STORY_COMPONENTS } from "@/components/stories";
import { CLUBS } from "@/lib/clubs";
import { ACCENT_HEX } from "@/components/gl/shaders";
import { StoryFrame } from "./story-frame";
import { ProgressBar } from "./progress-bar";
import { TapZones } from "./tap-zones";
import { preloadStoryAssets } from "./preloader";
import { useStoryEngine } from "./use-story-state";
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

const CAMERA_VARIANTS = {
  enter: (v: Vector) => ({ x: pct(v[0] * 100), y: pct(v[1] * 100), scaleX: 1, scaleY: 1 }),
  center: (v: Vector) => ({
    x: [pct(v[0] * 100), pct(v[0] * 100 + v[0] * ANTICIPATE_PCT), pct(0)],
    y: [pct(v[1] * 100), pct(v[1] * 100 + v[1] * ANTICIPATE_PCT), pct(0)],
    scaleX: smearKeyframes(v, "x"),
    scaleY: smearKeyframes(v, "y"),
    transition: { x: WHIP_TRANSITION, y: WHIP_TRANSITION, scaleX: SMEAR_TRANSITION, scaleY: SMEAR_TRANSITION },
  }),
  exit: (v: Vector) => ({
    x: [pct(0), pct(v[0] * ANTICIPATE_PCT), pct(-v[0] * 100)],
    y: [pct(0), pct(v[1] * ANTICIPATE_PCT), pct(-v[1] * 100)],
    scaleX: smearKeyframes(v, "x"),
    scaleY: smearKeyframes(v, "y"),
    transition: { x: WHIP_TRANSITION, y: WHIP_TRANSITION, scaleX: SMEAR_TRANSITION, scaleY: SMEAR_TRANSITION },
  }),
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
  const [me, setMe] = useState<MeResponse>({ member: false });
  const [dbDegraded, setDbDegraded] = useState(false);
  const verifiedTracked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
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

  useEffect(() => {
    if (!dbDegraded) return;
    const timeout = setTimeout(() => setDbDegraded(false), 5000);
    return () => clearTimeout(timeout);
  }, [dbDegraded]);

  useEffect(() => {
    preloadStoryAssets(state.storyIndex);
  }, [state.storyIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        dispatch({ type: "NEXT" });
      } else if (e.key === "ArrowLeft") {
        dispatch({ type: "PREV" });
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
  // Summary carries its own primary share CTA already — the header chip is
  // only for the other personal reveal screens.
  const showShareChip =
    def.personal && def.id !== "summary" && me.member && state.phase === "reveal";
  const seamEdgeName = seamEdge(state.vector);
  const seamEdgeIsVertical = seamEdgeName === "top" || seamEdgeName === "bottom";

  return (
    <StoryFrame
      field={def.field}
      storyIndex={state.storyIndex}
      accentHex={shaderAccentHex}
      pattern={shaderPattern}
      progressRef={progressRef}
    >
      {/* Story-level: the canvas camera whips to the next position — down,
          across, or diagonal, per the engine's travel vector. Outgoing and
          incoming screens travel together (never mode="wait"). Phase-level
          (setup→reveal) stays an in-place crossfade INSIDE the screen, so a
          story never whips for its own second beat. */}
      <AnimatePresence initial={false} custom={state.vector}>
        <motion.div
          key={def.id}
          custom={state.vector}
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
                fade. */}
            <AnimatePresence mode="wait" initial={false}>
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
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <TapZones
        onNext={() => dispatch({ type: "NEXT" })}
        onPrev={() => dispatch({ type: "PREV" })}
        onPause={() => dispatch({ type: "PAUSE" })}
        onResume={() => dispatch({ type: "RESUME" })}
        onOpenGrid={() => dispatch({ type: "OPEN_GRID" })}
      />

      <ProgressBar
        progressRef={progressRef}
        total={activeIndexes.length}
        currentPos={currentPos}
        phase={state.phase}
        field={def.field}
        label={def.label}
        forceVisible={state.paused || state.gridOpen}
        onOpenGrid={() => dispatch({ type: "OPEN_GRID" })}
        shareSlot={
          showShareChip ? (
            <ShareButton storyId={def.id} variant="chip" snapshot={me.snapshot} />
          ) : undefined
        }
      />

      {state.paused && !state.gridOpen && (
        <div className="toast absolute top-16 left-1/2 -translate-x-1/2 z-20 rounded-full bg-ink/70 text-cream px-3 py-1">
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
