"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { TIMING } from "@/lib/stories";

/**
 * Count-up number. The rolling value is written to the DOM imperatively
 * (textContent via ref) — NEVER through setState — so five simultaneous
 * counters cost zero React re-renders per frame. This is the difference
 * between smooth and laggy on a mid-range phone.
 */
export function Counter({
  value,
  className,
  durationMs,
  suffix = "",
  active = true,
  onComplete,
}: {
  value: number;
  className?: string;
  durationMs?: number;
  suffix?: string;
  active?: boolean;
  onComplete?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (reduceMotion) {
      if (nodeRef.current) nodeRef.current.textContent = value.toLocaleString("en-US") + suffix;
      onCompleteRef.current?.();
      return;
    }

    const controls = animate(0, value, {
      duration: (durationMs ?? TIMING.countUpMs) / 1000,
      ease: "easeOut",
      onUpdate: (v) => {
        if (nodeRef.current) {
          nodeRef.current.textContent = Math.round(v).toLocaleString("en-US") + suffix;
        }
      },
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => controls.stop();
  }, [active, value, durationMs, suffix, reduceMotion]);

  // SSR/first paint shows the final value for reduced motion and crawlers;
  // the animated path starts at 0 and rolls up on mount.
  return (
    <span ref={nodeRef} className={className}>
      {(reduceMotion ? value : 0).toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
