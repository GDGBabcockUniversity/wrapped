"use client";

import { useEffect, useRef } from "react";
import type { RefObject, ReactNode } from "react";
import type { Phase } from "./use-story-state";

/**
 * One bar per story; setup fills 0→30%, reveal 30→100% (§6.5 sub-beats).
 *
 * EVERY segment's fill is painted imperatively on every frame — past bars 1,
 * future bars 0, current bar from the engine's progress ref. React never
 * writes these transforms: mixing declarative resets with imperative writes
 * leaves stale fills behind on back-navigation (React can't diff a DOM
 * mutation it didn't make).
 */
export function ProgressBar({
  progressRef,
  total,
  currentPos,
  phase,
  field,
  label,
  onOpenGrid,
  shareSlot,
}: {
  progressRef: RefObject<number>;
  total: number;
  currentPos: number;
  phase: Phase;
  field: "ink" | "cream";
  label: string;
  onOpenGrid: () => void;
  shareSlot?: ReactNode;
}) {
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentPosRef = useRef(currentPos);
  const phaseRef = useRef(phase);

  useEffect(() => {
    currentPosRef.current = currentPos;
    phaseRef.current = phase;
  });

  useEffect(() => {
    let raf = 0;
    function paint() {
      const pos = currentPosRef.current;
      const p = progressRef.current;
      const beat = phaseRef.current === "setup" ? p * 0.3 : 0.3 + p * 0.7;
      for (let i = 0; i < fillRefs.current.length; i++) {
        const node = fillRefs.current[i];
        if (!node) continue;
        const scale = i < pos ? 1 : i === pos ? beat : 0;
        node.style.transform = `scaleX(${scale})`;
      }
      raf = requestAnimationFrame(paint);
    }
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  const track = field === "ink" ? "bg-cream/25" : "bg-ink/20";
  const fill = field === "ink" ? "bg-cream" : "bg-ink";
  const text = field === "ink" ? "text-cream" : "text-ink";

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 px-3"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full overflow-hidden ${track}`}
          >
            <div
              ref={(node) => {
                fillRefs.current[i] = node;
              }}
              className={`h-full w-full origin-left ${fill}`}
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between mt-2 ${text}`}>
        <span className="t-label opacity-90">{label}</span>
        <div className="flex items-center gap-3">
          {shareSlot}
          <button
            onClick={onOpenGrid}
            aria-label="Story grid"
            className="text-lg leading-none opacity-90"
          >
            &#8862;
          </button>
        </div>
      </div>
    </div>
  );
}
