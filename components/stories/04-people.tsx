"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { PEOPLE, PRODUCTS, CREWS, type Person } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PopLetters } from "@/components/pop-letters";
import { copy } from "@/lib/copy";
import type { StoryProps } from "./types";

/**
 * Chaptered credits (§11.6 build2.md) — eight title-carded chapters instead
 * of one long roll: CORE TEAM, THE TRACKS, DEV CREW, MEDIA & STORY,
 * EVENTS & OPS, THE BUILDERS (product crew boards), SPECIAL MENTION — THE
 * DESIGNERS, then the closer. Every person with a headshot appears in their
 * section's chapter; nobody is skipped.
 */

const SECTION_ORDER = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS"] as const;
const SECTION_TITLES: Record<(typeof SECTION_ORDER)[number], string> = {
  CORE: "CORE TEAM",
  TRACKS: "THE TRACKS",
  DEV: "DEV CREW",
  MEDIA: "MEDIA & STORY",
  EVENTS: "EVENTS & OPS",
};
const SECTION_ACCENT: Record<(typeof SECTION_ORDER)[number], Accent> = {
  CORE: "blue",
  TRACKS: "red",
  DEV: "yellow",
  MEDIA: "green",
  EVENTS: "blue",
};

type Accent = "blue" | "red" | "yellow" | "green";
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
const BOARD_CHIP_BG: Record<string, string> = {
  blue: "bg-gdg-blue",
  red: "bg-gdg-red",
  yellow: "bg-gdg-yellow",
  green: "bg-gdg-green",
};
const BOARD_CHIP_TEXT: Record<string, string> = {
  blue: "text-cream",
  red: "text-cream",
  yellow: "text-ink",
  green: "text-ink",
};

interface Chapter {
  id: string;
  title: string;
  accent: Accent;
  kind: "cast" | "builders" | "designers";
  people?: Person[];
}

const BUILDER_PRODUCT_NAMES = ["RADAR", "ORBIT", "BABCOCKVOTES", "BABCOCK 100"];

const CHAPTERS: Chapter[] = [
  ...SECTION_ORDER.map((section) => ({
    id: section.toLowerCase(),
    title: SECTION_TITLES[section],
    accent: SECTION_ACCENT[section],
    kind: "cast" as const,
    people: PEOPLE.filter((p) => p.section === section),
  })),
  { id: "builders", title: "THE BUILDERS", accent: "red", kind: "builders" },
  { id: "designers", title: "SPECIAL MENTION", accent: "yellow", kind: "designers" },
];

// Cadence (§11.6 amended): things must sit long enough to take in. Title
// cards hold 900ms; a cast moment earns 110ms per face on top of a 1.6s
// floor, capped at 3.4s, so MEDIA's sixteen people get twice the screen
// time of CORE's six instead of the same flat beat.
const TITLE_CARD_MS = 900;
const BOARD_MS = 2600;

function contentMsFor(chapter: Chapter): number {
  if (chapter.kind !== "cast") return BOARD_MS;
  const count = chapter.people?.length ?? 0;
  return Math.min(1600 + count * 110, 3400);
}

function Avatar({ person, size, index }: { person: Person; size: number; index: number }) {
  const [failed, setFailed] = useState(false);
  if (!person.photo || failed) {
    return <InitialsAvatar name={person.name} index={index} sizePx={size} />;
  }
  return (
    <div className="relative rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
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

function TitleCard({ chapter }: { chapter: Chapter }) {
  return (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center ${PANEL_BG[chapter.accent]} ${PANEL_TEXT[chapter.accent]}`}
      initial={{ skewY: 3, opacity: 0 }}
      animate={{ skewY: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <p className="t-display text-center px-6" style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)" }}>
        <PopLetters text={chapter.title} />
      </p>
    </motion.div>
  );
}

function CastMoment({ chapter }: { chapter: Chapter }) {
  const people = chapter.people ?? [];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-4">
      <p className="t-label text-ink/50">{chapter.title}</p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 max-w-sm">
        {people.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex flex-col items-center gap-1"
            style={{ width: 68 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, y: [0, Math.sin(((i % 6) / 6) * Math.PI) * -6, 0] }}
            transition={{
              opacity: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.09 },
              scale: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.09 },
              y: { duration: 1.8, delay: i * 0.09 },
            }}
          >
            <Avatar person={p} size={60} index={i} />
            {/* Not `.t-label` — a name in all-caps at 0.22em tracking is
                both the wrong voice for a name and, at 68px wide, what was
                actually overflowing into neighboring columns. Plain mixed
                case, tight leading, inline font-size (never loses a
                cascade fight). */}
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

function BuildersBoard() {
  const boardProducts = PRODUCTS.filter((p) => BUILDER_PRODUCT_NAMES.includes(p.name));
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {boardProducts.map((p, i) => {
          const crew = CREWS[p.name] ?? [];
          return (
            <motion.div
              key={p.num}
              className="bg-paper rounded-lg p-3 flex flex-col gap-2 min-h-24"
              initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24, y: i < 2 ? -16 : 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26, delay: i * 0.1 }}
            >
              <span
                className={`t-label px-2 py-1 rounded-full self-start text-[0.55rem] ${BOARD_CHIP_BG[p.color]} ${BOARD_CHIP_TEXT[p.color]}`}
              >
                {p.name}
              </span>
              <div className="flex flex-col gap-0.5">
                {crew.length > 0 ? (
                  crew.map((name) => (
                    <span key={name} className="t-body text-ink/70 text-xs">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="t-label text-ink/35 text-[0.5rem]">CREW</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function DesignersCard() {
  const designers = PEOPLE.filter((p) => p.role.toLowerCase().includes("design"));
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gdg-yellow px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <p className="t-label text-ink/60">SPECIAL MENTION</p>
      <div className="flex gap-8">
        {designers.map((p, i) => (
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
      <p className="t-editorial text-ink/70 text-center">The designers.</p>
    </motion.div>
  );
}

export function PeopleStory({ phase, active, paused }: StoryProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [showTitleCard, setShowTitleCard] = useState(true);
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
      setShowTitleCard(true);
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setShowTitleCard(false);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              runChapter(idx + 1);
            }, contentMsFor(CHAPTERS[idx]!))
          );
        }, TITLE_CARD_MS)
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
        <p className="t-editorial text-center">&hellip;and everyone who showed up.</p>
      </div>
    );
  }

  const chapter = CHAPTERS[chapterIdx]!;

  return (
    <div className="absolute inset-0 text-ink pt-20 pb-16 overflow-hidden">
      {showTitleCard ? (
        <TitleCard chapter={chapter} />
      ) : chapter.kind === "builders" ? (
        <BuildersBoard />
      ) : chapter.kind === "designers" ? (
        <DesignersCard />
      ) : (
        <CastMoment chapter={chapter} />
      )}
    </div>
  );
}
