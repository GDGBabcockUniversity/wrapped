"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Counter } from "@/components/counter";
import { IdleFloat } from "@/components/idle-float";
import { PopLetters } from "@/components/pop-letters";
import { CHAPTER } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING, TIMING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { StripeBandFigure, WarpFieldFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { ACCENT_HEX } from "@/components/gl/shaders";
import type { StoryProps } from "./types";

// The overture (build4 §4, retimed build6 §2.2): a numeral drive-through
// over the warp field, then a resolve, then a calm two-line beat.
const DRIVE_MS = 3400;
const OVERLAY_APPEAR_S = 0.05;
const OVERLAY_HOLD_MS = 1200;
const OVERLAY_FADE_S = 0.15;
const OVERLAY_LINE1_AT = 400;
const OVERLAY_LINE2_AT = 1900;
// The numeral belt (build6 §2.2, law 10): a continuous marquee replacing
// the old two-lone-numerals crossing, which held a dead, static-looking
// beat between "25" exiting and "26" entering. Content is duplicated so
// the .overture-belt CSS animation's translateX(0) -> translateX(-50%)
// loops seamlessly (same trick as 03-built.tsx's Marquee, and — unlike
// Motion's `animate` with a percentage keyframe array, which proved stuck
// at its initial value on this rotated element — a plain CSS @keyframes
// loop that actually runs; duration lives in globals.css's overture-belt
// keyframe, 7s, linear, infinite).
const BELT_GLYPHS = ["25", "26", "25", "26", "25", "26"];
const BELT_ITEMS = [...BELT_GLYPHS, ...BELT_GLYPHS];

const subscribeNoop = () => () => {};
/** True only after the client has mounted — React's own sanctioned tool
    (not an effect + setState) for values that legitimately differ between
    the server snapshot and the client's, so the hydration pass itself
    stays server/client-identical and only a later render picks up the
    real client value. */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

function ColdOpenLine({ entry }: { entry: (typeof copy.theYear.coldOpen)[number] }) {
  if (!("accentWord" in entry) || !entry.accentWord) {
    return <PopLetters text={entry.line} profile="fast" />;
  }
  const idx = entry.line.indexOf(entry.accentWord);
  const before = entry.line.slice(0, idx);
  const after = entry.line.slice(idx + entry.accentWord.length);
  return (
    <>
      {before && <PopLetters text={before} profile="fast" />}
      <PopLetters text={entry.accentWord} profile="fast" className="text-gdg-blue" />
      {after && <PopLetters text={after} profile="fast" />}
    </>
  );
}

/** A cold-open overlay line: appears near-instantly, holds, fades — the
    "One chapter." / "One unhinged year." captions riding the drive-through.
    State-driven (not a keyframe array) so the on/off timing is exact and
    doesn't depend on Motion resolving a delayed multi-stop array. */
function DriveOverlayLine({ text, visible }: { text: string; visible: boolean }) {
  return (
    <motion.div
      className="absolute z-10 px-3 py-1.5 rounded-full bg-ink/55"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? OVERLAY_APPEAR_S : OVERLAY_FADE_S }}
    >
      <span className="t-label text-cream">{text}</span>
    </motion.div>
  );
}

/** 0–3400ms: a continuous numeral belt travels through at monument scale
    over the warp field (shader story 10, wired in player.tsx) — never a
    dead frame (law 10). The logomark is the pinned, static anchor the
    world moves around. */
