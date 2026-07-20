"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { KineticWords } from "@/components/kinetic-words";
import { PopLetters } from "@/components/pop-letters";
import { PRODUCTS, GUESS_GAME, PRODUCT_SAGA, type SagaStat } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { StripeCircleFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { vibrate } from "@/lib/haptics";
import { useBuiltGuess } from "./built-guess";
import { ACCENT_HEX } from "@/components/gl/shaders";
import type { StoryProps } from "./types";

/**
 * What We Built — the product saga (build5 §3). The roll-call (fast bars,
 * no stats attached) opens the story; then it walks RADAR, BABCOCKVOTES,
 * and ORBIT with receipts, one number-then-consequence beat at a time
 * (law 9); then the guess game closes it out, unchanged from build4 §8.
 */

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

const ROLLCALL_CYCLE_MS = 900;

function colorFor(name: string): string {
  return PRODUCTS.find((p) => p.name === name)?.color ?? "blue";
}
const RADAR_COLOR = colorFor("RADAR");
const VOTES_COLOR = colorFor("BABCOCKVOTES");
const ORBIT_COLOR = colorFor("ORBIT");
const WEBSITE_COLOR = colorFor("GDG WEBSITE");
const B100_COLOR = colorFor("BABCOCK 100");

const SCATTER_ROTATIONS = [-3, 2, -1, 3, -2];
const LOGO_STAMP_MS = 260;

/** The ORBIT company beat, upgraded from named chips to faces (build6
    §2.5 — owner: "instead of naming the 5 companies, use their logos and
    add proper motion"). Logos need a light field on this ink story, so
    each sits on its own paper chip; a missing/failed file falls back to
    the name in the SAME chip — never a broken image, never a blank. */
const COMPANY_LOGOS: Record<string, string> = {
  PAYSTACK: "/logos/companies/paystack.png",
  "DIGITAL ENCODE": "/logos/companies/digital-encode.png",
  RISE: "/logos/companies/rise.png",
  NITHUB: "/logos/companies/nithub.png",
  CUBBES: "/logos/companies/cubbes.png",
};

function LogoChip({ name, index }: { name: string; index: number }) {
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const rot = SCATTER_ROTATIONS[index % SCATTER_ROTATIONS.length]!;
  const src = COMPANY_LOGOS[name];

  useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(() => vibrate(6), index * LOGO_STAMP_MS);
    return () => clearTimeout(id);
  }, [reduceMotion, index]);

  return (
    <motion.div
      className="bg-paper rounded-md px-3 py-2 flex items-center justify-center h-10 sm:h-12"
      style={{ rotate: 0 }}
      initial={reduceMotion ? { rotate: rot } : { scale: 1.3, rotate: -6, opacity: 0 }}
      animate={{ scale: 1, rotate: rot, opacity: 1 }}
      transition={
        reduceMotion ? { duration: 0.01 } : { ...SPRING.stamp, delay: (index * LOGO_STAMP_MS) / 1000 }
      }
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-auto object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="t-label text-ink" style={{ fontSize: "0.6rem" }}>
          {name}
        </span>
      )}
    </motion.div>
  );
}

/** Once every chip has stamped in, the whole wall drifts as one group
    (law 10 — the 4000ms hold stays alive). */
function LogoWall({ names }: { names: readonly string[] }) {
  const landedS = (names.length * LOGO_STAMP_MS) / 1000 + 0.4;
  return (
    <IdleFloat y={-3} duration={4} delay={landedS} className="flex flex-wrap justify-center gap-2 max-w-xs">
      {names.map((n, i) => (
        <LogoChip key={n} name={n} index={i} />
      ))}
    </IdleFloat>
  );
}

/** The continuously-scrolling row of Radar's shipped games (build5 §3.2) —
    compositor-only translateX loop, content duplicated for a seamless
    wrap. */
