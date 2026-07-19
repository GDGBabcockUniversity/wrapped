"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { PEOPLE, type Person } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PopLetters } from "@/components/pop-letters";
import { SlamStat } from "@/components/slam-stat";
import { copy } from "@/lib/copy";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { QuarterRingsFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
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
  // build4 §10B.3 item 5: Dr. Ernest and Emmanuel Oladosu each get their OWN
  // slide (photo, name, editorial line ONLY on the second) rather than one
  // shared card — two full chapters, not two people crammed into one.
  ...PEOPLE.filter((p) => p.section === "SPECIAL_THANKS").map((p, i, arr) => ({
    id: `special-${i}`,
    title: "SPECIAL THANKS",
    accent: "yellow" as const,
    kind: "special" as const,
    transition: i === arr.length - 1 ? copy.people.transitions.specialThanks : "",
    people: [p],
  })),
];

// Cadence (build4 §10B): one combined chapter card (title + its editorial
// line) holds 1600ms, then the cast sits 2200ms + 130ms per face, capped at
// 5.2s — MEDIA's sixteen people get ~4.3s, DESIGN's three ~2.6s. Total
// schedule ≈ 46.5s against revealMs 60000 (§10.0 80% rule: 46.5 ≤ 48).
const CARD_MS = 1600;

function contentMsFor(chapter: Chapter): number {
  return Math.min(2200 + chapter.people.length * 130, 5200);
}

// Deterministic tile widths (build5 §6.2) — chapters with more than five
// people cycle the smaller set (a crowded grid earns smaller frames);
// chapters with five or fewer use the bigger set (fewer faces, bigger
// frames). Cycle lengths are coprime-ish with typical chapter sizes on
// purpose — no two adjacent tiles land on the same width or tilt.
const TILE_WIDTHS_MANY = [92, 74, 84, 70, 96, 78];
const TILE_WIDTHS_FEW = [128, 104, 116, 100, 122];
const SCATTER_ROTATE = [-5, 3, -2, 6, -4, 2];
const SCATTER_Y = [0, 10, -6, 14, 4, -10];

function tileWidth(index: number, chapterSize: number): number {
  return chapterSize > 5 ? TILE_WIDTHS_MANY[index % 6]! : TILE_WIDTHS_FEW[index % 5]!;
}

/** DEV/MEDIA roster roles are just "Member"/"Lead" — show the website
    subteam instead (e.g. "FRONTEND", "BACKEND LEAD") so every tile still
    carries a real role (build5 §6.2, the owner's "roles should also show"). */
function displayRole(person: Person): string {
  const generic = person.role === "Member" || person.role === "Lead" || person.role === "";
  if (generic && person.subteam) {
    return person.isLead ? `${person.subteam} LEAD` : person.subteam;
  }
  return person.role;
}

/** The chapter card's backdrop photos (build5 §6.3): indices 0 and 2 of the
    roster, or 0 and 1 for a chapter with under three people — missing
    photos are skipped, never a blank frame. */
