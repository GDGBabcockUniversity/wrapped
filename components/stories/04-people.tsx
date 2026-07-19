"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { PEOPLE, SPONSOR_WALL, ADVISORS, MVPS, SPECIAL_FORCE, type Person } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PopLetters } from "@/components/pop-letters";
import { SlamStat } from "@/components/slam-stat";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { QuarterRingsFigure } from "@/components/gl/static-figure";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { playSfx } from "@/lib/sfx";
import type { StoryProps } from "./types";

/**
 * Chaptered credits, in the gdgbabcock.com/team display order (build4 §10B):
 * CORE -> the four tracks (Software Development & Engineering, Data & AI,
 * Infrastructure & Security, Design & Management) -> Dev Team -> five MEDIA
 * subteam chapters (build5 §6.4 — MEDIA is not one page) -> Events Planning,
 * then sponsors, special thanks, and the closer. PEOPLE is already sorted
 * by the website's own algorithm (sections -> declared subteams -> leads
 * first), so render order here is simply array order. Every person
 * appears. Nobody is skipped.
 */

// MEDIA is intentionally absent — it's five subteam chapters (below), not
// one section (build5 §6.4, the owner's "the media team shouldnt all be on
// one page"). DEV stays flat: five people across four subteams would be
// more chips than faces.
const SECTION_ORDER = [
  "CORE",
  "SOFTWARE",
  "DATA",
  "INFRASTRUCTURE",
  "DESIGN",
  "DEV",
  "EVENTS",
] as const;

type Accent = "blue" | "red" | "yellow" | "green";

// Full track names (build5 §6.1, the owner: "its software development and
// engineering track... use the full track names").
const SECTION_TITLES: Record<(typeof SECTION_ORDER)[number], string> = {
  CORE: "CORE TEAM",
  SOFTWARE: "SOFTWARE DEVELOPMENT & ENGINEERING",
  DATA: "DATA & AI",
  INFRASTRUCTURE: "INFRASTRUCTURE & SECURITY",
  DESIGN: "DESIGN & MANAGEMENT",
  DEV: "DEV TEAM",
  EVENTS: "EVENTS PLANNING",
};
const SECTION_ACCENT: Record<(typeof SECTION_ORDER)[number], Accent> = {
  CORE: "blue",
  SOFTWARE: "red",
  DATA: "yellow",
  INFRASTRUCTURE: "green",
  DESIGN: "blue",
  DEV: "red",
  EVENTS: "green",
};
const SECTION_TRANSITION: Record<(typeof SECTION_ORDER)[number], keyof typeof copy.people.transitions> = {
  CORE: "core",
  SOFTWARE: "software",
  DATA: "data",
  INFRASTRUCTURE: "infrastructure",
  DESIGN: "design",
  DEV: "dev",
  EVENTS: "events",
};

// The five MEDIA subteams, in the website's declared subteam order (build5
// §6.4) — Photographers, Content Creators, Graphic Designers, Video
// Editors, RADAR — each its own chapter, compressed cadence (§6.7).
const MEDIA_SUBTEAMS = [
  { id: "media-photo", subteam: "Photographers", title: "PHOTOGRAPHERS", accent: "yellow" as const, transition: "mediaPhoto" as const },
  { id: "media-content", subteam: "Content Creators", title: "CONTENT CREATORS", accent: "red" as const, transition: "mediaContent" as const },
  { id: "media-design", subteam: "Graphic Designers", title: "GRAPHIC DESIGNERS", accent: "blue" as const, transition: "mediaDesign" as const },
  { id: "media-video", subteam: "Video Editors", title: "VIDEO EDITORS", accent: "green" as const, transition: "mediaVideo" as const },
  { id: "media-radar", subteam: "RADAR", title: "RADAR", accent: "red" as const, transition: "mediaRadar" as const },
];

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
  kind: "cast" | "sponsors" | "advisors" | "mvps" | "force";
  transition: string;
  people: Person[];
  /** Card-hold duration override — the five MEDIA subteam chapters compress
      to 1100ms (build5 §6.4); every other chapter keeps CARD_MS's 1600. */
  cardMs?: number;
  /** Content-phase duration override for chapters whose content isn't a
      plain cast grid (build5 §6.5-§6.7) — the sponsor wall and closer arc
      each script their own internal sub-beats. */
  contentMs?: number;
}

