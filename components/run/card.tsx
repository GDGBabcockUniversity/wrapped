"use client";

import { motion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { assignTitle } from "@/lib/titles";
import { DECK_CLUBS, roleFor } from "@/lib/deck-clubs";
import { eraFor } from "@/lib/deck-copy";
import type { Snapshot } from "@/lib/snapshot";

/**
 * Your card (build spec §12).
 *
 * A card gets screenshotted when it makes one arguable, specific claim — not
 * when it is a well-organised table. So the hierarchy is deliberate and the
 * title is the biggest thing on it:
 *
 *   1  the title
 *   2  club + role
 *   3  era
 *   4  events / messages / PEOPLE
 *   5  the generated line
 *
 * Stat 4 carries PEOPLE rather than tenure, because the era already carries
 * tenure and the social number is the more surprising one.
 */

/** One sentence from the member's three strongest facts. Falls back rather
    than printing an awkward half-sentence. */
export function generatedLine(s: Snapshot): string {
  const events = s.events.checkins;
  const msgs = s.messages.matched ? s.messages.count : 0;
  const reads = s.radar?.reads ?? 0;

  if (events >= 8 && msgs >= 800 && reads > 0) {
    return `Showed up ${events} times, said ${msgs.toLocaleString("en-US")} things, kept reading.`;
  }
  if (events <= 2 && msgs >= 300) {
    return `${events} events, ${msgs.toLocaleString("en-US")} messages. Priorities.`;
  }
  if (events >= 8 && msgs < 200) {
    return "In the room for all of it, saying almost nothing.";
  }
  if (s.tenureMonths >= 8 && events >= 4) {
    return `${s.tenureMonths} months, no gaps.`;
  }
  return "PRESENT & COUNTED";
}

export function Card({ snapshot }: { snapshot: Snapshot | null }) {
  if (!snapshot) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <AmbientScribbles field="ink" />
        <p className="t-label text-cream/50">GDG&middot;BABCOCK&middot;2025&ndash;26</p>
        <p className="t-display text-cream" style={{ fontSize: "clamp(1.5rem,7vw,2.6rem)" }}>
          Be on this card next year.
        </p>
      </div>
    );
  }

  const z: Record<string, number> = {
    messages: snapshot.messages.matched ? Math.min(3, snapshot.messages.count / 400) : 0,
    checkins: Math.min(3, snapshot.events.checkins / 8),
    reads: snapshot.radar ? Math.min(3, snapshot.radar.reads / 12) : 0,
    plays: snapshot.radar ? Math.min(3, snapshot.radar.plays / 20) : 0,
  };
  const tier = snapshot.standing.percentile <= 15 ? "A" : snapshot.standing.percentile <= 50 ? "B" : "C";
  const title = assignTitle({ z, tier });
  const club = DECK_CLUBS[snapshot.club.id];
  const role = roleFor(snapshot.club.id, snapshot.events.checkins);
  const msgs = snapshot.messages.matched ? snapshot.messages.count : 0;
  // TODO(pipeline): distinct co-attendees. Until the graph is derived this is
  // rooms, which is the honest number we have rather than a guessed one.
  const people = snapshot.events.checkins;

  const stat = (v: string, l: string) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="t-display text-cream leading-none" style={{ fontSize: "clamp(1rem,5vw,1.5rem)" }}>{v}</span>
      <span className="t-label text-cream/45" style={{ fontSize: "0.45rem" }}>{l}</span>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <AmbientScribbles field="ink" />

      <IdleFloat y={-3} duration={7} delay={0.9}>
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          transition={{ type: "spring", stiffness: 190, damping: 24 }}
          className="flex flex-col items-center gap-3 border border-cream/20 bg-ink/70 rounded-sm px-6 py-7 w-full max-w-xs"
        >
          <span className="t-label text-cream/45" style={{ fontSize: "0.5rem" }}>
            {snapshot.name}
          </span>
          <SlamStat
            value={title.title}
            className="t-display text-cream leading-none"
            style={{ fontSize: "clamp(1.4rem, 8vw, 2.4rem)" }}
          />

          <p className="t-label" style={{ color: club.hex, fontSize: "0.6rem" }}>
            {club.name} &middot; {role}
          </p>

          <p className="t-label text-cream/45" style={{ fontSize: "0.55rem" }}>
            {eraFor(snapshot.joinDate)}
          </p>

          <div className="mt-2 flex items-start justify-center gap-5 border-t border-cream/15 pt-4 w-full">
            {stat(String(snapshot.events.checkins), "EVENTS")}
            {stat(msgs.toLocaleString("en-US"), "MESSAGES")}
            {stat(String(people), "PEOPLE")}
          </div>

          <p className="t-body text-cream/70 text-xs mt-2 max-w-[16rem]">
            {generatedLine(snapshot)}
          </p>

          <p className="t-label text-cream/25 mt-1" style={{ fontSize: "0.45rem" }}>
            GDG&middot;BABCOCK&middot;2025&ndash;26
          </p>
        </motion.div>
      </IdleFloat>

      {/* §4: The 100 is a footer link under the card, not a beat. A house ad
          one screen before the emotional payoff kills the payoff. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex gap-4"
      >
        <a href="https://babcock100.com" target="_blank" rel="noopener noreferrer"
           className="t-label text-cream/40 underline underline-offset-4" style={{ fontSize: "0.55rem" }}>
          See The 100
        </a>
        <a href="https://gdgbabcock.com" target="_blank" rel="noopener noreferrer"
           className="t-label text-cream/40 underline underline-offset-4" style={{ fontSize: "0.55rem" }}>
          Join GDG Babcock
        </a>
      </motion.div>
    </div>
  );
}