function DriveThrough() {
  const [line, setLine] = useState<0 | 1 | 2>(0);
  const glQuality = useGlQualityContext();

  useEffect(() => {
    const timers = [
      setTimeout(() => setLine(1), OVERLAY_LINE1_AT),
      setTimeout(() => setLine(0), OVERLAY_LINE1_AT + OVERLAY_HOLD_MS),
      setTimeout(() => setLine(2), OVERLAY_LINE2_AT),
      setTimeout(() => setLine(0), OVERLAY_LINE2_AT + OVERLAY_HOLD_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center px-6 text-center">
      {/* Static stand-in for the shader's warp field on devices without a
          live WebGL figure (build6 §2.2) — the belt is no longer the only
          alive thing on screen when quality probes "off". */}
      {glQuality === "off" && <WarpFieldFigure />}
      {/* No overflow-hidden here: this wrapper is just a horizontal-
          centering anchor. The -8deg rotation on the row below inflates
          its bounding box well past this anchor's own auto height — the
          outer DriveThrough root already clips everything to the story
          frame, so a second overflow-hidden here only clipped a thin,
          rotation-skewed sliver of the belt and hid it almost entirely. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 pointer-events-none flex justify-center"
        style={{ top: "50%", transform: "translateY(-55%)" }}
      >
        <div className="overture-belt flex items-center whitespace-nowrap" style={{ gap: "0.18em" }}>
          {BELT_ITEMS.map((g, i) => (
            <span key={`g${i}`} className="t-monument text-gdg-red">
              {g}
              {/* A small separator, not another glyph — sized against the
                  monument scale it would otherwise vanish inside, or (the
                  bug this replaces) balloon into a near-blank cell wide
                  enough to sit dead-center of the viewport on its own. */}
              {i < BELT_ITEMS.length - 1 && (
                <span className="text-gdg-red/40 mx-2" style={{ fontSize: "0.16em" }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10" style={{ viewTransitionName: "wrapped-title" } as React.CSSProperties}>
        <img
          src="/Sticker Logomark.png"
          alt=""
          aria-hidden
          className="w-16 h-auto drop-shadow-md"
        />
      </div>
      <DriveOverlayLine text={copy.theYear.coldOpen[0]!.line} visible={line === 1} />
      <DriveOverlayLine text={copy.theYear.coldOpen[1]!.line} visible={line === 2} />
    </div>
  );
}

/** 3700–5600ms: the breath after the spectacle — cream-on-ink, "What a
    year." then "We kept the receipts." landing 900ms later. Opaque so it
    also covers any tail end of the drive-through's numeral travel. */
function CalmBeat({ instant }: { instant: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-ink text-cream">
      <p className="t-display" style={{ fontSize: "clamp(2.6rem, 13cqw, 5rem)" }}>
        {instant ? copy.theYear.coldOpen[2]!.line : <PopLetters text={copy.theYear.coldOpen[2]!.line} profile="fast" />}
      </p>
      <motion.p
        className="t-editorial"
        initial={instant ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: instant ? 0 : 0.9 }}
      >
        {instant ? copy.theYear.coldOpen[3]!.line : <ColdOpenLine entry={copy.theYear.coldOpen[3]!} />}
      </motion.p>
    </div>
  );
}

function ColdOpen() {
  // useReducedMotion() reads the real matchMedia value synchronously on
  // the client's very first render but always reads false during SSR (no
  // `window`) — trusting it before the client has mounted makes the
  // client's OWN hydration-pass render disagree with the server HTML
  // it's reconciling against. useHasMounted() gates that until safe.
  const reduceMotion = useReducedMotion();
  const hasMounted = useHasMounted();
  const [beat, setBeat] = useState<"drive" | "calm">("drive");

  useEffect(() => {
    if (!hasMounted) return;
    // Deferred through setTimeout even for the reduced-motion case (delay
    // 0) rather than calling setState synchronously in the effect body.
    const t = setTimeout(() => setBeat("calm"), reduceMotion ? 0 : DRIVE_MS);
    return () => clearTimeout(t);
  }, [hasMounted, reduceMotion]);

  useEffect(() => {
    if (beat === "calm") vibrate(8); // the resolve's moment of contact
  }, [beat]);

  if (beat === "drive") return <DriveThrough />;
  return <CalmBeat instant={!!reduceMotion} />;
}

const VALUES: Record<string, number> = {
  eventsRun: CHAPTER.eventsRun,
  members: CHAPTER.members,
  productsShipped: CHAPTER.productsShipped,
  totalCheckins: CHAPTER.totalCheckins,
  messagesParsed: CHAPTER.messagesParsed,
};

function ReceiptRow({ label, value, suffix, delayMs }: { label: string; value: number; suffix?: string; delayMs: number }) {
  const [flash, setFlash] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delayMs / 1000 }}
      className="flex items-baseline"
    >
      <Counter
        value={value}
        suffix={suffix}
        durationMs={TIMING.countUpMs}
        className={`t-stat transition-colors duration-300 ${flash ? "text-gdg-blue" : "text-ink"}`}
        active
        onComplete={() => {
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
        }}
      />
      <span className="leader text-ink" />
      <span className="t-label text-ink/70 whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

export function TheYearStory({ phase }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();

  if (phase === "setup") {
    return <ColdOpen />;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 pt-20 pb-16">
      {/* Static stand-in for the shader's diagonal stripe band on devices
          without a live WebGL figure (build4 §2.3). */}
      {glQuality === "off" && <StripeBandFigure accentHex={ACCENT_HEX.blue} />}
      <AmbientScribbles field="ink" />
      <IdleFloat y={-3} duration={6} delay={1.4} className="w-full">
      <motion.div
        initial={{ y: 40, rotate: -1.5, opacity: 0 }}
        animate={{ y: 0, rotate: -0.5, opacity: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : SPRING.default}
        className="bg-paper text-ink rounded-sm w-full px-5 py-6"
      >
        <div className="perforation -mx-5 -mt-6 mb-4" />
        <p className="t-label text-center opacity-70 pb-3 border-b border-dashed border-ink/30">
          {copy.theYear.revealLabel}
        </p>
        {/* §10.5: the receipt PRINTS — rows emerge top-to-bottom behind a
            linear clip wipe, like paper coming off the till roll. */}
        <motion.div
          className="flex flex-col gap-3 py-4"
          initial={{ clipPath: reduceMotion ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.2, ease: "linear", delay: 0.3 }}
        >
          {copy.theYear.rows.map((row, i) => (
            <ReceiptRow
              key={row.key}
              label={row.label}
              value={VALUES[row.key] ?? 0}
              suffix={row.key === "members" ? "+" : undefined}
              delayMs={i * TIMING.staggerMs}
            />
          ))}
        </motion.div>
        <p className="t-label text-center opacity-70 pt-3 border-t border-dashed border-ink/30">
          {copy.theYear.footer}
        </p>
        {/* The tear-off: perforation kicks once as printing finishes. */}
        <motion.div
          className="perforation -mx-5 -mb-6 mt-4"
          animate={reduceMotion ? {} : { rotate: [0, 1.2, 0] }}
          transition={{ duration: 0.3, delay: 1.5 }}
        />
      </motion.div>
      </IdleFloat>
    </div>
  );
}
