"use client";

import { motion, useReducedMotion } from "motion/react";
import { Counter } from "@/components/counter";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";

const TIER_LABEL: Record<string, string> = {
  top1: "1",
  top5: "5",
  top10: "10",
  top25: "25",
};

function Seal() {
  const id = "standing-seal-path";
  return (
    <svg width="0" height="0" aria-hidden>
      <defs>
        <path id={id} d="M 4,54 A 50,50 0 1 1 104,54" fill="none" />
      </defs>
    </svg>
  );
}

export function StandingStory({ phase, snapshot, guest }: StoryProps) {
  const reduceMotion = useReducedMotion();

  if (guest) return null; // guests never see this story — engine skips it entirely

  const isTier = snapshot ? snapshot.standing.tier !== "member" : false;

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-cream text-ink px-6 pt-20 pb-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="t-display text-center"
        >
          {isTier ? copy.standing.setup : copy.standing.setupQuiet}
        </motion.p>
      </div>
    );
  }

  if (!snapshot) return null;

  if (isTier) {
    const tierNum = TIER_LABEL[snapshot.standing.tier] ?? String(snapshot.standing.percentile);
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-ink px-6 pt-20 pb-16 gap-6 text-center overflow-hidden">
        <Seal />
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
          <motion.svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="110"
              cy="110"
              r="95"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="text-ink/30"
            />
            <text fontSize="11" fontWeight={700} letterSpacing="0.15em" fill="currentColor" className="text-ink/60">
              <textPath href="#standing-seal-path" startOffset="0%">
                {copy.standing.sealText}
              </textPath>
            </text>
          </motion.svg>
          <motion.p
            initial={{ scale: 1.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            transition={reduceMotion ? { duration: 0.01 } : SPRING.stamp}
            className="t-monument text-gdg-red leading-none relative z-10"
            style={{ fontSize: "clamp(3.5rem, 22cqw, 6rem)" }}
          >
            {fmt(copy.standing.revealTier, { percentile: tierNum })}
          </motion.p>
        </div>
        <p className="t-body text-ink/65">{copy.standing.revealTierSub}</p>
      </div>
    );
  }

  const matched = snapshot.messages.matched;
  // Both unmatched AND zero check-ins: no numbers at all, not even a "0" —
  // the "never shame" rule (§15) means this variant is pure warm copy.
  const showLow = !matched && snapshot.flags.zeroCheckins;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-ink px-6 pt-20 pb-16 gap-6 text-center">
      <p className="t-display">{copy.standing.revealStats}</p>
      {!showLow && (
        <div className={`flex ${matched ? "gap-8" : ""} items-center justify-center`}>
          {matched && (
            <div>
              <Counter value={snapshot.messages.count} className="t-stat" active />
              <p className="t-label text-ink/45 mt-1">{copy.standing.statMessages}</p>
            </div>
          )}
          <div>
            <Counter value={snapshot.events.checkins} className="t-stat" active />
            <p className="t-label text-ink/45 mt-1">{copy.standing.statEvents}</p>
          </div>
        </div>
      )}
      <p className="t-body text-ink/65">
        {showLow ? copy.standing.lowSub : copy.standing.revealStatsSub}
      </p>
    </div>
  );
}
