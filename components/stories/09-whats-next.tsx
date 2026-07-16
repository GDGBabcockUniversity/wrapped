"use client";

import { motion } from "motion/react";
import { copy } from "@/lib/copy";
import type { StoryProps } from "./types";

export function WhatsNextStory({ phase }: StoryProps) {
  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-cream text-ink px-6 pt-20 pb-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="t-editorial text-center"
        >
          {copy.whatsNext.setup}
        </motion.p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-ink px-6 pt-20 pb-16 gap-6 text-center">
      <p className="t-display text-outline-base text-outline-green">
        {copy.whatsNext.revealTitle}
      </p>
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        animate={{ y: [8, -8] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <path
          d="M12 30 L24 16 L36 30"
          stroke="#34a853"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      <p className="t-body text-ink/65">{copy.whatsNext.revealSub}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <a
          href="https://babcock100.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink text-cream px-6 py-3 t-label text-center"
        >
          {copy.whatsNext.ctaHundred}
        </a>
        <a
          href="https://gdgbabcock.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-ink/30 text-ink px-6 py-3 t-label text-center"
        >
          {copy.whatsNext.ctaJoin}
        </a>
      </div>
    </div>
  );
}
