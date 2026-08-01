"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { SPRING } from "@/lib/stories";
import { DECK_CLUBS, CLUB_ORDER, clubBecause, roleFor } from "@/lib/deck-clubs";
import type { Snapshot } from "@/lib/snapshot";

/**
 * Your club (build spec §09) — a STOP, not a GATE.
 *
 * Guessing is legitimate here and nowhere else in the deck: a member already
 * has an intuition about whether they are a Builder, and the tap converts
 * that hunch into a verdict they feel they earned. The title beat cannot work
 * this way, which is why it reveals rather than asks.
 *
 * The because-line is mandatory. An unexplained percentile reads as a dice
 * roll; one that names what was measured reads as a diagnosis.
 */
export function ClubBeat({
  snapshot,
  onAnswer,
}: {
  snapshot: Snapshot | null;
  onAnswer: () => void;
}) {
  const [guess, setGuess] = useState<string | null>(null);
  if (!snapshot) return null;

  const club = DECK_CLUBS[snapshot.club.id];
  const checkinPct = snapshot.standing.percentile;
  const messagePct = snapshot.messages.matched
    ? Math.max(1, 100 - Math.min(99, Math.round(snapshot.messages.count / 25)))
    : 90;
  const role = roleFor(snapshot.club.id, snapshot.events.checkins);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
      <AmbientScribbles field="ink" />
      <AnimatePresence mode="wait">
        {!guess ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="t-display text-cream" style={{ fontSize: "clamp(1.3rem, 6vw, 2.1rem)" }}>
              We sorted the whole chapter four ways.
            </p>
            <p className="t-body text-cream/60 text-sm max-w-xs">
              By how you split your time between showing up, speaking up, and building.
            </p>
            <p className="t-label text-gdg-blue mt-2">GUESS YOURS</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {CLUB_ORDER.map((id) => (
                <button
                  key={id}
                  onClick={() => { setGuess(DECK_CLUBS[id].name); onAnswer(); }}
                  className="rounded-full border border-cream/40 px-5 py-3 t-label text-cream active:scale-95 transition-transform"
                >
                  {DECK_CLUBS[id].name}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="t-label text-cream/70"
            >
              {guess === club.name ? "Correct. You know yourself." : "Not quite."}
            </motion.p>

            {/* Cream, not the club's own hex. Each club sits on a shader
                field tinted with that same colour, so colouring the word in it
                puts red on red — CATALYST was all but unreadable. The hex
                belongs on the rule beneath, where it identifies without
                competing. */}
            <IdleFloat y={-3} duration={6} delay={1}>
              <div className="flex flex-col items-center gap-2">
                <SlamStat
                  value={club.name}
                  className="t-display text-cream leading-none"
                  style={{ fontSize: "clamp(2.25rem, 13vw, 4.5rem)" }}
                />
                <span className="block h-[3px] w-16 rounded-full" style={{ background: club.hex }} />
              </div>
            </IdleFloat>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.35 }}
              className="t-body text-cream/80 text-sm max-w-xs"
            >
              {club.definition}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING.stamp, delay: 1 }}
              className="mt-1 flex flex-col items-center gap-1"
            >
              <span className="t-label text-cream/40" style={{ fontSize: "0.5rem" }}>YOUR ROLE</span>
              <span className="t-display text-cream" style={{ fontSize: "clamp(1.1rem, 5vw, 1.6rem)" }}>
                {role}
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.35 }}
              className="t-body text-cream/50 text-xs max-w-xs mt-1"
            >
              {clubBecause(snapshot.club.id, checkinPct, messagePct)}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
              className="t-label text-cream/35"
              style={{ fontSize: "0.55rem" }}
            >
              {snapshot.club.rarityPct}% OF THE CHAPTER
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
