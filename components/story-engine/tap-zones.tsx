"use client";

import { useRef } from "react";

export function TapZones({
  onNext,
  onPrev,
  onPause,
  onResume,
  onOpenGrid,
}: {
  onNext: () => void;
  onPrev: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenGrid: () => void;
}) {
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHolding = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

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

  function onPointerDown(e: React.PointerEvent) {
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

    if (isHolding.current) {
      isHolding.current = false;
      onResume();
      return;
    }

    if (start) {
      const dy = e.clientY - start.y;
      const dx = e.clientX - start.x;
      if (dy > 80 && Math.abs(dx) < 60) {
        onOpenGrid();
        return;
      }
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
