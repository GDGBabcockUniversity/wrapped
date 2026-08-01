"use client";

import { motion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { PopLetters } from "@/components/pop-letters";
import { IdleFloat } from "@/components/idle-float";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { SPRING } from "@/lib/stories";
import type { Snapshot } from "@/lib/snapshot";

/**
 * Your loudest day (build spec §06).
 *
 * This beat is a memory, not a metric — no leaderboard, no comparison — and
 * it is the one most likely to be screenshotted with a caption. Which is why
 * it has to be THEIR day: group their messages by day, take the max, join to
 * the events table on the date.
 *
 * A quiet member gets their own version rather than being skipped. Everyone
 * has one day they were louder than usual, and telling someone with forty
 * messages a year which of those days was their loudest is a better line than
 * silence.
 */
export function LoudestDay({ snapshot }: { snapshot: Snapshot | null }) {
  const day = snapshot?.loudestDay ?? null;
  if (!day) return null;
  const loud = day.count >= 40;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <AmbientScribbles field="ink" />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="t-label text-cream/55"
      >
        {loud ? "EVERYONE HAS ONE DAY THE CHAT REMEMBERS" : "YOU PICKED YOUR MOMENTS"}
      </motion.p>

      <IdleFloat y={-4} duration={6} delay={0.8}>
        <SlamStat
          value={day.dateLabel}
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
        <PopLetters text={day.eventName ?? "No excuse. Just a good night."} profile="fast" />
      </motion.div>

      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING.stamp, delay: 0.9 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="t-display text-gdg-green leading-none"
              style={{ fontSize: "clamp(2rem, 11vw, 4rem)" }}>
          {day.count.toLocaleString("en-US")}
        </span>
        <span className="t-label text-cream/60">
          MESSAGES, {day.startHour} TO {day.endHour}
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="t-body text-cream/70 text-sm"
      >
        {loud ? "You were not okay that night." : "Everyone has one."}
      </motion.p>
    </div>
  );
}
