"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The self-drawing illustration (build4 §6.2) — one per designated setup
 * screen, single-line contour, drawn once then held with the same slow
 * drift as the ambient scribbles.
 */
export function SubjectDoodle({ paths, className }: { paths: string[]; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      viewBox="0 0 400 400"
      className={className ?? "w-28 h-28"}
      aria-hidden
      animate={reduceMotion ? undefined : { x: [-8, 8], y: [4, -4] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.8 }
      }
    >
      {paths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.8, ease: [0.83, 0, 0.17, 1] }}
        />
      ))}
    </motion.svg>
  );
}
