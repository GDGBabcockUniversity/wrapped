"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { PopLetters } from "@/components/pop-letters";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { MONTAGE_BARS } from "@/lib/tempo";
import type { Line } from "@/lib/deck-copy";

/**
 * The year (build spec §02) — five SNAPs, accelerating, then the handoff.
 *
 * The spec has one instruction here and it is absolute: "Never five numbers
 * on one screen. One number per screen is the whole difference between a
 * recap and a dashboard." The receipt that used to render this beat put all
 * five on one till roll, which is a beautiful object and the exact thing the
 * line rules out.
 *
 * SNAPs run 2·2·1·1·½ bars, so the run tightens as it goes. A montage at one
 * speed reads flat however good the numbers are.
 */
export function Montage({
  lines,
  progress,
  field,
}: {
  lines: Line[];
  /** 0..1 through the beat. */
  progress: number;
  field: "ink" | "cream";
}) {
  const ink = field === "ink";
  // Weight the run by the spec's accelerating bar pattern, padding with the
  // last value when a beat carries more lines than the pattern names.
  const weights = lines.map((_, i) => MONTAGE_BARS[i] ?? MONTAGE_BARS.at(-1)!);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const starts = weights.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1]! + weights[i - 1]! / totalW);
    return acc;
  }, []);

  let index = 0;
  for (let i = 0; i < starts.length; i++) if (progress >= starts[i]!) index = i;
  const line = lines[index];
  if (!line) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <AmbientScribbles field={field} />
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 1.03 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3"
        >
          {line.kicker && <StickerChip>{line.kicker}</StickerChip>}

          {line.stat ? (
            <>
              <SlamStat
                value={line.stat}
                className={`t-display leading-none ${ink ? "text-cream" : "text-ink"}`}
                style={{ fontSize: "clamp(3.25rem, 22vw, 8rem)" }}
              />
              <span className={`t-label ${ink ? "text-cream/60" : "text-ink/60"}`}>
                {line.text}
              </span>
            </>
          ) : (
            <span
              className={`t-display ${ink ? "text-cream" : "text-ink"}`}
              style={{ fontSize: "clamp(1.5rem, 7vw, 2.6rem)" }}
            >
              <PopLetters text={line.text} profile="fast" />
            </span>
          )}

          {line.sub && (
            <span className={`t-body text-sm ${ink ? "text-cream/60" : "text-ink/60"}`}>
              {line.sub}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
