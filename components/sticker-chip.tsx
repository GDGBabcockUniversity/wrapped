"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING } from "@/lib/stories";

/**
 * The slapped-on label (build4 §7.2) — a paper tag mount-animated in, never
 * faded. `style.rotate` is pinned to 0 because the `.sticker-chip` class's
 * own static `rotate: -1.5deg` (a standalone CSS transform property) would
 * otherwise COMPOSE with Motion's transform-based rotate instead of being
 * replaced by it, doubling the tilt. Motion owns the whole -6° → -1.5°
 * sweep here; the class only supplies the resting value as a fallback.
 */
export function StickerChip({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className={`sticker-chip ${className ?? ""}`}
      style={{ rotate: 0 }}
      initial={reduceMotion ? { rotate: -1.5 } : { scale: 1.25, rotate: -6, opacity: 0 }}
      animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
      transition={reduceMotion ? { duration: 0.01 } : SPRING.stamp}
    >
      {children}
    </motion.span>
  );
}
