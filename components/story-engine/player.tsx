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
      <AnimatePresence mode="wait">
        <motion.div
          key={`${def.id}-${state.phase}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: TIMING.storyFadeMs / 1000 }}
          className="absolute inset-0 z-10"
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
        field={def.field}
        label={def.label}
        onOpenGrid={() => dispatch({ type: "OPEN_GRID" })}
        shareSlot={showShareChip ? <ShareButton storyId={def.id} variant="chip" /> : undefined}
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
