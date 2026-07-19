"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SlamStat } from "@/components/slam-stat";
import { KineticWords } from "@/components/kinetic-words";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import { DotField } from "@/components/dot-field";
import { SubjectDoodle } from "@/components/subject-doodle";
import { ACCENT_HEX } from "@/components/gl/shaders";
import type { StoryProps } from "./types";

// build4 §6.2: a five-point star drawn in one stroke, the setup illustration.
const STAR_DOODLE = ["M200,60 L235,170 350,170 258,238 293,350 200,280 107,350 142,238 50,170 165,170 z"];

const TIER_LABEL: Record<string, string> = {
  top1: "1",
  top5: "5",
  top10: "10",
  top25: "25",
};

function Seal() {
  const id = "standing-seal-path";
  return (
    <svg width="0" height="0" aria-hidden>
      <defs>
        <path id={id} d="M 4,54 A 50,50 0 1 1 104,54" fill="none" />
      </defs>
    </svg>
  );
}

export function StandingStory({ phase, snapshot, guest }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const isTier = snapshot ? snapshot.standing.tier !== "member" : false;

  // §10.4: anticipation then impact — the seal draws first, the stamp slams
  // at 0.9s, and the haptic fires at the moment of contact (~1.15s), not at
  // the start of the beat.
  useEffect(() => {
    if (phase !== "reveal" || !isTier) return;
    const timer = setTimeout(() => vibrate([12, 40, 12]), 1150);
    return () => clearTimeout(timer);
  }, [phase, isTier]);

  if (guest) return null; // guests never see this story — engine skips it entirely

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-4">
        {/* The dot bands frame the stamp beat (build4 §3) — mounted in
            both setup and reveal so they don't pop in mid-story. */}
        <DotField accent={ACCENT_HEX.red} edge="both" />
        <SubjectDoodle paths={STAR_DOODLE} className="w-28 h-28" />
        <p className="t-display text-center">
          <KineticWords text={isTier ? copy.standing.setup : copy.standing.setupQuiet} />
        </p>
      </div>
    );
  }

  if (!snapshot) return null;

  if (isTier) {
    const tierNum = TIER_LABEL[snapshot.standing.tier] ?? String(snapshot.standing.percentile);
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-6 text-center overflow-hidden">
        <DotField accent={ACCENT_HEX.red} edge="both" />
        <Seal />
        <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
          {/* Beat 1: the seal ring draws in, then keeps its slow rotation. */}
          <motion.svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            className="absolute inset-0"
            initial={{ scale: reduceMotion ? 1 : 0.85, opacity: reduceMotion ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{
              scale: { duration: 0.5, ease: "easeOut" },
              opacity: { duration: 0.5 },
              rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            }}
          >
            <circle
              cx="110"
              cy="110"
              r="95"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="text-ink/30"
            />
            <text fontSize="11" fontWeight={700} letterSpacing="0.15em" fill="currentColor" className="text-ink/60">
              <textPath href="#standing-seal-path" startOffset="0%">
                {copy.standing.sealText}
              </textPath>
            </text>
          </motion.svg>
          {/* Beat 2: the slam — opacity snaps in the first 60ms while the
              transform rides the stamp spring from way out at scale 2.2. */}
          <motion.p
            initial={{ scale: 2.2, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : {
                    opacity: { duration: 0.06, delay: 0.9 },
                    scale: { ...SPRING.stamp, delay: 0.9 },
                    rotate: { ...SPRING.stamp, delay: 0.9 },
                  }
            }
            className="t-monument text-gdg-red leading-none relative z-10"
            style={{ fontSize: "clamp(3.5rem, 22cqw, 6rem)" }}
          >
            {fmt(copy.standing.revealTier, { percentile: tierNum })}
          </motion.p>
          {/* The impact ripple, timed to contact. */}
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="absolute rounded-full border-2 border-ink/40"
              style={{ width: 220, height: 220 }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.6, opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.4, delay: 1.15, times: [0, 0.2, 1] }}
            />
          )}
        </div>
        <p className="t-body text-ink/65">{copy.standing.revealTierSub}</p>
      </div>
    );
  }

  const matched = snapshot.messages.matched;
  // Both unmatched AND zero check-ins: no numbers at all, not even a "0" —
  // the "never shame" rule (§15) means this variant is pure warm copy.
  const showLow = !matched && snapshot.flags.zeroCheckins;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-6 text-center">
      <DotField accent={ACCENT_HEX.red} edge="both" />
      <p className="t-display">{copy.standing.revealStats}</p>
      {!showLow && (
        <div className={`flex ${matched ? "gap-8" : ""} items-center justify-center`}>
          {matched && (
            <div>
              <SlamStat value={snapshot.messages.count} className="t-stat" />
              <p className="t-label text-ink/45 mt-1">{copy.standing.statMessages}</p>
            </div>
          )}
          <div>
            <SlamStat value={snapshot.events.checkins} className="t-stat" />
            <p className="t-label text-ink/45 mt-1">{copy.standing.statEvents}</p>
          </div>
        </div>
      )}
      {/* The three-beat payoff (build4 §5.2): stats slam at 0ms (SlamStat's
          own animation), this closing line at +1100ms. */}
      <motion.p
        className="t-body text-ink/65"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 1.1 }}
      >
        {showLow ? copy.standing.lowSub : copy.standing.revealStatsSub}
      </motion.p>
    </div>
  );
}
