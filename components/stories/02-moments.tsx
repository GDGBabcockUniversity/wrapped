"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { StickerChip } from "@/components/sticker-chip";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { IdleFloat } from "@/components/idle-float";
import { PolaroidFrame, FilmstripFrame, PostcardFrame } from "@/components/moments/frame";
import { MOMENTS, GROUP_CHAT } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { ACCENT_HEX } from "@/components/gl/shaders";
import { vibrate } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";
import type { StoryProps } from "./types";

/**
 * The Moments spread (build7 §4). Each event gets a STYLISED page —
 * polaroid, filmstrip, postcard — not one 4-photo scatter, and the pages run
 * in the year's own order (owner, 2026-07-20): info session first, meetups,
 * All Stars, the Spaces, game nights (a WhatsApp thing — its page carries
 * the busiest-night stat), DevFest (before ORBIT), Tech Week and the
 * Innovation Challenge, then ORBIT closing on a full three-page arc. Pages
 * page-turn with varied transitions (never the same red wipe), and every
 * frame fills its slots from the event's photo pool with a tinted
 * placeholder for any empty slot, so dropping photos into
 * public/moments/<event>/ fills the spread with zero code change.
 */

type PageKind = "polaroid" | "filmstrip" | "postcard";
interface MomentPage {
  key: string;
  event: string;
  kind: PageKind;
  photos: (string | undefined)[];
  photoStart: number;
  caption?: string;
  stat?: string;
  statLabel?: string;
  accent: string;
}

const PAGE_MS = 3800;

function padTo(arr: (string | undefined)[], n: number): (string | undefined)[] {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(undefined);
  return out;
}

