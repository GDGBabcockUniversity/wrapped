"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { RefObject, ReactNode } from "react";
import { MuteButton } from "./mute-button";
import type { Phase } from "./use-story-state";

const IDLE_MS = 1800;
const HIDE_MS = 400;
const SHOW_MS = 150;

/**
 * One bar per story; setup fills 0→30%, reveal 30→100% (§6.5 sub-beats).
 *
 * EVERY segment's fill is painted imperatively on every frame — past bars 1,
 * future bars 0, current bar from the engine's progress ref. React never
 * writes these transforms: mixing declarative resets with imperative writes
 * leaves stale fills behind on back-navigation (React can't diff a DOM
 * mutation it didn't make).
 *
 * Chrome (bars + label + share chip) auto-hides after IDLE_MS of no touch,
 * reappearing instantly on the next pointerdown anywhere on the stage —
 * §11.2, the stage is the whole screen. The ⊞ grid button never fully
 * disappears (it's the one affordance a first-time viewer needs) — it dims
 * to 40% instead of vanishing. The rAF fill-paint loop never stops, so bars
 * are correct the instant chrome reappears.
 */
export function ProgressBar({
  progressRef,
  total,
  currentPos,
  phase,
  field,
  label,
  forceVisible,
  onOpenGrid,
  shareSlot,
}: {
  progressRef: RefObject<number>;
  total: number;
  currentPos: number;
  phase: Phase;
  field: "ink" | "cream";
  label: string;
  /** Paused / grid-open / reduced-motion — chrome must stay up. */
  forceVisible?: boolean;
  onOpenGrid: () => void;
  shareSlot?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentPosRef = useRef(currentPos);
  const phaseRef = useRef(phase);
  const [idleHidden, setIdleHidden] = useState(false);

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

  useEffect(() => {
    if (reduceMotion) return; // always visible — discoverability over purity
    let timeout: ReturnType<typeof setTimeout> | null = null;
    function wake() {
      setIdleHidden(false);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setIdleHidden(true), IDLE_MS);
    }
    wake();
    window.addEventListener("pointerdown", wake, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", wake, { capture: true });
      if (timeout) clearTimeout(timeout);
    };
  }, [reduceMotion]);

  const chromeVisible = !idleHidden || !!forceVisible || !!reduceMotion;
  const fadeStyle = {
    opacity: chromeVisible ? 1 : 0,
    transition: `opacity ${chromeVisible ? SHOW_MS : HIDE_MS}ms ease`,
  };
  const buttonFadeStyle = {
    opacity: chromeVisible ? 1 : 0.4,
    transition: `opacity ${chromeVisible ? SHOW_MS : HIDE_MS}ms ease`,
  };

  const track = field === "ink" ? "bg-cream/25" : "bg-ink/20";
  const fill = field === "ink" ? "bg-cream" : "bg-ink";
  const text = field === "ink" ? "text-cream" : "text-ink";

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 px-3"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      <div className="flex gap-1" style={fadeStyle}>
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
        <span className="t-label opacity-90" style={fadeStyle}>
          {label}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3" style={fadeStyle}>
            {shareSlot}
            <MuteButton />
          </div>
          <button
            onClick={onOpenGrid}
            aria-label="Story grid"
            className="text-lg leading-none opacity-90"
            style={buttonFadeStyle}
          >
            &#8862;
          </button>
        </div>
      </div>
    </div>
  );
}
