"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import { popLettersStaggerMs } from "@/lib/text-timing";

/**
 * The "site feels alive" primitive (§11.7 build2.md) — bubbly per-letter
 * pops with spring overshoot. FILLED TYPE ONLY: never combine with
 * `.text-outline-*` (the SVG stroke filter needs the pinned static glyph
 * the outline was traced against — animating scale/rotate per letter would
 * desync the filter from its source shape).
 *
 * Words wrap as words (build6 §2.1, law 11): each word is its own
 * `inline-block whitespace-nowrap` box around its letter spans, with a
 * PLAIN text-node space between word boxes — inline-block boxes are atomic
 * (a browser may break between any two of them, never inside one), while a
 * plain space is exactly where a browser IS allowed to break a line. The
 * per-letter stagger index stays global across the whole string so timing
 * is identical to the old flat-letter layout.
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
  // build7 §1: clamp the stagger for long strings so a headline can never
  // typewriter past its own beat and render half before the swap.
  const staggerMs = popLettersStaggerMs(text, profile);
  const words = text.split(" ");

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  let globalIndex = 0;

  return (
    <span className={className}>
      {words.map((word, wordIdx) => {
        const letters = [...word];
        const wordBox = (
          <span key={`w${wordIdx}`} className="inline-block whitespace-nowrap">
            {letters.map((ch) => {
              const i = globalIndex;
              globalIndex += 1;
              // Deterministic pseudo-random rotation in [-8, 8] degrees —
              // no Math.random, so server and client render identically.
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
              // The wave loop is a SEPARATE outer animation so it never
              // replays the entrance — it only starts once the pop has
              // landed.
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
        return (
          <Fragment key={`f${wordIdx}`}>
            {wordBox}
            {wordIdx < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </span>
  );
}
