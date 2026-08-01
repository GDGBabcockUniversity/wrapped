"use client";

import { motion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { PopLetters } from "@/components/pop-letters";
import { IdleFloat } from "@/components/idle-float";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { SPRING } from "@/lib/stories";
import { GROUP_CHAT } from "@/lib/content/chapter";
import type { Snapshot } from "@/lib/snapshot";

/**
 * Your loudest day (build spec §06) — the one beat with no existing story
 * component behind it.
 *
 * Built from the same primitives as the rest of the deck rather than as plain
 * text on a fade: the date slam-assembles, the line pops letter by letter, and
 * the count lands on a spring. A beat that arrives quieter than its neighbours
 * reads as unfinished even when the words are right.
 *
 * TODO(pipeline): per-member daily max joined to the events table. Until that
 * lands this is the CHAPTER's loudest day, and the copy says so — "nobody was
 * okay", not "you".
 */
export function LoudestDay({ snapshot }: { snapshot: Snapshot | null }) {
  const mine = snapshot?.messages.matched ? snapshot.messages.count : 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <AmbientScribbles field="ink" />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="t-label text-cream/55"
      >
        EVERYONE HAS ONE DAY THE CHAT REMEMBERS
      </motion.p>

      <IdleFloat y={-4} duration={6} delay={0.8}>
        <SlamStat
          value={GROUP_CHAT.busiestDay.label}
          className="t-display text-cream leading-none"
          style={{ fontSize: "clamp(2.75rem, 16vw, 6rem)" }}
        />
      </IdleFloat>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.35 }}
        className="max-w-sm"
      >
        <PopLetters text={GROUP_CHAT.busiestDay.line} profile="fast" />
      </motion.div>

      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING.stamp, delay: 0.9 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="t-display text-gdg-green leading-none"
              style={{ fontSize: "clamp(2rem, 11vw, 4rem)" }}>
          {GROUP_CHAT.busiestDay.count.toLocaleString("en-US")}
        </span>
        <span className="t-label text-cream/60">MESSAGES IN ONE DAY</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="t-body text-cream/70 text-sm"
      >
        {mine > 0 ? "Nobody was okay that night." : "You missed it. Probably for the best."}
      </motion.p>
    </div>
  );
}
