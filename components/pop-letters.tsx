"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The "site feels alive" primitive (§11.7 build2.md) — bubbly per-letter
 * pops with spring overshoot. FILLED TYPE ONLY: never combine with
 * `.text-outline-*` (the SVG stroke filter needs the pinned static glyph
 * the outline was traced against — animating scale/rotate per letter would
 * desync the filter from its source shape).
 */
export function PopLetters({
  text,
  className,
  profile = "default",
  wave = false,
}: {
  text: string;
  className?: string;
  profile?: "default" | "fast";
  wave?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const staggerMs = profile === "fast" ? 24 : 45;
  const letters = [...text];

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {letters.map((ch, i) => {
        // Deterministic pseudo-random rotation in [-8, 8] degrees — no
        // Math.random, so server and client render identically.
        const r = ((i * 37) % 17) - 8;
        const popDelay = (i * staggerMs) / 1000;
        const letter = (
          <motion.span
            className="inline-block"
            style={{ whiteSpace: "pre" }}
            initial={{ opacity: 0, scale: 0, rotate: r, y: 14 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18, delay: popDelay }}
          >
            {ch}
          </motion.span>
        );
        if (!wave) return <span key={i}>{letter}</span>;
        // The wave loop is a SEPARATE outer animation so it never replays
        // the entrance — it only starts once the pop has landed.
        return (
          <motion.span
            key={i}
            className="inline-block"
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: popDelay + 0.4 + i * 0.09,
            }}
          >
            {letter}
          </motion.span>
        );
      })}
    </span>
  );
}
