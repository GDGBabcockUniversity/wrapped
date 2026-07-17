"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Counter } from "@/components/counter";
import { IdleFloat } from "@/components/idle-float";
import { KineticWords } from "@/components/kinetic-words";
import { CHAPTER } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import type { StoryProps } from "./types";

const VALUES: Record<string, number> = {
  eventsRun: CHAPTER.eventsRun,
  members: CHAPTER.members,
  productsShipped: CHAPTER.productsShipped,
  totalCheckins: CHAPTER.totalCheckins,
  messagesParsed: CHAPTER.messagesParsed,
};

function ReceiptRow({ label, value, suffix, delayMs }: { label: string; value: number; suffix?: string; delayMs: number }) {
  const [flash, setFlash] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delayMs / 1000 }}
      className="flex items-baseline"
    >
      <Counter
        value={value}
        suffix={suffix}
        durationMs={TIMING.countUpMs}
        className={`t-stat transition-colors duration-300 ${flash ? "text-gdg-blue" : "text-ink"}`}
        active
        onComplete={() => {
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
        }}
      />
      <span className="leader text-ink" />
      <span className="t-label text-ink/70 whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

export function TheYearStory({ phase }: StoryProps) {
  const reduceMotion = useReducedMotion();

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-cream px-6 pt-20 pb-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none"
        >
          <span
            className="text-outline-base text-outline-cream whitespace-nowrap"
            style={{ fontSize: "30cqw" }}
          >
            2025/26 2025/26
          </span>
        </div>
        <div className="relative flex flex-col items-center gap-3 text-center">
          <p
            className="t-display"
            style={{ viewTransitionName: "wrapped-title" } as React.CSSProperties}
          >
            <KineticWords text={copy.theYear.setup} />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.55, y: 0 }}
            transition={{ duration: 0.24, delay: 0.24 }}
            className="t-body"
          >
            {copy.theYear.setupSub}
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 pt-20 pb-16">
      <IdleFloat y={-3} duration={6} delay={1.4} className="w-full">
      <motion.div
        initial={{ y: 40, rotate: -1.5, opacity: 0 }}
        animate={{ y: 0, rotate: -0.5, opacity: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : SPRING.default}
        className="bg-paper text-ink rounded-sm w-full px-5 py-6"
      >
        <div className="perforation -mx-5 -mt-6 mb-4" />
        <p className="t-label text-center opacity-70 pb-3 border-b border-dashed border-ink/30">
          {copy.theYear.revealLabel}
        </p>
        <div className="flex flex-col gap-3 py-4">
          {copy.theYear.rows.map((row, i) => (
            <ReceiptRow
              key={row.key}
              label={row.label}
              value={VALUES[row.key] ?? 0}
              suffix={row.key === "members" ? "+" : undefined}
              delayMs={i * TIMING.staggerMs}
            />
          ))}
        </div>
        <p className="t-label text-center opacity-70 pt-3 border-t border-dashed border-ink/30">
          {copy.theYear.footer}
        </p>
        <div className="perforation -mx-5 -mb-6 mt-4" />
      </motion.div>
      </IdleFloat>
    </div>
  );
}
