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
}: {
  value: number;
  className?: string;
  durationMs?: number;
  suffix?: string;
  active?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current || reduceMotion) return;
    started.current = true;

    const controls = animate(0, value, {
      duration: (durationMs ?? TIMING.countUpMs) / 1000,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
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
