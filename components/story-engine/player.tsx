"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { STORIES, TIMING } from "@/lib/stories";
import { STORY_COMPONENTS } from "@/components/stories";
import { StoryFrame } from "./story-frame";
import { ProgressBar } from "./progress-bar";
import { TapZones } from "./tap-zones";
import { preloadStoryAssets } from "./preloader";
import { useStoryEngine } from "./use-story-state";
import type { Snapshot } from "@/lib/snapshot";

const ChapterGrid = dynamic(
  () => import("./chapter-grid").then((m) => m.ChapterGrid),
  { ssr: false }
);

interface MeResponse {
  member: boolean;
  snapshot?: Snapshot;
  degraded?: boolean;
}

export function Player() {
  const { state, dispatch, progressRef, activeIndexes } = useStoryEngine();
  const [me, setMe] = useState<MeResponse>({ member: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMe(data);
        dispatch({ type: "SET_MEMBER", isMember: !!data.member });
      })
      .catch(() => {
        setMe({ member: false });
        dispatch({ type: "SET_MEMBER", isMember: false });
      });
    return () => controller.abort();
  }, [dispatch]);

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

  return (
    <StoryFrame>
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
      />

      {state.paused && !state.gridOpen && (
        <div className="toast absolute top-16 left-1/2 -translate-x-1/2 z-20 rounded-full bg-ink/70 text-cream px-3 py-1">
          <span className="t-label">PAUSED</span>
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
