"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Slow perpetual drift for a reveal's protagonist — the §9 journey rule:
 * after the entrance lands, NOTHING on screen sits perfectly still for the
 * rest of the beat. Transform-only (compositor-friendly), mirror-looped,
 * disabled under reduced motion.
 */
export function IdleFloat({
  children,
  className,
  y = -4,
  scale,
  duration = 5,
  delay = 1,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  scale?: number;
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, y], ...(scale ? { scale: [1, scale] } : {}) }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
