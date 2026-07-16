"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { TIMING } from "@/lib/stories";

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
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (reduceMotion) {
      onCompleteRef.current?.();
      return;
    }

    const controls = animate(0, value, {
      duration: (durationMs ?? TIMING.countUpMs) / 1000,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => controls.stop();
  }, [active, value, durationMs, reduceMotion]);

  const shown = reduceMotion ? value : display;

  return (
    <span className={className}>
      {shown.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
