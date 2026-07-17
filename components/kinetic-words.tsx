"use client";

import { motion } from "motion/react";
import { TIMING } from "@/lib/stories";

/**
 * Setup-line entrance (§3.8): each word animates its real variable font
 * weight 300→700, staggered — not a scale trick. Never pair with
 * `.text-outline-*` (the stroke filter needs the pinned 700).
 */
export function KineticWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="kinetic inline-block"
          initial={{ "--wght": 300, opacity: 0, y: 8 } as unknown as Record<string, number>}
          animate={{ "--wght": 700, opacity: 1, y: 0 } as unknown as Record<string, number>}
          transition={{ duration: 0.5, delay: (i * TIMING.staggerMs) / 1000 }}
          style={{ marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
