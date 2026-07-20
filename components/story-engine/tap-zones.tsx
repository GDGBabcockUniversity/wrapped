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

export function TapZones({
  onNext,
  onPrev,
  onPause,
  onResume,
  onOpenGrid,
  paused,
}: {
  onNext: () => void;
  onPrev: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenGrid: () => void;
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

    if (isHolding.current) {
      isHolding.current = false;
      onResume();
      return;
    }

    if (start) {
      const dy = e.clientY - start.y;
      const dx = e.clientX - start.x;
      // Swipe up OR down opens the chapter deck — the vertical pull is the
      // "show me everything" gesture in both directions, same as the
      // reference Wrapped.
      if (Math.abs(dy) > 70 && Math.abs(dx) < 60) {
        onOpenGrid();
        return;
      }
      // A real drag that isn't a recognized swipe must never fall through
      // to the tap zones — an accidental 40px flick was advancing stories.
      if (Math.hypot(dx, dy) > 24) return;
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
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
