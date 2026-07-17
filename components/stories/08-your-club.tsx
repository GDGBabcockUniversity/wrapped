"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { CLUBS } from "@/lib/clubs";
import { IdleFloat } from "@/components/idle-float";
import { KineticWords } from "@/components/kinetic-words";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import type { StoryProps } from "./types";
import type { ClubId } from "@/lib/snapshot";

const CLUB_ORDER: ClubId[] = ["builder", "connector", "observer", "sprinter"];

// §10.3 — the ritual's fan poses (card i's resting offset and tilt).
const FAN_X = [-54, -18, 18, 54];
const FAN_R = [-12, -4, 4, 12];

const PATTERN_CLASS: Record<string, string> = {
  grid: "pattern-grid",
  waves: "pattern-waves",
  halftone: "pattern-halftone",
  diagonals: "pattern-diagonals",
};

const OUTLINE_CLASS: Record<string, string> = {
  blue: "text-outline-blue",
  red: "text-outline-red",
  yellow: "text-outline-yellow",
  green: "text-outline-green",
};

function CardBacks() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex gap-3 items-end">
      {CLUB_ORDER.map((id, i) => (
        <motion.div
          key={id}
          className="w-16 aspect-[5/7] rounded-xl bg-ink-2 border border-cream/20 flex items-center justify-center"
          animate={reduceMotion ? {} : { y: [-4, 4] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        >
          <div className="flex gap-1" aria-hidden>
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-blue" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-red" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-yellow" />
            <span className="w-1.5 h-1.5 rounded-full bg-gdg-green" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * §10.3 — the three-beat club ritual. Beat 1 (0–1.6s): four card backs fan
 * center-stage, then the three non-chosen fly off downward while yours
 * slides to center and grows. Beat 2 (1.6–2.4s): the lone card back
 * trembles — anticipation — with a light haptic at 2.2s. Beat 3 (2.4s+):
 * the flip; the FoilCard takes over (its own mount haptic is the landing).
 * Reduced motion: straight to the card.
 */
function ClubRitual({ clubId, rarityPct }: { clubId: ClubId; rarityPct: number }) {
  const reduceMotion = useReducedMotion();
  const [scattered, setScattered] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const chosenIdx = CLUB_ORDER.indexOf(clubId);

  useEffect(() => {
    if (reduceMotion) return; // rendered as already-flipped below — no ritual
    const timers = [
      setTimeout(() => setScattered(true), 900),
      setTimeout(() => vibrate(8), 2200),
      setTimeout(() => setFlipped(true), 2400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  if (flipped || reduceMotion) {
    return (
      <IdleFloat y={-5} duration={4} delay={1.5}>
        <FoilCard clubId={clubId} rarityPct={rarityPct} entryAngle={-90} />
      </IdleFloat>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-64">
      {CLUB_ORDER.map((id, i) => {
        const isChosen = i === chosenIdx;
        const target =
          scattered && !isChosen
            ? { opacity: 0, x: FAN_X[i], y: 260, rotate: (i - 1.5) * 16, scale: 1 }
            : scattered && isChosen
              ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1.12 }
              : { opacity: 1, x: FAN_X[i], y: 0, rotate: FAN_R[i], scale: 1 };
        return (
          <motion.div
            key={id}
            className="absolute w-24 aspect-[5/7]"
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.7 }}
            animate={target}
            transition={
              scattered && !isChosen
                ? { duration: 0.45, ease: "easeIn", delay: i * 0.08 }
                : scattered
                  ? SPRING.default
                  : { ...SPRING.default, delay: i * 0.12 }
            }
            style={{ zIndex: isChosen ? 2 : 1 }}
          >
            {/* Inner layer carries the Beat-2 tremble so the outer spring
                and the keyframe rotation never fight over one channel. */}
            <motion.div
              className="w-full h-full rounded-xl bg-ink-2 border border-cream/20 flex items-center justify-center"
              animate={
                scattered && isChosen && !reduceMotion
                  ? { rotate: [0, -1.5, 1.5, -1.5, 1.5, 0] }
                  : { rotate: 0 }
              }
              transition={{ delay: 0.8, duration: 0.6, ease: "easeInOut" }}
            >
              <div className="flex gap-1" aria-hidden>
                <span className="w-1.5 h-1.5 rounded-full bg-gdg-blue" />
                <span className="w-1.5 h-1.5 rounded-full bg-gdg-red" />
                <span className="w-1.5 h-1.5 rounded-full bg-gdg-yellow" />
                <span className="w-1.5 h-1.5 rounded-full bg-gdg-green" />
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

function FoilCard({
  clubId,
  rarityPct,
  entryAngle = 180,
}: {
  clubId: ClubId;
  rarityPct: number;
  entryAngle?: number;
}) {
  const reduceMotion = useReducedMotion();
  const club = CLUBS[clubId];
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    vibrate([12, 40, 12]); // the flip lands like a physical card
  }, []);

  function onPointerMove(e: React.PointerEvent) {
    if (reduceMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 14);
    rotateX.set((0.5 - py) * 14);
    // Direct style write — a React re-render per pointermove is jank fuel.
    if (sheenRef.current) {
      sheenRef.current.style.backgroundPosition = `${px * 100}% ${py * 100}%`;
    }
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      initial={{ rotateY: entryAngle, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0.3 } : SPRING.flip}
      style={{ perspective: 1200 }}
    >
      <motion.div
        ref={cardRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{
          rotateX: springX,
          rotateY: springY,
          backfaceVisibility: "hidden",
          width: "78cqw",
          maxWidth: 340,
        }}
        className="aspect-[5/7] rounded-2xl bg-ink border border-cream/25 p-5 flex flex-col relative overflow-hidden"
      >
        {!reduceMotion && (
          <div
            ref={sheenRef}
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(115deg, transparent 40%, rgba(255,246,224,0.18) 50%, transparent 60%)",
              backgroundPosition: "50% 50%",
              backgroundSize: "200% 200%",
              mixBlendMode: "overlay",
            }}
          />
        )}

        <div className="flex items-center justify-between relative">
          <span className="t-label text-cream/80">{copy.yourClub.revealPrefix}</span>
          <span className={`text-outline-base ${OUTLINE_CLASS[club.accent]} text-2xl`}>
            {club.name[0]}
          </span>
        </div>

        <div
          className={`h-[34%] rounded-lg mt-4 relative ${PATTERN_CLASS[club.pattern]}`}
          style={{ color: club.hex, opacity: 0.25, backgroundColor: "#0f0f0f" }}
        />

        <p
          className="t-display mt-4 relative"
          style={{ color: club.hex, fontSize: "clamp(1.8rem, 12cqw, 3rem)" }}
        >
          {club.name}
        </p>
        {/* Vibe and role land AFTER the flip settles — the payoff reads in
            layers, not all at once (§10.3 beat 3). */}
        <motion.p
          className="t-editorial text-cream mt-2 relative"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          {club.vibe}
        </motion.p>
        <motion.p
          className="t-body text-cream/65 mt-2 relative line-clamp-2"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          {club.role}
        </motion.p>

        <div className="mt-auto flex justify-start relative">
          {/* The rarity badge STAMPS in, it doesn't just exist. */}
          <motion.span
            className="t-label text-ink px-3 py-1"
            style={{
              background: club.hex,
              clipPath: "polygon(0 0, 100% 0, 100% 70%, 92% 100%, 0 100%)",
            }}
            initial={reduceMotion ? false : { scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { ...SPRING.stamp, delay: 0.7, opacity: { duration: 0.05, delay: 0.7 } }}
          >
            {fmt(copy.yourClub.rarity, { rarityPct })}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function YourClubStory({ phase, snapshot, guest }: StoryProps) {
  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-8">
        <div className="text-center">
          <p className="t-display">
            <KineticWords text={copy.yourClub.setup} />
          </p>
          <p className="t-body text-cream/55 mt-2">{copy.yourClub.setupSub}</p>
        </div>
        <CardBacks />
      </div>
    );
  }

  if (guest || !snapshot) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-4 text-center">
        <CardBacks />
        <p className="t-label text-cream/60 mt-2">{copy.yourClub.guestNames}</p>
        <p className="t-body text-cream/70 max-w-xs">{copy.yourClub.guestLine}</p>
        <a
          href="https://gdgbabcock.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-cream text-ink px-6 py-3 t-label mt-2"
        >
          Join GDG Babcock
        </a>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 pt-20 pb-16">
      <ClubRitual clubId={snapshot.club.id} rarityPct={snapshot.club.rarityPct} />
    </div>
  );
}
