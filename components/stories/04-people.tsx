"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { PEOPLE, type Person } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PopLetters } from "@/components/pop-letters";
import { copy } from "@/lib/copy";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { QuarterRingsFigure } from "@/components/gl/static-figure";
import type { StoryProps } from "./types";

/**
 * Chaptered credits, in the gdgbabcock.com/team display order (build4 §10B):
 * CORE -> the four tracks (Software Dev, Data & AI, Infra & Security,
 * Design & Mgmt) -> Dev Team -> Media Team -> Events Planning, then
 * sponsors, special thanks, and the closer. PEOPLE is already sorted by the
 * website's own algorithm (sections -> declared subteams -> leads first), so
 * render order here is simply array order. Every person appears; leads get
 * a ring and a size step. Nobody is skipped.
 */

const SECTION_ORDER = [
  "CORE",
  "SOFTWARE",
  "DATA",
  "INFRASTRUCTURE",
  "DESIGN",
  "DEV",
  "MEDIA",
  "EVENTS",
] as const;

type Accent = "blue" | "red" | "yellow" | "green";

const SECTION_TITLES: Record<(typeof SECTION_ORDER)[number], string> = {
  CORE: "CORE TEAM",
  SOFTWARE: "SOFTWARE DEV",
  DATA: "DATA & AI",
  INFRASTRUCTURE: "INFRA & SECURITY",
  DESIGN: "DESIGN & MGMT",
  DEV: "DEV TEAM",
  MEDIA: "MEDIA TEAM",
  EVENTS: "EVENTS PLANNING",
};
const SECTION_ACCENT: Record<(typeof SECTION_ORDER)[number], Accent> = {
  CORE: "blue",
  SOFTWARE: "red",
  DATA: "yellow",
  INFRASTRUCTURE: "green",
  DESIGN: "blue",
  DEV: "red",
  MEDIA: "yellow",
  EVENTS: "green",
};
const SECTION_TRANSITION: Record<(typeof SECTION_ORDER)[number], keyof typeof copy.people.transitions> = {
  CORE: "core",
  SOFTWARE: "software",
  DATA: "data",
  INFRASTRUCTURE: "infrastructure",
  DESIGN: "design",
  DEV: "dev",
  MEDIA: "media",
  EVENTS: "events",
};

const PANEL_BG: Record<Accent, string> = {
  blue: "bg-gdg-blue",
  red: "bg-gdg-red",
  yellow: "bg-gdg-yellow",
  green: "bg-gdg-green",
};
const PANEL_TEXT: Record<Accent, string> = {
  blue: "text-cream",
  red: "text-cream",
  yellow: "text-ink",
  green: "text-ink",
};
const RING_HEX: Record<Accent, string> = {
  blue: "#4285f4",
  red: "#ea4335",
  yellow: "#faab00",
  green: "#34a853",
};

interface Chapter {
  id: string;
  title: string;
  accent: Accent;
  kind: "cast" | "special";
  transition: string;
  people: Person[];
}

const CHAPTERS: Chapter[] = [
  ...SECTION_ORDER.map((section) => ({
    id: section.toLowerCase(),
    title: SECTION_TITLES[section],
    accent: SECTION_ACCENT[section],
    kind: "cast" as const,
    transition: copy.people.transitions[SECTION_TRANSITION[section]],
    people: PEOPLE.filter((p) => p.section === section),
  })),
  {
    id: "sponsors",
    title: "SPONSORS",
    accent: "blue" as const,
    kind: "cast" as const,
    transition: copy.people.transitions.sponsors,
    people: PEOPLE.filter((p) => p.section === "SPONSORS"),
  },
  {
    id: "special",
    title: "SPECIAL THANKS",
    accent: "yellow" as const,
    kind: "special" as const,
    transition: copy.people.transitions.specialThanks,
    people: PEOPLE.filter((p) => p.section === "SPECIAL_THANKS"),
  },
];

// Cadence (build4 §10B): one combined chapter card (title + its editorial
// line) holds 1600ms, then the cast sits 2200ms + 130ms per face, capped at
// 5.2s — MEDIA's sixteen people get ~4.3s, DESIGN's three ~2.6s. Total
// schedule ≈ 46.5s against revealMs 60000 (§10.0 80% rule: 46.5 ≤ 48).
const CARD_MS = 1600;

