"use client";

import { AnimatePresence, motion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { coldOpen } from "@/lib/deck-copy";
import type { Snapshot } from "@/lib/snapshot";

/**
 * The cold open (build spec §00), on the drop.
 *
 * Three lines over MCBH's refrain, with the brand mark holding one bar before
 * it gets out of the way.
 *
 * What it replaces is the old overture — a cover card, a numeral drive-through
 * and a calm resolve, all of it about the chapter. Three lines that put the
 * member inside the deck before anything about GDG appears is the whole
 * argument of §1 in seventeen seconds.
 */

/**
 * Cues in seconds from the START OF THE BEAT, which is now 0:18 of the track.
 *
 * They were the intro's spoken phrases (5.91, 10.87, 14.85) and became
 * meaningless the moment the deck stopped playing the intro. On the refrain
 * the phrasing is even — the LRC puts its four phrases 4.31 / 4.16 / 4.23 /
 * 4.17s apart — so the lines sit two bars apart and land with it.
 */
const BAR = 2.1053; // 114 BPM, measured
const CUES = [0, BAR, BAR * 3, BAR * 5];

export function ColdOpen({ atSec, snapshot }: { atSec: number; snapshot: Snapshot | null }) {
  const lines = coldOpen(snapshot);
  let index = 0;
  for (let i = 0; i < CUES.length; i++) if (atSec >= CUES[i]!) index = i;
  const line = lines[index];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <AmbientScribbles field="ink" />
      {/* A soft floor under the type. The field moves behind the whole beat,
          and white-on-moving-pattern is the one place this deck loses legibility. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgb(15 15 15 / 0.85), transparent)" }}
      />

      {/* The mark holds through the first phrase and then gets out of the way,
          shrinking to a corner rather than cutting, so the deck never looks
          like it restarted. */}
      <motion.div
        animate={index === 0 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.42, opacity: 0.5, y: -140 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-2"
      >
        <span className="t-label text-cream/50" style={{ fontSize: "0.6rem" }}>
          GDG ON CAMPUS BABCOCK
        </span>
        <span
          className="text-outline-base text-outline-cream leading-none"
          style={{ fontSize: "clamp(2.5rem, 13vw, 5.5rem)" }}
        >
          WRAPPED
        </span>
        <span className="t-display text-gdg-blue" style={{ fontSize: "clamp(1.1rem, 6vw, 2.2rem)" }}>
          2025&ndash;26
        </span>
      </motion.div>

      <AnimatePresence mode="wait">
        {line?.text && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-sm"
          >
            <span className="t-display text-cream" style={{ fontSize: "clamp(1.4rem, 6.5vw, 2.4rem)" }}>
              <PopLetters text={line.text} profile="fast" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
