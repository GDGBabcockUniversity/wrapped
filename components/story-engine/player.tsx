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

// The vertical deck push (Spotify 2025 model). Screens overlap-travel —
// never mode="wait", both must move together — direction-aware via custom.
const PUSH_SPRING = { type: "spring" as const, stiffness: 300, damping: 34 };
const PUSH_VARIANTS = {
  // Incoming screen arrives at full size; outgoing recedes slightly as it
  // leaves — the deck has depth, screens aren't flat panels.
  enter: (direction: 1 | -1) => ({ y: direction > 0 ? "100%" : "-100%", scale: 1 }),
  center: { y: "0%", scale: 1, transition: { y: PUSH_SPRING } },
  exit: (direction: 1 | -1) => ({
    y: direction > 0 ? "-100%" : "100%",
    scale: 0.96,
    transition: { y: PUSH_SPRING, scale: { duration: 0.4, ease: "easeIn" as const } },
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

  return (
    <StoryFrame
      field={def.field}
      storyIndex={state.storyIndex}
      accentHex={shaderAccentHex}
      pattern={shaderPattern}
      progressRef={progressRef}
    >
      {/* Story-level: full-screen vertical PUSH — outgoing and incoming
          screens travel together like a deck of cards. Forward pushes up,
          backward pushes down. Phase-level (setup→reveal) stays an in-place
          crossfade INSIDE the pushed screen, so a story never slides for
          its own second beat. */}
      <AnimatePresence initial={false} custom={state.direction}>
        <motion.div
          key={def.id}
          custom={state.direction}
          variants={PUSH_VARIANTS}
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
          {/* initial={false}: a freshly pushed screen arrives fully drawn —
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