// CORE..DEV, then the five MEDIA subteam chapters, then EVENTS — SECTION_ORDER
// itself has no MEDIA entry to splice around, so the non-MEDIA sections are
// built once and the media chapters are spliced in after DEV's position.
const nonMediaChapters: Chapter[] = SECTION_ORDER.map((section) => ({
  id: section.toLowerCase(),
  title: SECTION_TITLES[section],
  accent: SECTION_ACCENT[section],
  kind: "cast" as const,
  transition: copy.people.transitions[SECTION_TRANSITION[section]],
  people: PEOPLE.filter((p) => p.section === section),
}));
const devPosition = nonMediaChapters.findIndex((c) => c.id === "dev") + 1;
const mediaChapters: Chapter[] = MEDIA_SUBTEAMS.map((m) => ({
  id: m.id,
  title: m.title,
  accent: m.accent,
  kind: "cast" as const,
  transition: copy.people.transitions[m.transition],
  people: PEOPLE.filter((p) => p.section === "MEDIA" && p.subteam === m.subteam),
  cardMs: 1100,
}));

const CHAPTERS: Chapter[] = [
  ...nonMediaChapters.slice(0, devPosition),
  ...mediaChapters,
  ...nonMediaChapters.slice(devPosition),
  // The sponsor wall (build5 §6.5) — real data from the ORBIT repo, three
  // internal beats totaling 6400ms of content (headline alone, then the
  // gold/raffle/industry cluster, then the rest).
  {
    id: "sponsors",
    title: "SPONSORS",
    accent: "blue" as const,
    kind: "sponsors" as const,
    transition: copy.people.transitions.sponsors,
    people: [],
    contentMs: 6400,
  },
  // The closer arc (build5 §6.6): advisors, then the MVPs, then the design
  // special force — four chapters, not two people crammed into one shared
  // card.
  {
    id: "special-thanks",
    title: "SPECIAL THANKS",
    accent: "yellow" as const,
    kind: "advisors" as const,
    transition: copy.people.transitions.specialThanks,
    people: [],
    contentMs: 3200,
  },
  {
    id: "mvps",
    title: "THE MVPS",
    accent: "green" as const,
    kind: "mvps" as const,
    transition: copy.people.transitions.mvps,
    people: [],
    contentMs: 8000,
  },
  {
    id: "special-force",
    title: "THE SPECIAL FORCE",
    accent: "red" as const,
    kind: "force" as const,
    transition: copy.people.transitions.specialForce,
    people: [],
    contentMs: 3400,
  },
];

// Cadence (build5 §6.7): one combined chapter card (title + its editorial
// line) holds 1600ms (media subteams compress to 1100ms), then the cast
// sits min(2400 + 150ms per face, 5600)ms — bigger tiles earn longer
// looks. Total schedule ≈ 82,050ms against revealMs 103000 (80% rule:
// 82050 <= 82400).
const CARD_MS = 1600;

function contentMsFor(chapter: Chapter): number {
  if (chapter.contentMs) return chapter.contentMs;
  return Math.min(2400 + chapter.people.length * 150, 5600);
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
          className="t-display text-left text-balance"
          style={{ fontSize: "clamp(1.4rem, 8cqw, 2.6rem)" }}
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
function PhotoTile({ photo, name, index, size }: { photo: string | null; name: string; index: number; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative rounded-lg overflow-hidden flex-shrink-0 w-full aspect-[4/5] bg-ink/10">
      {!photo || failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <InitialsAvatar name={name} index={index} sizePx={size} square />
        </div>
      ) : (
        <Image
          src={photo}
          alt={name}
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
      <PhotoTile photo={person.photo} name={person.name} index={index} size={size} />
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

// build6 §2.7: the setup screen was a bare line — three small scattered
// circles of the first CORE members tease the credits to come, before the
// full chapter grid takes over.
const TEASE_POSITIONS = [
  { top: "20%", left: "16%" },
  { top: "66%", left: "78%" },
  { top: "42%", left: "74%" },
];
const TEASE_DELAYS_S = [0.4, 0.7, 1.0];

function TeaseAvatar({ person, index }: { person: Person; index: number }) {
  const [failed, setFailed] = useState(false);
  const pos = TEASE_POSITIONS[index % TEASE_POSITIONS.length]!;
  return (
    <motion.div
      aria-hidden
      className="absolute rounded-full overflow-hidden"
      style={{ width: 24, height: 24, ...pos }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.45 }}
      transition={{ duration: 0.4, delay: TEASE_DELAYS_S[index % TEASE_DELAYS_S.length] }}
    >
      {!person.photo || failed ? (
        <InitialsAvatar name={person.name} index={index} sizePx={24} />
      ) : (
        <Image
          src={person.photo}
          alt=""
          fill
          className="object-cover"
          sizes="24px"
          onError={() => setFailed(true)}
        />
      )}
    </motion.div>
  );
}

/** A plain name tile (photo + name, no role line) — the closer arc's MVPs
    and special force, whose "role" is the section header itself. */
function NamedTile({ photo, name, index, size }: { photo: string | null; name: string; index: number; size: number }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      style={{ width: size }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.09 }}
    >
      <PhotoTile photo={photo} name={name} index={index} size={size} />
      <p
        className="font-bold text-ink/80 text-center leading-tight line-clamp-1 w-full"
        style={{ fontSize: "0.6rem" }}
      >
        {name}
      </p>
    </motion.div>
  );
}

function CastMoment({ chapter }: { chapter: Chapter }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-4">
      <StickerChip className="t-label">{chapter.title}</StickerChip>
      <div className="flex flex-wrap items-start justify-center gap-x-2.5 gap-y-3 max-w-md">
        {chapter.people.map((p, i) => (
          <PersonTile key={p.name} person={p} index={i} chapterSize={chapter.people.length} />
        ))}
      </div>
    </div>
  );
}