function contentMsFor(chapter: Chapter): number {
  return Math.min(2200 + chapter.people.length * 130, 5200);
}

function Avatar({ person, size, index, ringHex }: { person: Person; size: number; index: number; ringHex?: string }) {
  const [failed, setFailed] = useState(false);
  const ring = ringHex ? { boxShadow: `0 0 0 2px ${ringHex}` } : undefined;
  if (!person.photo || failed) {
    return (
      <div className="rounded-full" style={ring}>
        <InitialsAvatar name={person.name} index={index} sizePx={size} />
      </div>
    );
  }
  return (
    <div
      className="relative rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, ...ring }}
    >
      <Image
        src={person.photo}
        alt={person.name}
        fill
        className="object-cover"
        sizes={`${size}px`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/** Title + the chapter's editorial line as ONE beat — accent panel, skew-in. */
function ChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <motion.div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 ${PANEL_BG[chapter.accent]} ${PANEL_TEXT[chapter.accent]}`}
      initial={{ skewY: 3, opacity: 0 }}
      animate={{ skewY: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <p className="t-display text-center" style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)" }}>
        <PopLetters text={chapter.title} />
      </p>
      <motion.p
        className="t-editorial text-center opacity-80"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.8, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        {chapter.transition}
      </motion.p>
    </motion.div>
  );
}

function CastMoment({ chapter }: { chapter: Chapter }) {
  const glQuality = useGlQualityContext();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-4">
      {/* Static stand-in for the shader's quarter-rings figure (build4 §2.3). */}
      {glQuality === "off" && <QuarterRingsFigure />}
      <p className="t-label text-ink/50">{chapter.title}</p>
      <div className="flex flex-wrap items-end justify-center gap-x-2.5 gap-y-3 max-w-md">
        {chapter.people.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex flex-col items-center gap-1"
            style={{ width: p.isLead ? 84 : 70 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, y: [0, Math.sin(((i % 6) / 6) * Math.PI) * -6, 0] }}
            transition={{
              opacity: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.09 },
              scale: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.09 },
              y: { duration: 1.8, delay: i * 0.09 },
            }}
          >
            <Avatar
              person={p}
              size={p.isLead ? 68 : 54}
              index={i}
              ringHex={p.isLead ? RING_HEX[chapter.accent] : undefined}
            />
            <p
              className="font-bold text-ink/75 text-center leading-tight line-clamp-2"
              style={{ fontSize: "0.5rem" }}
            >
              {p.name}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** The two special-thanks names, large — the DesignersCard treatment. */
function SpecialCard({ chapter }: { chapter: Chapter }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gdg-yellow px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <p className="t-label text-ink/60">{chapter.title}</p>
      <div className="flex gap-8">
        {chapter.people.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.15 }}
          >
            <Avatar person={p} size={84} index={i} />
            <p className="t-display text-ink text-center" style={{ fontSize: "clamp(0.95rem, 5cqw, 1.3rem)" }}>
              {p.name}
            </p>
          </motion.div>
        ))}
      </div>
      <p className="t-editorial text-ink/70 text-center">{chapter.transition}</p>
    </motion.div>
  );
}

export function PeopleStory({ phase, active, paused }: StoryProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [showCard, setShowCard] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function runChapter(idx: number) {
      if (idx >= CHAPTERS.length) {
        if (!cancelled) setFinished(true);
        return;
      }
      setChapterIdx(idx);
      setShowCard(true);
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setShowCard(false);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              runChapter(idx + 1);
            }, contentMsFor(CHAPTERS[idx]!))
          );
        }, CARD_MS)
      );
    }
    runChapter(chapterIdx);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, active, paused]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16">
        <p className="t-editorial text-center">
          <PopLetters text={copy.people.setup} />
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16">
        <p className="t-editorial text-center">{copy.people.transitions.closer}</p>
      </div>
    );
  }

  const chapter = CHAPTERS[chapterIdx]!;

  return (
    <div className="absolute inset-0 text-ink pt-20 pb-16 overflow-hidden">
      {showCard ? (
        <ChapterCard chapter={chapter} />
      ) : chapter.kind === "special" ? (
        <SpecialCard chapter={chapter} />
      ) : (
        <CastMoment chapter={chapter} />
      )}
    </div>
  );
}
