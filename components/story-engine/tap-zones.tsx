"use client";

import { useRef } from "react";

function interactiveBelow(current: Element, x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (el === current) continue;
    const target = el.closest("button, a, [role='button']");
    if (target) return target as HTMLElement;
  }
  return null;
}

// A swipe has to clear this much vertical distance, and be more vertical
// than horizontal, before it counts as a chapter change.
const SWIPE_MIN_PX = 55;
const SWIPE_AXIS_RATIO = 1.2;
// Below this, the pointer never really moved — it was a tap.
const TAP_SLOP_PX = 24;

export function TapZones({
  onNext,
  onPrev,
  onNextStory,
  onPrevStory,
  onPause,
  onResume,
  paused,
}: {
  onNext: () => void;
  onPrev: () => void;
  /** Swipe up — the next chapter, whole-story granularity. */
  onNextStory: () => void;
  /** Swipe down — the chapter you came from, from its beginning. */
  onPrevStory: () => void;
  onPause: () => void;
  onResume: () => void;
  paused: boolean;
}) {
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHolding = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const overInteractive = useRef(false);

  function vibrate(pattern: number | number[]) {
    if (
      typeof navigator !== "undefined" &&
      "vibrate" in navigator &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      document.hasFocus()
    ) {
      navigator.vibrate(pattern);
    }
  }

  // This layer sits above every story's DOM so it can catch tap/hold/swipe
  // gestures anywhere on the stage — but that also puts it above every
  // story's own buttons and links. Real interactive elements are found via
  // elementsFromPoint and clicked programmatically instead of being silently
  // swallowed.
  function onPointerDown(e: React.PointerEvent) {
    if (interactiveBelow(e.currentTarget, e.clientX, e.clientY)) {
      overInteractive.current = true;
      pointerStart.current = null;
      return;
    }
    overInteractive.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isHolding.current = false;
    holdTimeout.current = setTimeout(() => {
      isHolding.current = true;
      onPause();
    }, 250);
  }

  function clearHold() {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
  }

  // A deliberate swipe is slower than 250ms more often than not, and the
  // hold-to-pause timer used to fire mid-drag — the pointer-up then read as
  // "release the pause" and swallowed the swipe entirely. Any movement past
  // the tap slop cancels the hold before it can arm.
  function onPointerMove(e: React.PointerEvent) {
    const start = pointerStart.current;
    if (!start || isHolding.current) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) clearHold();
  }

  function onPointerUp(e: React.PointerEvent) {
    clearHold();
    const start = pointerStart.current;
    pointerStart.current = null;

    if (overInteractive.current) {
      overInteractive.current = false;
      const target = interactiveBelow(e.currentTarget, e.clientX, e.clientY);
      target?.click();
      return;
    }

    const swipeDy = start ? e.clientY - start.y : 0;
    const swipeDx = start ? e.clientX - start.x : 0;
    const isSwipe =
      !!start &&
      Math.abs(swipeDy) > SWIPE_MIN_PX &&
      Math.abs(swipeDy) > Math.abs(swipeDx) * SWIPE_AXIS_RATIO;

    if (isHolding.current) {
      isHolding.current = false;
      onResume();
      // A hold that turned into a swipe still navigates — resuming first
      // means the chapter it lands on isn't left paused.
      if (!isSwipe) return;
    }

    if (start) {
      const dy = swipeDy;
      const dx = swipeDx;
      // The vertical scroll IS the navigation (owner, 2026-07-20): swipe up
      // for the next chapter, swipe down for the one you came from — the
      // gesture every TikTok/Reels visitor already has in their thumbs. The
      // chapter deck moved off this gesture entirely; it lives on the grid
      // button in the top chrome.
      if (isSwipe) {
        vibrate(10);
        if (dy < 0) onNextStory();
        else onPrevStory();
        return;
      }
      // A real drag that isn't a recognized swipe must never fall through
      // to the tap zones — an accidental 40px flick was advancing stories.
      if (Math.hypot(dx, dy) > TAP_SLOP_PX) return;
    }

    // If the story is paused, a simple tap resumes rather than navigating.
    if (paused) {
      onResume();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      onPrev();
    } else {
      onNext();
    }
    vibrate(8);
  }

  function onPointerCancel() {
    clearHold();
    overInteractive.current = false;
    if (isHolding.current) {
      isHolding.current = false;
      onResume();
    }
  }

  return (
    <div
      className="absolute inset-0 z-[15] touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