/** A sponsor logo on a paper chip — a white field for logos that need one
    (build5 §6.5). Falls back to the sponsor's name if the logo fails to
    load, never a broken image. */
function SponsorChip({ sponsor, index, big }: { sponsor: { name: string; logo: string }; index: number; big?: boolean }) {
  const [failed, setFailed] = useState(false);
  const rotate = big ? -2 : SCATTER_ROTATE[index % 6]!;
  const size = big ? 160 : 84;
  return (
    <motion.div
      className="relative bg-paper rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ scale: 1.25, rotate: rotate * 3, opacity: 0 }}
      animate={{ scale: 1, rotate, opacity: 1 }}
      transition={{ ...SPRING.stamp, delay: index * 0.06 }}
    >
      {failed ? (
        <span className="t-label text-ink/70 text-center leading-tight px-1" style={{ fontSize: "0.5rem" }}>
          {sponsor.name}
        </span>
      ) : (
        <Image
          src={sponsor.logo}
          alt={sponsor.name}
          fill
          className="object-contain p-2"
          sizes={`${size}px`}
          onError={() => setFailed(true)}
        />
      )}
    </motion.div>
  );
}

// Sponsor wall beats (build5 §6.5): headline alone, then gold + raffle +
// industry (9 logos), then everything else (hospitality + career fair +
// student + media + associate communities — 13 logos). Tier index 0 is the
// headline; 1-3 are beat two; 4-8 are beat three.
const SPONSOR_BEAT_MS = [2000, 2200, 2200];

