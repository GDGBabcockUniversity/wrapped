"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Counter } from "@/components/counter";
import { IdleFloat } from "@/components/idle-float";
import { PopLetters } from "@/components/pop-letters";
import { CHAPTER } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import type { StoryProps } from "./types";

// Four cuts across a 5s setup beat — each line sits ~1.15s, the closer
// ("We kept the receipts.") holds 1.5s. Cadence rule (§11.4): short lines
// cut fast enough to feel like acceleration, long enough to be read twice.
const CUT_DELAYS_MS = [0, 1150, 2300, 3500];

function ColdOpenLine({ entry }: { entry: (typeof copy.theYear.coldOpen)[number] }) {
  if (!("accentWord" in entry) || !entry.accentWord) {
    return <PopLetters text={entry.line} profile="fast" />;
  }
  const idx = entry.line.indexOf(entry.accentWord);
  const before = entry.line.slice(0, idx);
  const after = entry.line.slice(idx + entry.accentWord.length);
  return (
    <>
      {before && <PopLetters text={before} profile="fast" />}
      <PopLetters text={entry.accentWord} profile="fast" className="text-gdg-blue" />
      {after && <PopLetters text={after} profile="fast" />}
    </>
  );
}

/**
 * The cold open (§11.4 build2.md): a hard-cut three-line title sequence —
 * full-bleed field inversions, no crossfade between cuts, a haptic on each
 * cut. Replaces the old single "What a year." setup line.
 */
function ColdOpen() {
  const [cut, setCut] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    vibrate(8);
    const timers = CUT_DELAYS_MS.slice(1).map((delay) =>
      setTimeout(() => {
        setCut(CUT_DELAYS_MS.indexOf(delay));
        vibrate(8);
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const entry = copy.theYear.coldOpen[cut]!;
  const isInk = entry.field === "ink";

  return (
    <div
      key={cut}
      className={`absolute inset-0 flex items-center justify-center px-6 text-center ${
        isInk ? "bg-ink text-cream" : "bg-cream text-ink"
      }`}
    >
      <p
        className="t-display"
        style={{
          fontSize: "clamp(2.6rem, 13cqw, 5rem)",
          ...(cut === 0 ? ({ viewTransitionName: "wrapped-title" } as React.CSSProperties) : {}),
        }}
      >
        {reduceMotion ? entry.line : <ColdOpenLine entry={entry} />}
      </p>
    </div>
  );
}

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
    return <ColdOpen />;
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
        {/* §10.5: the receipt PRINTS — rows emerge top-to-bottom behind a
            linear clip wipe, like paper coming off the till roll. */}
        <motion.div
          className="flex flex-col gap-3 py-4"
          initial={{ clipPath: reduceMotion ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.2, ease: "linear", delay: 0.3 }}
        >
          {copy.theYear.rows.map((row, i) => (
            <ReceiptRow
              key={row.key}
              label={row.label}
              value={VALUES[row.key] ?? 0}
              suffix={row.key === "members" ? "+" : undefined}
              delayMs={i * TIMING.staggerMs}
            />
          ))}
        </motion.div>
        <p className="t-label text-center opacity-70 pt-3 border-t border-dashed border-ink/30">
          {copy.theYear.footer}
        </p>
        {/* The tear-off: perforation kicks once as printing finishes. */}
        <motion.div
          className="perforation -mx-5 -mb-6 mt-4"
          animate={reduceMotion ? {} : { rotate: [0, 1.2, 0] }}
          transition={{ duration: 0.3, delay: 1.5 }}
        />
      </motion.div>
      </IdleFloat>
    </div>
  );
}
