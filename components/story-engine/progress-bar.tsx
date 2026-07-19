"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { RefObject, ReactNode } from "react";
import { MuteButton } from "./mute-button";
import type { Phase } from "./use-story-state";

const IDLE_MS = 1800;
const HIDE_MS = 400;
const SHOW_MS = 150;
const AWAKE_OPACITY = 0.8;
const IDLE_OPACITY = 0.35;
const BUTTON_AWAKE_OPACITY = 0.6;
const BUTTON_IDLE_OPACITY = 0.3;

/**
 * The whisper rail (build5 §2): a thin vertical bar hugging the right edge,
 * one segment per story. Chrome exists for the visitor's thumb, not their
 * eyes — it dims when idle but never fully vanishes (law 8), and it never
 * announces the current story's name; that lives in the chapter grid.
 *
 * EVERY segment's fill is painted imperatively on every frame — past
 * segments 1, future 0, current segment from the engine's progress ref.
 * React never writes these transforms: mixing declarative resets with
 * imperative writes leaves stale fills behind on back-navigation (React
 * can't diff a DOM mutation it didn't make).
 */
export function ProgressBar({
  progressRef,
  total,
  currentPos,
  phase,
  field,
  forceVisible,
  onOpenGrid,
  shareSlot,
}: {
  progressRef: RefObject<number>;
  total: number;
  currentPos: number;
  phase: Phase;
  field: "ink" | "cream";
  /** Paused / grid-open / reduced-motion — chrome must stay awake. */
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
        node.style.transform = `scaleY(${scale})`;
      }
      raf = requestAnimationFrame(paint);
    }
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  useEffect(() => {
    if (reduceMotion) return; // always awake — discoverability over purity
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

  const chromeAwake = !idleHidden || !!forceVisible || !!reduceMotion;
  const railStyle = {
    opacity: chromeAwake ? AWAKE_OPACITY : IDLE_OPACITY,
    transition: `opacity ${chromeAwake ? SHOW_MS : HIDE_MS}ms ease`,
  };
  const buttonStyle = {
    opacity: chromeAwake ? BUTTON_AWAKE_OPACITY : BUTTON_IDLE_OPACITY,
    transition: `opacity ${chromeAwake ? SHOW_MS : HIDE_MS}ms ease`,
  };

  const track = field === "ink" ? "bg-cream/20" : "bg-ink/15";
  const fill = field === "ink" ? "bg-cream" : "bg-ink";
  const text = field === "ink" ? "text-cream" : "text-ink";
  // build6 §2.8: a soft scrim behind the corner chrome — it sat unreadable
  // over a busy ambient layer (the group-chat stripe band). Darkens behind
  // light (cream) icons on ink fields, lightens behind dark (ink) icons on
  // cream fields — same "whisper, never invisible" contract either way.
  const scrimRgb = field === "ink" ? "15 15 15" : "255 246 224";

  return (
    <>
      {/* The rail — monochrome, no accent (law 2: accent belongs to moving
          story elements, and law 8: this must not compete for attention). */}
      <div
        className="absolute right-[6px] z-20 flex flex-col"
        style={{
          top: "max(24px, calc(env(safe-area-inset-top) + 12px))",
          bottom: "max(24px, calc(env(safe-area-inset-bottom) + 12px))",
          gap: "4px",
          ...railStyle,
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const active = i === currentPos;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full overflow-hidden ${track}`}
              style={{ width: active ? 3 : 2, marginLeft: active ? 0 : 0.5 }}
            >
              <div
                ref={(node) => {
                  fillRefs.current[i] = node;
                }}
                className={`w-full h-full origin-top ${fill}`}
                style={{
                  transform: "scaleY(0)",
                  opacity: i < currentPos ? 0.55 : 1,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Corner chrome — share chip, mute, grid. No persistent story label:
          a viewer who wants orientation opens the grid. */}
      <div
        className={`absolute right-3 z-20 flex items-center gap-3 ${text}`}
        style={{
          top: "max(12px, calc(env(safe-area-inset-top) + 4px))",
          background: `radial-gradient(closest-side, rgb(${scrimRgb} / 0.35), transparent)`,
          borderRadius: "9999px",
          padding: "2px 6px",
        }}
      >
        <div className="flex items-center gap-3" style={railStyle}>
          {shareSlot}
          <MuteButton />
        </div>
        <button
          onClick={onOpenGrid}
          aria-label="Story grid"
          className="text-base leading-none"
          style={buttonStyle}
        >
          &#8862;
        </button>
      </div>
    </>
  );
}