function SponsorWall({ paused }: { paused: boolean }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (paused || beat >= SPONSOR_BEAT_MS.length - 1) return;
    const id = setTimeout(() => setBeat((b) => b + 1), SPONSOR_BEAT_MS[beat]);
    return () => clearTimeout(id);
  }, [paused, beat]);

  const headline = SPONSOR_WALL[0]!;
  const clusterTwo = SPONSOR_WALL.slice(1, 4);
  const clusterThree = SPONSOR_WALL.slice(4);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-5 overflow-hidden">
      <AnimatePresence mode="wait">
        {beat === 0 && (
          <motion.div
            key="headline"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <StickerChip className="t-label">{headline.tier}</StickerChip>
            <SponsorChip sponsor={headline.sponsors[0]!} index={0} big />
          </motion.div>
        )}
        {beat === 1 && (
          <motion.div
            key="cluster-two"
            className="flex flex-col items-center gap-4 w-full max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {clusterTwo.map((tier) => (
              <div key={tier.tier} className="flex flex-col items-center gap-2">
                <StickerChip className="t-label text-[0.55rem]">{tier.tier}</StickerChip>
                <div className="flex flex-wrap justify-center gap-2">
                  {tier.sponsors.map((s, i) => (
                    <SponsorChip key={s.name} sponsor={s} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
        {beat === 2 && (
          <motion.div
            key="cluster-three"
            className="flex flex-col items-center gap-3 w-full max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {clusterThree.map((tier) => (
              <div key={tier.tier} className="flex flex-col items-center gap-2">
                <StickerChip className="t-label text-[0.5rem]">{tier.tier}</StickerChip>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {tier.sponsors.map((s, i) => (
                    <SponsorChip key={s.name} sponsor={s} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** SPECIAL THANKS chapter 1's content (build5 §6.6): the two advisors, each
    a large tile with their role on a sticker chip beneath the name. */
function AdvisorsMoment() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-6 px-6">
      {ADVISORS.map((a, i) => (
        <motion.div
          key={a.name}
          className="flex flex-col items-center gap-2"
          style={{ width: 128 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.15 }}
        >
          <PhotoTile photo={a.photo} name={a.name} index={i} size={128} />
          <p className="font-bold text-ink/85 text-center leading-tight" style={{ fontSize: "0.8rem" }}>
            {a.name}
          </p>
          <StickerChip className="t-label text-[0.55rem]">{a.role}</StickerChip>
        </motion.div>
      ))}
    </div>
  );
}

// The MVPs' three sub-beats (build5 §6.6): most active core team, most
// active media team, most active track.
const MVPS_BEAT_MS = [2800, 2800, 2400];

function MvpsMoment({ paused }: { paused: boolean }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (paused || beat >= MVPS_BEAT_MS.length - 1) return;
    const id = setTimeout(() => setBeat((b) => b + 1), MVPS_BEAT_MS[beat]);
    return () => clearTimeout(id);
  }, [paused, beat]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-4">
      <AnimatePresence mode="wait">
        {beat === 0 && (
          <motion.div
            key="core"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <StickerChip className="t-label">MOST ACTIVE CORE TEAM</StickerChip>
            <div className="flex flex-wrap justify-center gap-3 max-w-xs">
              {MVPS.core.map((p, i) => (
                <NamedTile key={p.name} photo={p.photo} name={p.name} index={i} size={104} />
              ))}
            </div>
          </motion.div>
        )}
        {beat === 1 && (
          <motion.div
            key="media"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <StickerChip className="t-label">MOST ACTIVE MEDIA TEAM</StickerChip>
            <div className="flex flex-wrap justify-center gap-3 max-w-xs">
              {MVPS.media.map((p, i) => (
                <NamedTile key={p.name} photo={p.photo} name={p.name} index={i} size={104} />
              ))}
            </div>
          </motion.div>
        )}
        {beat === 2 && (
          <motion.div
            key="track"
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="t-label text-ink/60">MOST ACTIVE TRACK</p>
            <SlamStat
              value={MVPS.track}
              className="t-display text-center"
              style={{ fontSize: "clamp(1.6rem, 10cqw, 3rem)" }}
            />
            <p className="t-editorial text-ink/70 text-center">They never stopped talking. Or building.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** THE SPECIAL FORCE chapter's content (build5 §6.6): the design team
    behind every product, five named tiles. */
function SpecialForceMoment() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-4">
      <div className="flex flex-wrap justify-center gap-3 max-w-xs">
        {SPECIAL_FORCE.map((p, i) => (
          <NamedTile key={p.name} photo={p.photo} name={p.name} index={i} size={104} />
        ))}
      </div>
    </div>
  );
}

// build6 §2.6: the closer used to hold "…and everyone who showed up."
// indefinitely (the schedule finishes ~13.5s before revealMs and `finished`
// just idled). It now holds long enough to read and land, then hands off —
// the same onComplete wiring built's guess game already uses.
const CLOSER_HOLD_MS = 2600;

export function PeopleStory({ phase, active, paused, onComplete }: StoryProps) {
  const glQuality = useGlQualityContext();
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
      const chapter = CHAPTERS[idx]!;
      setChapterIdx(idx);
      setShowCard(true);
      playSfx("tick");
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setShowCard(false);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              runChapter(idx + 1);
            }, contentMsFor(chapter))
          );
        }, chapter.cardMs ?? CARD_MS)
      );
    }
    runChapter(chapterIdx);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, active, paused]);

  // The closer's dead-end (build6 §2.6): hold CLOSER_HOLD_MS once landed,
  // then advance the player. Respects pause the same way the chapter clock
  // above does — a pause mid-hold restarts the hold in full on resume.
  useEffect(() => {
    if (!finished || paused) return;
    const id = setTimeout(() => onComplete?.(), CLOSER_HOLD_MS);
    return () => clearTimeout(id);
  }, [finished, paused, onComplete]);

  if (phase === "setup") {
    const teaseCore = PEOPLE.filter((p) => p.section === "CORE").slice(0, 3);
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16 overflow-hidden">
        <AmbientScribbles field="cream" />
        {teaseCore.map((p, i) => (
          <TeaseAvatar key={p.name} person={p} index={i} />
        ))}
        <p className="t-editorial text-center">
          <PopLetters text={copy.people.setup} />
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16 overflow-hidden">
        <AmbientScribbles field="cream" />
        <p className="t-editorial text-center">{copy.people.transitions.closer}</p>
      </div>
    );
  }

  const chapter = CHAPTERS[chapterIdx]!;

  return (
    <div className="absolute inset-0 text-ink pt-20 pb-16 overflow-hidden">
      <AmbientScribbles field="cream" />
      {/* Static stand-in for the shader's quarter-rings figure (build4
          §2.3) — the story's one ambient system throughout every chapter
          kind (law 1). */}
      {glQuality === "off" && <QuarterRingsFigure />}
      {showCard ? (
        <ChapterCard chapter={chapter} />
      ) : chapter.kind === "sponsors" ? (
        <SponsorWall paused={paused} />
      ) : chapter.kind === "advisors" ? (
        <AdvisorsMoment />
      ) : chapter.kind === "mvps" ? (
        <MvpsMoment paused={paused} />
      ) : chapter.kind === "force" ? (
        <SpecialForceMoment />
      ) : (
        <CastMoment chapter={chapter} />
      )}
    </div>
  );
}
