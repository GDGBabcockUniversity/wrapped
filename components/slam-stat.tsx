"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";

/**
 * The slice-assemble monument numeral (build4 §5.1) — replaces count-up
 * where the number is monumental: it arrives whole, sliced into three
 * horizontal bands that are momentarily offset and converge, not counted
 * up. Count-up survives only where the metaphor earns it (the-year's
 * receipt prints; law 3's explicit carve-out) — everywhere else a big
 * stat slams.
 */

const SLICE_CLIPS = ["inset(0 0 66.6% 0)", "inset(33.3% 0 33.3% 0)", "inset(66.6% 0 0 0)"];
const SLICE_OFFSETS = [-14, 18, -10];
const SLICE_TRANSITION = { duration: 0.24, ease: [0.83, 0, 0.17, 1] as const };

export function SlamStat({
  value,
  suffix = "",
  className,
  style,
}: {
  /** A number gets locale formatting + `suffix`; a string (e.g. a chapter
      title) passes through verbatim — same slice-assemble treatment either
      way (build4 §10B.3: the credits' chapter-card slam). */
  value: number | string;
  suffix?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();
  const fired = useRef(false);
  const text = typeof value === "number" ? value.toLocaleString("en-US") + suffix : value;

  useEffect(() => {
    if (fired.current || reduceMotion) return;
    fired.current = true;
    vibrate(10);
    playSfx("thud");
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <p className={className} style={style}>
        {text}
      </p>
    );
  }

  return (
    <motion.div
      className="relative"
      initial={{ scale: 1.04 }}
      animate={{ scale: 1 }}
      transition={SPRING.stamp}
    >
      {/* Invisible sizer — reserves the box the three absolute slices paint into. */}
      <p className={`${className ?? ""} invisible`} style={style} aria-hidden="true">
        {text}
      </p>
      {SLICE_CLIPS.map((clip, i) => (
        <motion.p
          key={i}
          aria-hidden={i > 0}
          className={`${className ?? ""} absolute inset-0`}
          style={{ ...style, clipPath: clip }}
          initial={{ x: SLICE_OFFSETS[i] }}
          animate={{ x: 0 }}
          transition={{ ...SLICE_TRANSITION, delay: i * 0.04 }}
        >
          {text}
        </motion.p>
      ))}
    </motion.div>
  );
}
