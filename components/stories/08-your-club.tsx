"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { CLUBS } from "@/lib/clubs";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";
import type { ClubId } from "@/lib/snapshot";

const CLUB_ORDER: ClubId[] = ["builder", "connector", "observer", "sprinter"];

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
  return (
    <div className="flex gap-3 items-end">
      {CLUB_ORDER.map((id, i) => (
        <motion.div
          key={id}
          className="w-16 aspect-[5/7] rounded-xl bg-ink-2 border border-cream/20 flex items-center justify-center"
          animate={{ y: [-4, 4] }}
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

function FoilCard({ clubId, rarityPct }: { clubId: ClubId; rarityPct: number }) {
  const reduceMotion = useReducedMotion();
  const club = CLUBS[clubId];
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  function onPointerMove(e: React.PointerEvent) {
    if (reduceMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 14);
    rotateX.set((0.5 - py) * 14);
    setSheenPos({ x: px * 100, y: py * 100 });
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
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
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(115deg, transparent 40%, rgba(255,246,224,0.18) 50%, transparent 60%)",
              backgroundPosition: `${sheenPos.x}% ${sheenPos.y}%`,
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
        <p className="t-editorial text-cream mt-2 relative">{club.vibe}</p>
        <p className="t-body text-cream/65 mt-2 relative line-clamp-2">{club.role}</p>

        <div className="mt-auto flex justify-start relative">
          <span
            className="t-label text-ink px-3 py-1"
            style={{
              background: club.hex,
              clipPath: "polygon(0 0, 100% 0, 100% 70%, 92% 100%, 0 100%)",
            }}
          >
            {fmt(copy.yourClub.rarity, { rarityPct })}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function YourClubStory({ phase, snapshot, guest }: StoryProps) {
  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink text-cream px-6 pt-20 pb-16 gap-8">
        <div className="text-center">
          <p className="t-display">{copy.yourClub.setup}</p>
          <p className="t-body text-cream/55 mt-2">{copy.yourClub.setupSub}</p>
        </div>
        <CardBacks />
      </div>
    );
  }

  if (guest || !snapshot) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink text-cream px-6 pt-20 pb-16 gap-4 text-center">
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
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-6 pt-20 pb-16"
      initial={{ backgroundColor: "#0f0f0f" }}
      animate={{ backgroundColor: CLUBS[snapshot.club.id].hex }}
      transition={{ duration: 0.4 }}
    >
      <FoilCard clubId={snapshot.club.id} rarityPct={snapshot.club.rarityPct} />
    </motion.div>
  );
}
