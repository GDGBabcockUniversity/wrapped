"use client";

import { motion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { KineticWords } from "@/components/kinetic-words";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { SubjectDoodle } from "@/components/subject-doodle";
import { copy, fmt } from "@/lib/copy";
import { TIMING } from "@/lib/stories";
import type { StoryProps } from "./types";

// A hand-drawn radar sweep — concentric arcs plus the sweep line, matching
// the loose single-stroke language of the other subject doodles.
const RADAR_DOODLE = [
  "M60,340 a140,140 0 0 1 280,0",
  "M110,340 a90,90 0 0 1 180,0",
  "M160,340 a40,40 0 0 1 80,0",
  "M200,340 L310,250",
];

/** Title-cases a game id ("wordle", "rapid-fire") for display. */
function gameLabel(game: string): string {
  return game
    .split(/[-_:]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function YourRadarStory({ phase, snapshot }: StoryProps) {
  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-4">
        <SubjectDoodle paths={RADAR_DOODLE} className="w-28 h-28" />
        <p className="t-display text-center">
          <KineticWords text={copy.yourRadar.setup} />
        </p>
      </div>
    );
  }

  // The story is skipped for anyone without radar data (lib/stories.ts
  // skipsForSnapshot), so this is a defensive floor rather than a real state.
  const radar = snapshot?.radar;
  if (!radar) return null;

  // Reads lead when there are any; otherwise the games carry the slide.
  const leadsWithReads = radar.reads > 0;
  const headline = leadsWithReads ? radar.reads : radar.plays;

  const lines: string[] = [];
  if (leadsWithReads) {
    lines.push(
      radar.reads === 1
        ? copy.yourRadar.readsRevealOne
        : fmt(copy.yourRadar.readsReveal, { reads: radar.reads })
    );
    lines.push(
      radar.readingMinutes > 0
        ? fmt(copy.yourRadar.minutes, { minutes: radar.readingMinutes })
        : copy.yourRadar.minutesShort
    );
    if (radar.plays > 0) {
      lines.push(fmt(copy.yourRadar.plays, { plays: radar.plays }));
    }
  } else {
    lines.push(fmt(copy.yourRadar.playsOnly, { plays: radar.plays }));
  }

  const footnotes: string[] = [];
  if (radar.longestStreak > 1) {
    footnotes.push(fmt(copy.yourRadar.streak, { streak: radar.longestStreak }));
  }
  if (radar.topGame) {
    footnotes.push(
      fmt(copy.yourRadar.topGame, { game: gameLabel(radar.topGame) })
    );
  }
  if (radar.activeDays > 0 && radar.longestStreak <= 1) {
    footnotes.push(fmt(copy.yourRadar.activeDays, { days: radar.activeDays }));
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-4 text-center">
      <AmbientScribbles field="ink" />
      <IdleFloat y={-2} scale={1.02} duration={3} delay={1.2}>
        <SlamStat
          value={headline}
          className="t-monument text-outline-base text-outline-red leading-none"
          style={{ fontSize: "clamp(6rem, 45cqw, 16rem)" }}
        />
      </IdleFloat>

      {/* Same three-beat payoff as the other personal stories: stat, then
          caption at +1100ms, then the share affordance from ProgressBar. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 1.1 }}
      >
        <p className="t-body">{lines[0]}</p>
        {lines.slice(1).map((line) => (
          <p key={line} className="t-body text-cream/55 mt-1">
            {line}
          </p>
        ))}
      </motion.div>

      {footnotes.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
          {footnotes.map((note, i) => (
            <motion.div
              key={note}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 1.4 + (i * TIMING.staggerMs) / 1000 }}
              className="flex items-center gap-2 justify-center"
            >
              <span className="w-1.5 h-1.5 bg-gdg-red flex-shrink-0" aria-hidden />
              <span className="t-label text-cream/80">{note}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
