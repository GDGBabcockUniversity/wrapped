"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { STORIES, getGuestStoryIndexes, type StoryId } from "@/lib/stories";

export type Phase = "setup" | "reveal";

export interface EngineState {
  storyIndex: number;
  phase: Phase;
  /** 1 = moving forward (screens push UP), -1 = backward (screens push DOWN). */
  direction: 1 | -1;
  paused: boolean;
  gridOpen: boolean;
  seen: boolean[];
  isMember: boolean;
  memberResolved: boolean;
}

export type Action =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; index: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "OPEN_GRID" }
  | { type: "CLOSE_GRID" }
  | { type: "SET_MEMBER"; isMember: boolean }
  | { type: "RESTORE_SEEN"; seen: boolean[] };

function activeIndexesFor(isMember: boolean): number[] {
  return isMember ? STORIES.map((s) => s.index) : getGuestStoryIndexes();
}

function clampToActive(index: number, active: number[]): number {
  return active.includes(index) ? index : active[0]!;
}

function reducer(state: EngineState, action: Action): EngineState {
  const active = activeIndexesFor(state.isMember);
  switch (action.type) {
    case "NEXT": {
      if (state.phase === "setup") return { ...state, phase: "reveal" };
      const pos = active.indexOf(state.storyIndex);
      const last = active[active.length - 1]!;
      if (state.storyIndex === last) return state; // end state (summary), do nothing
      const seen = [...state.seen];
      seen[state.storyIndex] = true;
      return { ...state, storyIndex: active[pos + 1]!, phase: "setup", direction: 1, seen };
    }
    case "PREV": {
      if (state.phase === "reveal") return { ...state, phase: "setup" };
      const pos = active.indexOf(state.storyIndex);
      if (pos <= 0) return { ...state }; // restart setup timer via consumer key remount
      return { ...state, storyIndex: active[pos - 1]!, phase: "setup", direction: -1 };
    }
    case "GOTO": {
      const seen = [...state.seen];
      seen[state.storyIndex] = true;
      const target = clampToActive(action.index, active);
      return {
        ...state,
        storyIndex: target,
        phase: "setup",
        direction: target >= state.storyIndex ? 1 : -1,
        gridOpen: false,
        paused: false,
        seen,
      };
    }
    case "PAUSE":
      return { ...state, paused: true };
    case "RESUME":
      return { ...state, paused: false };
    case "OPEN_GRID":
      return { ...state, gridOpen: true, paused: true };
    case "CLOSE_GRID":
      return { ...state, gridOpen: false, paused: false };
    case "SET_MEMBER": {
      const nextActive = activeIndexesFor(action.isMember);
      return {
        ...state,
        isMember: action.isMember,
        memberResolved: true,
        storyIndex: clampToActive(state.storyIndex, nextActive),
      };
    }
    case "RESTORE_SEEN":
      return { ...state, seen: action.seen };
    default:
      return state;
  }
}

function storyIndexFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const storyParam = params.get("story");
  if (!storyParam) return null;
  const found = STORIES.find((s) => s.id === (storyParam as StoryId));
  return found ? found.index : null;
}

function init(): EngineState {
  // Always starts at story 0 — the URL's ?story= deep link is applied in a
  // post-hydration effect (below), never in this initializer, because this
  // runs during SSR too and reading window.location here would make the
  // server-rendered HTML disagree with the client's first render.
  return {
    storyIndex: 0,
    phase: "setup",
    direction: 1,
    paused: false,
    gridOpen: false,
    seen: new Array(STORIES.length).fill(false),
    isMember: false,
    memberResolved: false,
  };
}

/**
 * Single rAF loop per phase — accumulates elapsed time and dispatches NEXT
 * when the phase duration elapses. Progress is exposed via a ref (never React
 * state) so consumers can paint it imperatively at 60fps without re-rendering.
 */
function useStoryTimer(state: EngineState, dispatch: React.Dispatch<Action>) {
  const progressRef = useRef(0);
  const pausedRef = useRef(state.paused);
  const gridOpenRef = useRef(state.gridOpen);

  useEffect(() => {
    pausedRef.current = state.paused;
    gridOpenRef.current = state.gridOpen;
  });

  useEffect(() => {
    const def = STORIES[state.storyIndex]!;
    const duration = state.phase === "setup" ? def.setupMs : def.revealMs;
    progressRef.current = 0;

    if (duration <= 0) return; // summary story idles, never auto-advances

    let raf = 0;
    let elapsed = 0;
    let lastTs: number | null = null;
    let done = false;

    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      if (!pausedRef.current && !gridOpenRef.current && !done) {
        elapsed += delta;
      }
      progressRef.current = Math.min(1, elapsed / duration);
      if (elapsed >= duration && !done) {
        done = true;
        dispatch({ type: "NEXT" });
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.storyIndex, state.phase]);

  return progressRef;
}

export function useStoryEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const progressRef = useStoryTimer(state, dispatch);

  // Resolve a ?story= deep link only once membership is known — applying it
  // earlier would clamp a personal-story link (e.g. ?story=standing) back to
  // index 0, because the guest-active-list excludes that index and we don't
  // yet know the visitor isn't a guest.
  const pendingUrlStory = useRef<number | null>(null);
  const urlStoryApplied = useRef(false);

  useEffect(() => {
    pendingUrlStory.current = storyIndexFromUrl();
  }, []);

  useEffect(() => {
    if (!state.memberResolved || urlStoryApplied.current) return;
    urlStoryApplied.current = true;
    const index = pendingUrlStory.current;
    if (index !== null) {
      dispatch({ type: "GOTO", index });
    }
  }, [state.memberResolved]);

  // URL sync — shareable deep links like /wrapped?story=your-club, no page reload.
  useEffect(() => {
    const def = STORIES[state.storyIndex]!;
    const url = new URL(window.location.href);
    url.searchParams.set("story", def.id);
    window.history.replaceState(null, "", url.toString());
  }, [state.storyIndex]);

  // Persist + restore "seen" across the session (revisit-without-restart).
  useEffect(() => {
    try {
      sessionStorage.setItem("wrapped-seen", JSON.stringify(state.seen));
    } catch {
      // sessionStorage unavailable (private mode) — non-fatal
    }
  }, [state.seen]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wrapped-seen");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === STORIES.length) {
          dispatch({ type: "RESTORE_SEEN", seen: parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-pause when the tab is hidden; never auto-resume on return.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) dispatch({ type: "PAUSE" });
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const activeIndexes = useMemo(() => activeIndexesFor(state.isMember), [state.isMember]);

  return { state, dispatch, progressRef, activeIndexes };
}