function momentById(id: string) {
  const m = MOMENTS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown moment id: ${id}`);
  return m;
}
const info = momentById("info-session");
const meetups = momentById("meetups");
const allstars = momentById("allstars");
const spaces = momentById("spaces");
const games = momentById("games");
const devfest = momentById("devfest");
const techweek = momentById("techweek");
const innovation = momentById("innovation");
const orbit = momentById("orbit");

const PAGES: MomentPage[] = [
  // THE INFO SESSION — where the year started.
  { key: "info-1", event: "INFO SESSION", kind: "polaroid", photos: [info.images[0]], photoStart: 0, caption: info.caption, accent: ACCENT_HEX.blue },
  // MONTHLY MEETUPS — the rhythm underneath everything else.
  { key: "meetups-1", event: "MONTHLY MEETUPS", kind: "filmstrip", photos: padTo(meetups.images, 3), photoStart: 0, caption: meetups.caption, accent: ACCENT_HEX.green },
  // ALL STARS — one proud polaroid.
  { key: "allstars-1", event: "ALL STARS", kind: "polaroid", photos: [allstars.images[0]], photoStart: 0, caption: allstars.caption, accent: ACCENT_HEX.yellow },
  // TWITTER SPACES — the live shot plus the two fliers.
  { key: "spaces-1", event: "TWITTER SPACES", kind: "filmstrip", photos: padTo(spaces.images, 3), photoStart: 0, caption: spaces.caption, accent: ACCENT_HEX.green },
  // GAME NIGHTS — a WhatsApp thing, so its page IS the loudest-night stat.
  { key: "games-1", event: "GAME NIGHTS", kind: "postcard", photos: [games.images[0]], photoStart: 0, stat: GROUP_CHAT.busiestDay.count.toLocaleString("en-US"), statLabel: "MESSAGES, ONE NIGHT", caption: games.caption, accent: ACCENT_HEX.yellow },
  // DEVFEST — before ORBIT, as it happened. Two proud pages.
  { key: "devfest-1", event: "DEVFEST", kind: "polaroid", photos: [devfest.images[0]], photoStart: 0, caption: devfest.caption, accent: ACCENT_HEX.blue },
  { key: "devfest-2", event: "DEVFEST", kind: "filmstrip", photos: padTo(devfest.images.slice(1), 3), photoStart: 1, accent: ACCENT_HEX.blue },
  // BABCOCK TECH WEEK and the INNOVATION CHALLENGE — the campus's week.
  { key: "techweek-1", event: "BABCOCK TECH WEEK", kind: "polaroid", photos: [techweek.images[0]], photoStart: 0, caption: techweek.caption, accent: ACCENT_HEX.green },
  { key: "innovation-1", event: "INNOVATION CHALLENGE", kind: "postcard", photos: [innovation.images[0]], photoStart: 0, caption: innovation.caption, accent: ACCENT_HEX.yellow },
  // ORBIT — the flagship closes the spread, a full three-page arc.
  { key: "orbit-1", event: "ORBIT", kind: "polaroid", photos: [orbit.images[0]], photoStart: 0, caption: orbit.caption, accent: ACCENT_HEX.red },
  { key: "orbit-2", event: "ORBIT", kind: "filmstrip", photos: padTo(orbit.images.slice(1), 3), photoStart: 1, accent: ACCENT_HEX.red },
  { key: "orbit-3", event: "ORBIT", kind: "postcard", photos: [orbit.images[4] ?? orbit.images[0]], photoStart: 4, stat: "547", statLabel: "TICKETS ISSUED", accent: ACCENT_HEX.red },
];

const EXIT_EASE = [0.83, 0, 0.17, 1] as const;
// build7 §4/§8: page turns alternate a horizontal slide and a vertical rise
// so the spread feels authored, not one mechanical wipe on repeat. Overlap
// (no mode="wait") — the incoming page is visible before the outgoing leaves.
const PAGE_VARIANTS = {
  enter: (i: number) => (i % 2 === 0 ? { x: "44%", opacity: 0, scale: 0.94 } : { y: "42%", opacity: 0, scale: 0.94 }),
  center: { x: 0, y: 0, opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 240, damping: 28 } },
  exit: (i: number) =>
    i % 2 === 0
      ? { x: "-34%", opacity: 0, scale: 0.98, transition: { duration: 0.34, ease: EXIT_EASE } }
      : { y: "-32%", opacity: 0, scale: 0.98, transition: { duration: 0.34, ease: EXIT_EASE } },
};

function FrameFor({ page }: { page: MomentPage }) {
  switch (page.kind) {
    case "polaroid":
      return <PolaroidFrame src={page.photos[0]} label={page.event} index={page.photoStart} caption={page.caption} big />;
    case "filmstrip":
      return <FilmstripFrame srcs={page.photos} label={page.event} startIndex={page.photoStart} />;
    case "postcard":
      return (
        <PostcardFrame
          src={page.photos[0]}
          label={page.event}
          index={page.photoStart}
          stat={page.stat}
          statLabel={page.statLabel}
          accentHex={page.accent}
        />
      );
  }
}

/** A caption that types itself out — the scrapbook hand-lettering feel. */
function TypewriterCaption({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? text.length : 0);
  useEffect(() => {
    if (reduceMotion) return;
    // No reset needed: each page's unique key remounts this fresh at shown=0.
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 26);
    return () => clearInterval(id);
  }, [text, reduceMotion]);
  return (
    <p className="t-editorial text-center px-4" style={{ letterSpacing: "0.01em" }}>
      {text.slice(0, shown)}
      <span aria-hidden className="opacity-0">
        {text.slice(shown)}
      </span>
    </p>
  );
}

function PageView({ page, index }: { page: MomentPage; index: number }) {
  return (
    <motion.div
      key={page.key}
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6"
      custom={index}
      variants={PAGE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <motion.div
        initial={{ scale: 1.2, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -3, opacity: 1 }}
        transition={{ ...SPRING.stamp, delay: 0.15 }}
      >
        <StickerChip className="t-display" >
          <span style={{ fontSize: "clamp(1.2rem, 6cqw, 1.9rem)" }}>{page.event}</span>
        </StickerChip>
      </motion.div>
      {/* Secondary motion: once the page lands, the frame keeps a slow drift
          so the hold is never a dead freeze (law 10). */}
      <IdleFloat y={-4} duration={5} delay={0.6}>
        <div className="flex justify-center" style={{ width: "min(88cqw, 360px)" }}>
          <FrameFor page={page} />
        </div>
      </IdleFloat>
      {page.caption && (
        <div className="min-h-[2.5rem] flex items-start">
          <TypewriterCaption text={page.caption} />
        </div>
      )}
    </motion.div>
  );
}

/** The setup tease — a polaroid being taped down, hinting at the spread. */
function SetupTease() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: -8 }}
      animate={{ opacity: 1, y: 0, rotate: -6 }}
      transition={{ ...SPRING.default, delay: 0.1 }}
    >
      <PolaroidFrame src={orbit.images[0]} label="ORBIT" index={0} width="112px" maxWidth={112} />
    </motion.div>
  );
}

export function MomentsStory({ phase, active, paused, onComplete }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const [pageIdx, setPageIdx] = useState(0);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    const isLast = pageIdx >= PAGES.length - 1;
    const id = setTimeout(() => {
      if (isLast) {
        onComplete?.();
        return;
      }
      setPageIdx((i) => i + 1);
      playSfx("tick");
      if (!reduceMotion) vibrate(6);
    }, PAGE_MS);
    return () => clearTimeout(id);
  }, [phase, active, paused, pageIdx, reduceMotion, onComplete]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-4 overflow-hidden">
        <AmbientScribbles field="cream" />
        {/* Preload every spread photo so page turns never pop a blank frame. */}
        <div className="hidden" aria-hidden="true">
          {MOMENTS.flatMap((m) => m.images).map((src) => (
            <Image key={src} src={src} alt="preload" width={240} height={240} priority />
          ))}
        </div>
        <SetupTease />
        <p className="t-editorial text-center">
          <PopLetters text={copy.moments.setup} />
        </p>
      </div>
    );
  }

  const page = PAGES[pageIdx]!;

  return (
    <div className="absolute inset-0 text-ink pt-20 pb-16 overflow-hidden">
      <AmbientScribbles field="cream" />
      <AnimatePresence custom={pageIdx}>
        <PageView key={page.key} page={page} index={pageIdx} />
      </AnimatePresence>
    </div>
  );
}
