"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { KineticWords } from "@/components/kinetic-words";
import { PRODUCTS } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { StripeCircleFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { ACCENT_HEX } from "@/components/gl/shaders";
import type { StoryProps } from "./types";

const BG_CLASS: Record<string, string> = {
  blue: "bg-gdg-blue",
  red: "bg-gdg-red",
  yellow: "bg-gdg-yellow",
  green: "bg-gdg-green",
};
const CHIP_TEXT: Record<string, string> = {
  blue: "text-cream",
  red: "text-cream",
  yellow: "text-ink",
  green: "text-ink",
};

const ACTIVE_CYCLE_MS = 1800;

export function BuiltStory({ phase, active, paused }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();
  const [activeRow, setActiveRow] = useState(0);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    const id = setInterval(() => {
      setActiveRow((r) => (r + 1) % PRODUCTS.length);
    }, ACTIVE_CYCLE_MS);
    return () => clearInterval(id);
  }, [phase, active, paused]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-2">
        <p className="t-display text-center">
          <KineticWords text={copy.built.setup} />
        </p>
        <motion.p
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0.01 } : { ...SPRING.stamp, delay: 0.24 }}
          className="t-display text-outline-base text-outline-cream text-center"
        >
          {copy.built.setupSub}
        </motion.p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col text-cream px-6 pt-20 pb-16">
      {/* Static stand-in for the shader's stripe-circle figure (build4 §2.3). */}
      {glQuality === "off" && <StripeCircleFigure accentHex={ACCENT_HEX.blue} />}
      <AmbientScribbles field="ink" />
      <div className="flex justify-center mb-6">
        <StickerChip className="t-label">{copy.built.revealLabel}</StickerChip>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        {PRODUCTS.map((p, i) => {
          const isActive = i === activeRow;
          return (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, x: -16 }}
              animate={{
                opacity: isActive ? 1 : 0.7,
                // §10.7: the active row swells AND nudges — a physical shove,
                // not just a zoom. Entrance rides the same x channel; after
                // mount the nudge keyframes take over per activation.
                x: isActive ? [0, 4, 0] : 0,
              }}
              transition={{
                opacity: { duration: 0.3 },
                x: { duration: 0.3, delay: (i * TIMING.staggerMs) / 1000 },
              }}
              className="flex items-center gap-4"
            >
              <span
                className="text-cream/40 text-sm"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {p.num}
              </span>
              {/* Redacted bar (build4 §7.1): the bar IS the highlight now —
                  it swells and flips to the product's accent while its row
                  is active, with a subtle tilt-settle (§7.3). */}
              <div className="flex-1">
                <motion.span
                  initial={{ opacity: 0, scaleX: 0.9, y: 10 }}
                  animate={{
                    opacity: 1,
                    scaleX: isActive ? 1.06 : 1,
                    y: 0,
                    rotate: reduceMotion ? 0 : isActive ? [2, 0] : 0,
                  }}
                  transition={{
                    opacity: { ...SPRING.default, delay: (i * TIMING.staggerMs) / 1000 },
                    scaleX: { ...SPRING.default, delay: (i * TIMING.staggerMs) / 1000 },
                    y: { ...SPRING.default, delay: (i * TIMING.staggerMs) / 1000 },
                    rotate: SPRING.default,
                  }}
                  className={`inline-block rounded-[3px] px-[0.35em] py-[0.1em] t-stat origin-left ${
                    isActive ? `${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]}` : "bg-cream text-ink"
                  }`}
                  style={{
                    fontSize:
                      p.name.length > 10
                        ? "clamp(1.1rem, 5.6cqw, 2rem)"
                        : "clamp(1.5rem, 8cqw, 2.75rem)",
                  }}
                >
                  {p.name}
                </motion.span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 t-label ${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]}`}
                style={{ fontSize: "0.6rem" }}
              >
                LIVE
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="t-label text-cream/55 text-center mt-6">{copy.built.footer}</p>
    </div>
  );
}
