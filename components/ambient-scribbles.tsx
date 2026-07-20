"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useGlQualityContext } from "@/components/gl/quality-context";

/**
 * The hand line-work ambient layer (build4 §6.1) — two thin single-line
 * scribbles that draw in, hold with a slow drift, fade, then redraw as a
 * different variant. Never the accent (law 2: accent lives on the thing
 * that moves in the SHADER layer, not here).
 */

const DRAW_S = 1.6;
const HOLD_MS = 6000;
const FADE_MS = 400;
const CYCLE_MS = DRAW_S * 1000 + HOLD_MS + FADE_MS;
const DRAW_EASE = [0.83, 0, 0.17, 1] as const;

// Both bands live in the stage's true MARGINS (2026-07-20): stories keep
// pt-20/pb-16 clear, so the top band stays above y≈115 and the bottom band
// below y≈660 (of 700). The old bottom range (560–650) ran straight through
// story text — "That's before ORBIT was even an idea." rendered with an
// apparent strikethrough. A scribble may underline the margin; it must
// never slice a line of copy.
const TOP_VARIANTS = [
  "M-10,95 C90,45 210,115 410,55",
  "M-10,70 C140,110 260,35 410,95",
  "M-10,45 C60,100 330,70 410,115",
];
const BOTTOM_VARIANTS = [
  "M-10,678 C120,660 300,698 410,668",
  "M-10,666 C90,694 280,660 410,688",
  "M-10,690 C150,664 250,700 410,662",
];

function ScribbleLine({
  variants,
  holdOpacity,
  startDelayMs,
}: {
  variants: string[];
  holdOpacity: number;
  startDelayMs: number;
}) {
  const [variant, setVariant] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function loop() {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setVisible(false);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setVariant((v) => (v + 1) % variants.length);
              setVisible(true);
              loop();
            }, FADE_MS)
          );
        }, DRAW_S * 1000 + HOLD_MS)
      );
    }
    timers.push(setTimeout(loop, startDelayMs));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [variants.length, startDelayMs]);

  return (
    <motion.g
      animate={{ x: [-8, 8], y: [2, -2] }}
      transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    >
      <motion.path
        key={variant}
        d={variants[variant]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: visible ? holdOpacity : 0 }}
        transition={{
          pathLength: { duration: DRAW_S, ease: DRAW_EASE },
          opacity: { duration: visible ? 0.05 : FADE_MS / 1000 },
        }}
      />
    </motion.g>
  );
}

export function AmbientScribbles({ field }: { field: "ink" | "cream" }) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();
  const colorClass = field === "ink" ? "text-cream/60" : "text-ink/40";
  const holdOpacity = field === "ink" ? 0.5 : 0.35;

  if (reduceMotion || glQuality === "off") {
    return (
      <svg
        viewBox="0 0 400 700"
        preserveAspectRatio="none"
        className={`absolute inset-0 -z-10 w-full h-full pointer-events-none ${colorClass}`}
        aria-hidden
      >
        <path d={TOP_VARIANTS[0]} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={holdOpacity} />
        <path d={BOTTOM_VARIANTS[0]} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={holdOpacity} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 400 700"
      preserveAspectRatio="none"
      className={`absolute inset-0 -z-10 w-full h-full pointer-events-none ${colorClass}`}
      aria-hidden
    >
      <ScribbleLine variants={TOP_VARIANTS} holdOpacity={holdOpacity} startDelayMs={0} />
      <ScribbleLine variants={BOTTOM_VARIANTS} holdOpacity={holdOpacity} startDelayMs={CYCLE_MS / 2} />
    </svg>
  );
}