function backdropPhotos(chapter: Chapter): string[] {
  const idxs = chapter.people.length >= 3 ? [0, 2] : [0, 1];
  return idxs
    .map((i) => chapter.people[i]?.photo)
    .filter((p): p is string => Boolean(p));
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

/** Title + the chapter's editorial line as ONE beat — accent panel, skew-in,
    with two grayscale photos from the chapter's own roster bleeding off
    opposite corners at monument scale (build5 §6.3) — never a plain wall
    of color. The title block anchors left with a standing 2° tilt, off-
    center instead of the old dead-symmetric centering. The title slams
    (build4 §10B.3 item 3) — cast-grid labels keep PopLetters. */
function ChapterCard({ chapter }: { chapter: Chapter }) {
  const [backdropA, backdropB] = backdropPhotos(chapter);
  return (
    <motion.div
      className={`absolute inset-0 flex flex-col items-start justify-center gap-3 px-8 overflow-hidden ${PANEL_BG[chapter.accent]} ${PANEL_TEXT[chapter.accent]}`}
      initial={{ skewY: 3, opacity: 0 }}
      animate={{ skewY: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {backdropA && (
        <div
          aria-hidden
          className="absolute -top-[8%] -left-[12%] rounded-xl overflow-hidden grayscale opacity-20 pointer-events-none"
          style={{ width: "55cqw", aspectRatio: "1", rotate: "-8deg" }}
        >
          <Image src={backdropA} alt="" fill className="object-cover" sizes="55cqw" />
        </div>
      )}
      {backdropB && (
        <div
          aria-hidden
          className="absolute -bottom-[10%] -right-[14%] rounded-xl overflow-hidden grayscale opacity-20 pointer-events-none"
          style={{ width: "55cqw", aspectRatio: "1", rotate: "5deg" }}
        >
          <Image src={backdropB} alt="" fill className="object-cover" sizes="55cqw" />
        </div>
      )}
      <div className="relative z-10 flex flex-col items-start gap-3" style={{ rotate: "2deg" }}>
        <SlamStat
          value={chapter.title}
          className="t-display text-left"
          style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)" }}
        />
        {chapter.transition && (
          <motion.p
            className="t-editorial text-left opacity-80"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            {chapter.transition}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/** A rounded-rect photo tile — bigger and rougher than a circle avatar
    (build5 §6.2, the owner's "pictures should be bigger"). InitialsAvatar
    fallback renders square at the tile's width when a photo is missing or
    fails to load. */
function PhotoTile({ person, index, size }: { person: Person; index: number; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative rounded-lg overflow-hidden flex-shrink-0 w-full aspect-[4/5] bg-ink/10">
      {!person.photo || failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <InitialsAvatar name={person.name} index={index} sizePx={size} square />
        </div>
      ) : (
        <Image
          src={person.photo}
          alt={person.name}
          fill
          className="object-cover"
          sizes={`${size}px`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** One person's photo tile + name + role, the shared unit of every cast
    grid. No lead ring, no uniform sizing — every tile scatters to a
    deterministic width/tilt/offset (build5 §6.2, the owner's "don't
    highlight the leads with a circle and they don't have to be
    symmetrical"). Leads keep only their position (first) in the roster. */
function PersonTile({ person, index, chapterSize }: { person: Person; index: number; chapterSize: number }) {
  const size = tileWidth(index, chapterSize);
  const rotate = SCATTER_ROTATE[index % 6]!;
  const dy = SCATTER_Y[index % 6]!;
  const role = displayRole(person);
  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      style={{ width: size }}
      initial={{ opacity: 0, scale: 0, rotate: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1, rotate, y: dy }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.09 }}
    >
      <PhotoTile person={person} index={index} size={size} />
      <p
        className="font-bold text-ink/80 text-center leading-tight line-clamp-1 w-full"
        style={{ fontSize: "0.62rem" }}
      >
        {person.name}
      </p>
      {role && (
        <p
          className="text-ink/55 text-center leading-tight line-clamp-1 uppercase w-full"
          style={{ fontSize: "0.5rem", letterSpacing: "0.04em" }}
        >
          {role}
        </p>
      )}
    </motion.div>
  );
}

// build4 §10B.3 item 1: subteam headers inside the MEDIA grid only, and only
// for its multi-member subteams that still fit the stage — RADAR, Video
// Editors, Graphic Designers. Photographers/Content Creators stay unlabeled
// (a chip per lone-ish face is noise); DEV stays flat entirely (§10B.3).
const LABELED_MEDIA_SUBTEAMS = new Set(["RADAR", "Video Editors", "Graphic Designers"]);

function CastMoment({ chapter }: { chapter: Chapter }) {
  const glQuality = useGlQualityContext();
  const isMedia = chapter.id === "media";
  // A subteam header shows once, on the first person of a new labeled
  // subteam — derived by comparing each person to the previous one, no
  // mutable scan variable.
  const headerFlags = chapter.people.map((p, i) => {
    if (!isMedia || !p.subteam || !LABELED_MEDIA_SUBTEAMS.has(p.subteam)) return false;
    return chapter.people[i - 1]?.subteam !== p.subteam;
  });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-4">
      {/* Static stand-in for the shader's quarter-rings figure (build4 §2.3). */}
      {glQuality === "off" && <QuarterRingsFigure />}
      <StickerChip className="t-label">{chapter.title}</StickerChip>
      <div
        className={`flex flex-wrap items-start justify-center gap-x-2.5 gap-y-3 ${
          // §10B.3 item 2: the 16-person MEDIA grid collides with the
          // quarter-rings figure's bottom-left anchor at max-w-md.
          isMedia ? "max-w-sm" : "max-w-md"
        }`}
      >
        {chapter.people.map((p, i) => (
          <div key={p.name} className="contents">
            {headerFlags[i] && (
              <div className="basis-full flex justify-center">
                <StickerChip className="t-label text-[0.55rem]">{p.subteam!.toUpperCase()}</StickerChip>
              </div>
            )}
            <PersonTile person={p} index={i} chapterSize={chapter.people.length} />
          </div>
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
      {chapter.transition && <p className="t-editorial text-ink/70 text-center">{chapter.transition}</p>}
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
      <AmbientScribbles field="cream" />
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
