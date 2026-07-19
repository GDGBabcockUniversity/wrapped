"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { KineticWords } from "@/components/kinetic-words";
import { PopLetters } from "@/components/pop-letters";
import { PRODUCTS, GUESS_GAME, PRODUCT_STATS, type ProductStat } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { StripeCircleFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { SlamStat } from "@/components/slam-stat";
import { useBuiltGuess } from "./built-guess";
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
const TEXT_ACCENT: Record<string, string> = {
  blue: "text-gdg-blue",
  red: "text-gdg-red",
  yellow: "text-gdg-yellow",
  green: "text-gdg-green",
};

const ACTIVE_CYCLE_MS = 1800;

/** build4 §10A: the stat line under an active product row — count, label,
    optional detail. Never renders a blank or a "0" for a null stat (the
    caller only mounts this when `stat` is non-null). */
function StatLine({ stat, color }: { stat: ProductStat; color: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 pl-1 pt-1">
      <div className="flex items-baseline gap-1.5">
        <SlamStat
          value={stat.value}
          className={`t-stat ${TEXT_ACCENT[color]}`}
          style={{ fontSize: "clamp(1.1rem, 5cqw, 1.6rem)", fontVariantNumeric: "tabular-nums" }}
        />
        <span className="t-label text-cream/60">{stat.label}</span>
      </div>
      {stat.detail && <span className="t-body text-cream/45 text-xs">{stat.detail}</span>}
    </div>
  );
}

export function BuiltStory({ phase, active, paused, onComplete }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();
  const [activeRow, setActiveRow] = useState(0);
  // The guess game (build4 §8) mounts as the final beat, after one full
  // table cycle — every row has had its turn as "active".
  const [gameActive, setGameActive] = useState(false);
  const game = useBuiltGuess(gameActive, onComplete);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused || gameActive) return;
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks >= PRODUCTS.length) {
        clearInterval(id);
        setGameActive(true);
        return;
      }
      setActiveRow((r) => (r + 1) % PRODUCTS.length);
    }, ACTIVE_CYCLE_MS);
    return () => clearInterval(id);
  }, [phase, active, paused, gameActive]);

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
      <div className="flex justify-center mb-6 min-h-[2.5rem] items-center px-4">
        {gameActive ? (
          <p key={game.headline} className="t-label text-center">
            <PopLetters text={game.headline} profile="fast" />
          </p>
        ) : (
          <StickerChip className="t-label">{copy.built.revealLabel}</StickerChip>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        {PRODUCTS.map((p, i) => {
          const isActive = i === activeRow;
          const resolved = gameActive && (!!game.answer || game.timedOut);
          const isRevealedCorrect = resolved && i === GUESS_GAME.answerIndex;
          const isWrongTap = resolved && game.answer?.index === i && !game.answer.correct;
          const stat = PRODUCT_STATS[p.name];
          // build4 §10A: one stat on screen at a time, mounted only while
          // its row is active, hidden entirely once the guess game claims
          // the rows. Reduced motion keeps stat-carrying rows' stats up
          // permanently instead of cycling them.
          const showStat = !!stat && !gameActive && (reduceMotion || isActive);

          return (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, x: -16 }}
              animate={{
                opacity: gameActive ? 1 : isActive ? 1 : 0.7,
                // §10.7: the active row swells AND nudges — a physical shove,
                // not just a zoom. Entrance rides the same x channel; after
                // mount the nudge keyframes take over per activation.
                x: gameActive ? 0 : isActive ? [0, 4, 0] : 0,
              }}
              transition={{
                opacity: { duration: 0.3 },
                x: { duration: 0.3, delay: (i * TIMING.staggerMs) / 1000 },
              }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-4">
                {!gameActive && (
                  <span
                    className="text-cream/40 text-sm"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {p.num}
                  </span>
                )}
                {/* Redacted bar (build4 §7.1) that morphs into an outlined,
                    tappable guess-game card (§8.2) — the SAME element, no
                    remount, via Motion's `layout` prop. The wrapper stays
                    the flex-growing box; the button itself stays content-
                    sized (a bar) until the game claims the full row (a
                    card). */}
                <div className="flex-1">
                  <motion.button
                    type="button"
                    layout
                    disabled={!gameActive || resolved}
                    onClick={() => gameActive && game.onTapRow(i)}
                    initial={{ opacity: 0, scaleX: 0.9, y: 10 }}
                    animate={{
                      opacity: 1,
                      scaleX: !gameActive && isActive ? 1.06 : 1,
                      y: 0,
                      rotate: reduceMotion
                        ? 0
                        : isRevealedCorrect
                          ? [4, 0]
                          : !gameActive && isActive
                            ? [2, 0]
                            : 0,
                    }}
                    transition={{
                      opacity: { ...SPRING.default, delay: gameActive ? 0 : (i * TIMING.staggerMs) / 1000 },
                      scaleX: { ...SPRING.default, delay: gameActive ? 0 : (i * TIMING.staggerMs) / 1000 },
                      y: { ...SPRING.default, delay: gameActive ? 0 : (i * TIMING.staggerMs) / 1000 },
                      rotate: SPRING.default,
                      layout: reduceMotion ? { duration: 0.01 } : SPRING.default,
                    }}
                    className={`text-left t-stat origin-left ${
                      gameActive
                        ? `w-full flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 ${
                            isRevealedCorrect
                              ? `${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]} border-transparent`
                              : isWrongTap
                                ? "border-2 border-gdg-red text-cream"
                                : "border-cream/30 text-cream"
                          }`
                        : `inline-block rounded-[3px] px-[0.35em] py-[0.1em] ${
                            isActive ? `${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]}` : "bg-cream text-ink"
                          }`
                    }`}
                    style={{
                      fontSize:
                        p.name.length > 10
                          ? "clamp(1.1rem, 5.6cqw, 2rem)"
                          : "clamp(1.5rem, 8cqw, 2.75rem)",
                    }}
                  >
                    <span>{p.name}</span>
                    {isRevealedCorrect && (
                      <span aria-hidden className="t-label">
                        &#10003;
                      </span>
                    )}
                    {isWrongTap && (
                      <span aria-hidden className="t-label">
                        &#10005;
                      </span>
                    )}
                  </motion.button>
                </div>
                {!gameActive && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 t-label ${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]}`}
                    style={{ fontSize: "0.6rem" }}
                  >
                    LIVE
                  </span>
                )}
              </div>
              {stat &&
                (reduceMotion ? (
                  showStat && <StatLine stat={stat} color={p.color} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: showStat ? 1 : 0, height: showStat ? "auto" : 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <StatLine stat={stat} color={p.color} />
                  </motion.div>
                ))}
            </motion.div>
          );
        })}
      </div>
      <p className="t-label text-cream/55 text-center mt-6">{copy.built.footer}</p>
    </div>
  );
}