function Marquee({ names }: { names: readonly string[] }) {
  const reduceMotion = useReducedMotion();
  const items = [...names, ...names];
  return (
    <div className="overflow-hidden w-full">
      <motion.div
        className="flex gap-2 w-max"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={reduceMotion ? undefined : { duration: 26, ease: "linear", repeat: Infinity }}
      >
        {items.map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="sticker-chip t-label whitespace-nowrap"
            style={{ fontSize: "0.52rem" }}
          >
            {n}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** One number-then-consequence beat (law 9): the slam, its label, and an
    optional detail line — the generic shape most saga beats share. */
function StatBeat({ stat, color }: { stat: SagaStat; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <SlamStat
        value={stat.value}
        className={`t-display text-center ${TEXT_ACCENT[color] ?? "text-cream"}`}
        style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)", fontVariantNumeric: "tabular-nums" }}
      />
      <motion.p
        className="t-label text-cream/60 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {stat.label}
      </motion.p>
      {stat.detail && (
        <motion.p
          className="t-body text-cream/45 text-xs text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.55 }}
        >
          {stat.detail}
        </motion.p>
      )}
    </div>
  );
}

/** The ORBIT summit+speakers beat: a primary slam, with a second stat
    landing 600ms later at half scale beside it if both are present
    (build5 §3.2 — falls back to a single slam when summit is still TBD). */
function DualStatBeat({
  primary,
  secondary,
  color,
}: {
  primary: SagaStat;
  secondary: SagaStat | null;
  color: string;
}) {
  return (
    <div className="flex items-end justify-center gap-6">
      <StatBeat stat={primary} color={color} />
      {secondary && (
        <motion.div
          className="scale-[0.62] origin-bottom"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <StatBeat stat={secondary} color={color} />
        </motion.div>
      )}
    </div>
  );
}

/** A plain held line — the ORBIT intro, the BabcockVotes fallback, and the
    headline tease all use this (the number that exits, the line alone,
    then the slam — build5 §3.2's held-breath beat). */
function LineBeat({ text, fast }: { text: string; fast?: boolean }) {
  return (
    <p className="t-editorial text-center px-6">
      <PopLetters text={text} profile={fast ? "fast" : undefined} />
    </p>
  );
}

interface ChapterHeader {
  label: string;
  color: string;
}

interface SagaBeat {
  header: ChapterHeader;
  ms: number;
  node: ReactNode;
}

// Law 12's hard floors (build6 §2.5): a connective line beat holds
// LINE_BEAT_MS, a stat lands and holds STAT_BEAT_MS, and a beat with its
// own continuous motion (marquee, logo wall) holds COMPOUND_BEAT_MS —
// "moves too fast" and "lasts too long" both traced back to beats that
// hadn't earned their hold.
const LINE_BEAT_MS = 2200;
const STAT_BEAT_MS = 3200;
const COMPOUND_BEAT_MS = 4000;

/** Every beat the saga can show, in order, with null-skipped TBDs already
    resolved out (build5 §3.1-3.2). Built once from static content — no
    hooks, no per-render recomputation. */
function buildSagaBeats(): SagaBeat[] {
  const beats: SagaBeat[] = [];

  // RADAR — articles and most-read are TBD-pending; games always renders
  // (Radar never shows up empty-handed).
  const radarHeader: ChapterHeader = { label: "RADAR", color: RADAR_COLOR };
  if (PRODUCT_SAGA.radar.articles) {
    beats.push({
      header: radarHeader,
      ms: STAT_BEAT_MS,
      node: <StatBeat stat={PRODUCT_SAGA.radar.articles} color={RADAR_COLOR} />,
    });
  }
  if (PRODUCT_SAGA.radar.mostRead) {
    const mostRead = PRODUCT_SAGA.radar.mostRead;
    beats.push({
      header: radarHeader,
      ms: STAT_BEAT_MS,
      node: (
        <div className="flex flex-col items-center gap-2">
          <StickerChip className="t-editorial">{String(mostRead.value)}</StickerChip>
          <p className="t-label text-cream/60">{mostRead.label}</p>
        </div>
      ),
    });
  }
  beats.push({
    header: radarHeader,
    ms: COMPOUND_BEAT_MS,
    node: (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <StatBeat stat={PRODUCT_SAGA.radar.games} color={RADAR_COLOR} />
        <Marquee names={PRODUCT_SAGA.radar.gameNames} />
      </div>
    ),
  });

  // BABCOCKVOTES — elections/votes are TBD; the fallback line covers the gap.
  const votesHeader: ChapterHeader = { label: "BABCOCKVOTES", color: VOTES_COLOR };
  if (PRODUCT_SAGA.votes.elections || PRODUCT_SAGA.votes.votesCast) {
    if (PRODUCT_SAGA.votes.elections) {
      beats.push({
        header: votesHeader,
        ms: STAT_BEAT_MS,
        node: <StatBeat stat={PRODUCT_SAGA.votes.elections} color={VOTES_COLOR} />,
      });
    }
    if (PRODUCT_SAGA.votes.votesCast) {
      beats.push({
        header: votesHeader,
        ms: STAT_BEAT_MS,
        node: <StatBeat stat={PRODUCT_SAGA.votes.votesCast} color={VOTES_COLOR} />,
      });
    }
  } else {
    beats.push({
      header: votesHeader,
      ms: LINE_BEAT_MS,
      node: <LineBeat text={PRODUCT_SAGA.votes.fallbackLine} />,
    });
  }

  // ORBIT — the centerpiece. Every VERIFIED beat always renders.
  const orbitHeader: ChapterHeader = { label: "ORBIT", color: ORBIT_COLOR };
  beats.push({ header: orbitHeader, ms: LINE_BEAT_MS, node: <LineBeat text={PRODUCT_SAGA.orbit.intro} fast /> });
  beats.push({
    header: orbitHeader,
    ms: COMPOUND_BEAT_MS,
    node: (
      <div className="flex flex-col items-center gap-3">
        <StatBeat stat={PRODUCT_SAGA.orbit.companies} color={ORBIT_COLOR} />
        <LogoWall names={PRODUCT_SAGA.orbit.companyNames} />
      </div>
    ),
  });
  if (PRODUCT_SAGA.orbit.lagos) {
    beats.push({
      header: orbitHeader,
      ms: STAT_BEAT_MS,
      node: <StatBeat stat={PRODUCT_SAGA.orbit.lagos} color={ORBIT_COLOR} />,
    });
  }
  if (PRODUCT_SAGA.orbit.careerFair) {
    beats.push({
      header: orbitHeader,
      ms: STAT_BEAT_MS,
      node: <StatBeat stat={PRODUCT_SAGA.orbit.careerFair} color={ORBIT_COLOR} />,
    });
  }
  beats.push({
    header: orbitHeader,
    ms: STAT_BEAT_MS,
    node: (
      <DualStatBeat
        primary={PRODUCT_SAGA.orbit.summit ?? PRODUCT_SAGA.orbit.speakers}
        secondary={PRODUCT_SAGA.orbit.summit ? PRODUCT_SAGA.orbit.speakers : null}
        color={ORBIT_COLOR}
      />
    ),
  });
  beats.push({
    header: orbitHeader,
    ms: STAT_BEAT_MS,
    node: <StatBeat stat={PRODUCT_SAGA.orbit.tickets} color={ORBIT_COLOR} />,
  });
  beats.push({
    header: orbitHeader,
    ms: STAT_BEAT_MS,
    node: <StatBeat stat={PRODUCT_SAGA.orbit.sponsors} color={ORBIT_COLOR} />,
  });
  beats.push({ header: orbitHeader, ms: LINE_BEAT_MS, node: <LineBeat text={PRODUCT_SAGA.orbit.headlineTease} /> });
  beats.push({
    header: orbitHeader,
    // The held-breath headline reveal (law 12): SlamStat's own
    // slice-assemble lands in ~0.32s, so STAT_BEAT_MS still leaves it a
    // ≥2600ms hold after the slam settles.
    ms: STAT_BEAT_MS,
    node: (
      <div className="flex flex-col items-center gap-3">
        {/* "t-monument sizing" per build5 §3.2 — the raw clamp(9rem,62cqw,
            22rem) is tuned for a bare numeral and overflows a 9-letter
            word, so the size is scaled down while keeping the class's
            weight/tracking/line-height. */}
        <SlamStat
          value={PRODUCT_SAGA.orbit.headline.value}
          className={`t-monument text-center ${TEXT_ACCENT[ORBIT_COLOR]}`}
          style={{ fontSize: "clamp(2.25rem, 15cqw, 4.5rem)" }}
        />
        <StickerChip className="t-label">{PRODUCT_SAGA.orbit.headline.label}</StickerChip>
      </div>
    ),
  });

  // Quick beats — both TBD today, so this section renders nothing.
  if (PRODUCT_SAGA.website) {
    beats.push({
      header: { label: "GDG WEBSITE", color: WEBSITE_COLOR },
      ms: STAT_BEAT_MS,
      node: <StatBeat stat={PRODUCT_SAGA.website} color={WEBSITE_COLOR} />,
    });
  }
  if (PRODUCT_SAGA.babcock100) {
    beats.push({
      header: { label: "BABCOCK 100", color: B100_COLOR },
      ms: STAT_BEAT_MS,
      node: <StatBeat stat={PRODUCT_SAGA.babcock100} color={B100_COLOR} />,
    });
  }

  return beats;
}

const SAGA_BEATS = buildSagaBeats();

/** The product name pinned top-left for the run of a chapter's beats —
    keyed by label so it only re-mounts (re-animates) when the chapter
    actually changes, not on every beat within it (build5 §3.2). */
function ChapterHeaderTag({ header }: { header: ChapterHeader }) {
  return (
    <motion.div
      key={header.label}
      className={`absolute top-20 left-6 inline-block rounded-[3px] px-[0.35em] py-[0.15em] t-display ${BG_CLASS[header.color]} ${CHIP_TEXT[header.color]}`}
      style={{ fontSize: "clamp(0.9rem, 4.5cqw, 1.2rem)", rotate: -2 }}
      initial={{ scale: 1.25, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING.stamp}
    >
      {header.label}
    </motion.div>
  );
}

type Stage = "rollcall" | "saga" | "game";

export function BuiltStory({ phase, active, paused, onComplete }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();
  const [stage, setStage] = useState<Stage>("rollcall");
  const [activeRow, setActiveRow] = useState(0);
  const [sagaIdx, setSagaIdx] = useState(0);
  const gameActive = stage === "game";
  const game = useBuiltGuess(gameActive, onComplete);

  // The roll-call: a fast pass over the five products, no stats attached
  // (build5 §3.2 point 1 — supersedes build4 §10A's stat-cycling rows).
  useEffect(() => {
    if (phase !== "reveal" || !active || paused || stage !== "rollcall") return;
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks >= PRODUCTS.length) {
        clearInterval(id);
        setStage(SAGA_BEATS.length > 0 ? "saga" : "game");
        return;
      }
      setActiveRow((r) => (r + 1) % PRODUCTS.length);
    }, ROLLCALL_CYCLE_MS);
    return () => clearInterval(id);
  }, [phase, active, paused, stage]);

  // The saga: walk each beat in order, then hand off to the guess game.
  // sagaIdx only ever advances while it stays in range for "saga" — the
  // out-of-range hand-off happens inside the timeout callback below, never
  // synchronously in the effect body.
  useEffect(() => {
    if (phase !== "reveal" || !active || paused || stage !== "saga") return;
    const beat = SAGA_BEATS[sagaIdx];
    if (!beat) return;
    const id = setTimeout(() => {
      if (sagaIdx + 1 >= SAGA_BEATS.length) {
        setStage("game");
      } else {
        setSagaIdx((i) => i + 1);
      }
    }, beat.ms);
    return () => clearTimeout(id);
  }, [phase, active, paused, stage, sagaIdx]);

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

  const currentBeat = stage === "saga" ? SAGA_BEATS[sagaIdx] : undefined;

  return (
    <div className="absolute inset-0 flex flex-col text-cream px-6 pt-20 pb-16">
      {/* Static stand-in for the shader's stripe-circle figure (build4 §2.3) —
          the story's one ambient system throughout (law 1). */}
      {glQuality === "off" && <StripeCircleFigure accentHex={ACCENT_HEX.blue} />}
      <AmbientScribbles field="ink" />

      {stage === "rollcall" && (
        <>
          <div className="flex justify-center mb-6 min-h-[2.5rem] items-center px-4">
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
                      className={`inline-block t-stat origin-left rounded-[3px] px-[0.35em] py-[0.1em] ${
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
        </>
      )}

      {stage === "saga" && currentBeat && (
        <>
          <ChapterHeaderTag header={currentBeat.header} />
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={sagaIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {/* build7 §8: the saga's stat beats hold 3.2–4s — a slow drift
                    keeps the hero alive through the hold (law 10, secondary
                    motion) instead of freezing after it lands. */}
                <IdleFloat y={-4} duration={5.5} delay={0.9}>{currentBeat.node}</IdleFloat>
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      {gameActive && (
        <>
          <div className="flex justify-center mb-6 min-h-[2.5rem] items-center px-4">
            <p key={game.headline} className="t-label text-center">
              <PopLetters text={game.headline} profile="fast" />
            </p>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {PRODUCTS.map((p, i) => {
              const resolved = !!game.answer || game.timedOut;
              const isRevealedCorrect = resolved && i === GUESS_GAME.answerIndex;
              const isWrongTap = resolved && game.answer?.index === i && !game.answer.correct;
              return (
                <motion.button
                  key={p.num}
                  type="button"
                  layout
                  disabled={resolved}
                  onClick={() => game.onTapRow(i)}
                  initial={{ opacity: 0, scaleX: 0.9, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotate: reduceMotion ? 0 : isRevealedCorrect ? [4, 0] : 0,
                  }}
                  transition={{
                    opacity: SPRING.default,
                    y: SPRING.default,
                    rotate: SPRING.default,
                    layout: reduceMotion ? { duration: 0.01 } : SPRING.default,
                  }}
                  className={`text-left t-stat w-full flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 ${
                    isRevealedCorrect
                      ? `${BG_CLASS[p.color]} ${CHIP_TEXT[p.color]} border-transparent`
                      : isWrongTap
                        ? "border-2 border-gdg-red text-cream"
                        : "border-cream/30 text-cream"
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
              );
            })}
          </div>
        </>
      )}

      <p className="t-label text-cream/55 text-center mt-6">{copy.built.footer}</p>
    </div>
  );
}
