"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { PEOPLE, type Person } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PopLetters } from "@/components/pop-letters";
import { copy } from "@/lib/copy";
import type { StoryProps } from "./types";

const SECTION_ORDER = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS", "SPONSORS", "SPECIAL_THANKS"] as const;
const SECTION_TITLES: Record<(typeof SECTION_ORDER)[number], string> = {
  CORE: "CORE TEAM",
  TRACKS: "THE TRACKS",
  DEV: "DEV CREW",
  MEDIA: "MEDIA & STORY",
  EVENTS: "EVENTS & OPS",
  SPONSORS: "SPONSORS & PARTNERS",
  SPECIAL_THANKS: "SPECIAL THANKS",
};
const SECTION_ACCENT: Record<(typeof SECTION_ORDER)[number], Accent> = {
  CORE: "blue",
  TRACKS: "red",
  DEV: "yellow",
  MEDIA: "green",
  EVENTS: "blue",
  SPONSORS: "yellow",
  SPECIAL_THANKS: "red",
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

interface Chapter {
  id: string;
  title: string;
  accent: Accent;
  kind: "cast" | "sponsors" | "special";
  people?: Person[];
  transitionKey: keyof typeof copy.people.transitions;
}

const CHAPTERS: Chapter[] = [
  { id: "core", title: SECTION_TITLES.CORE, accent: SECTION_ACCENT.CORE, kind: "cast", people: PEOPLE.filter((p) => p.section === "CORE"), transitionKey: "core" },
  { id: "tracks", title: SECTION_TITLES.TRACKS, accent: SECTION_ACCENT.TRACKS, kind: "cast", people: PEOPLE.filter((p) => p.section === "TRACKS"), transitionKey: "tracks" },
  { id: "dev", title: SECTION_TITLES.DEV, accent: SECTION_ACCENT.DEV, kind: "cast", people: PEOPLE.filter((p) => p.section === "DEV"), transitionKey: "dev" },
  { id: "media", title: SECTION_TITLES.MEDIA, accent: SECTION_ACCENT.MEDIA, kind: "cast", people: PEOPLE.filter((p) => p.section === "MEDIA"), transitionKey: "media" },
  { id: "events", title: SECTION_TITLES.EVENTS, accent: SECTION_ACCENT.EVENTS, kind: "cast", people: PEOPLE.filter((p) => p.section === "EVENTS"), transitionKey: "events" },
  { id: "sponsors", title: SECTION_TITLES.SPONSORS, accent: SECTION_ACCENT.SPONSORS, kind: "sponsors", people: PEOPLE.filter((p) => p.section === "SPONSORS"), transitionKey: "sponsors" },
  { id: "special", title: SECTION_TITLES.SPECIAL_THANKS, accent: SECTION_ACCENT.SPECIAL_THANKS, kind: "special", people: PEOPLE.filter((p) => p.section === "SPECIAL_THANKS"), transitionKey: "specialThanks" },
];

const TRANSITION_MS = 1200;
const TITLE_CARD_MS = 1500;
const BOARD_MS = 3600;

function contentMsFor(chapter: Chapter): number {
  if (chapter.kind === "special") return 4500;
  if (chapter.kind !== "cast") return BOARD_MS;
  const count = chapter.people?.length ?? 0;
  return Math.min(2500 + count * 150, 6000);
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

function TransitionCard({ text }: { text: string }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-ink px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="t-editorial text-center text-cream">
        <PopLetters text={text} />
      </p>
    </motion.div>
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

function DoodleStar({ index }: { index: number }) {
  return (
    <motion.svg 
      className="absolute w-6 h-6 text-gdg-yellow"
      style={{
        top: `${10 + (index * 30) % 80}%`,
        left: `${10 + (index * 40) % 80}%`,
        zIndex: 0
      }}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      initial={{ opacity: 0, scale: 0, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.2 + 0.3 }}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </motion.svg>
  );
}

function CastMoment({ chapter }: { chapter: Chapter }) {
  const people = chapter.people ?? [];
  
  // Group by subsection if present, otherwise put in "all"
  const grouped = people.reduce((acc, p) => {
    const key = p.subsection || "all";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, Person[]>);

  const hasSubsections = Object.keys(grouped).length > 1 || (Object.keys(grouped).length === 1 && Object.keys(grouped)[0] !== "all");
  
  let globalIndex = 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-6 pt-12 pb-12 overflow-y-auto overflow-x-hidden no-scrollbar">
      {chapter.id === "core" && (
        <>
          <DoodleStar index={0} />
          <DoodleStar index={1} />
          <DoodleStar index={2} />
        </>
      )}
      
      <p className="t-label text-ink/50 sticky top-0 bg-ink pt-4 z-10 w-full text-center mix-blend-difference text-cream">{chapter.title}</p>
      
      {hasSubsections ? (
        <div className="flex flex-col gap-8 w-full max-w-sm">
          {Object.entries(grouped).map(([subsection, subset], gIdx) => (
            <div key={subsection} className="flex flex-col gap-3">
              <span className="t-label text-ink/40 text-[0.6rem] border-b border-ink/10 pb-1">{subsection}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-4">
                {subset.map((p) => {
                  const i = globalIndex++;
                  return (
                    <motion.div
                      key={p.name}
                      className="flex flex-col items-center gap-1 z-10"
                      style={{ width: 72 }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1, y: [0, Math.sin(((i % 6) / 6) * Math.PI) * -4, 0] }}
                      transition={{
                        opacity: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 },
                        scale: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 },
                        y: { duration: 1.8, delay: i * 0.05 },
                      }}
                    >
                      <Avatar person={p} size={54} index={i} />
                      <p className="t-label text-ink/80 text-[0.45rem] text-center leading-tight line-clamp-2 w-full break-words">
                        {p.name}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 max-w-sm z-10">
          {people.map((p, i) => (
            <motion.div
              key={p.name}
              className="flex flex-col items-center gap-1"
              style={{ width: 72 }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1, y: [0, Math.sin(((i % 6) / 6) * Math.PI) * -4, 0] }}
              transition={{
                opacity: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 },
                scale: { type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 },
                y: { duration: 1.8, delay: i * 0.05 },
              }}
            >
              <Avatar person={p} size={54} index={i} />
              <p className="t-label text-ink/80 text-[0.45rem] text-center leading-tight line-clamp-2 w-full break-words">
                {p.name}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorsBoard({ chapter }: { chapter: Chapter }) {
  const people = chapter.people ?? [];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 gap-8">
      <p className="t-label text-ink/50">{chapter.title}</p>
      <div className="flex flex-wrap justify-center gap-6 max-w-sm">
        {people.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex flex-col items-center gap-2 bg-paper p-4 rounded-lg shadow-sm"
            style={{ width: 140 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.1 }}
          >
            {p.photo ? (
               <div className="relative w-20 h-20 rounded-md overflow-hidden">
                 <Image src={p.photo} alt={p.name} fill className="object-cover" />
               </div>
            ) : (
              <div className="w-20 h-20 bg-cream-deep rounded-md flex items-center justify-center">
                <span className="t-label text-ink/30 text-xs">LOGO</span>
              </div>
            )}
            <p className="t-label text-ink/80 text-[0.55rem] text-center w-full truncate">
              {p.name}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SpecialThanksCard({ chapter }: { chapter: Chapter }) {
  const people = chapter.people ?? [];
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <p className="t-label text-ink/50 tracking-widest">{chapter.title}</p>
      <div className="flex flex-col gap-8 w-full max-w-sm">
        {people.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex items-center gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.3 + 0.2 }}
          >
            <Avatar person={p} size={72} index={i} />
            <p className="t-editorial text-ink text-left" style={{ fontSize: "clamp(1.5rem, 6cqw, 2rem)", fontStyle: "italic" }}>
              {p.name}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function PeopleStory({ phase, active, paused }: StoryProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [step, setStep] = useState<"transition" | "title" | "content">("transition");
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
      setStep("transition");
      
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setStep("title");
          
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setStep("content");
              
              timers.push(
                setTimeout(() => {
                  if (cancelled) return;
                  runChapter(idx + 1);
                }, contentMsFor(CHAPTERS[idx]!))
              );
            }, TITLE_CARD_MS)
          );
        }, TRANSITION_MS)
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
        {/* Preload people photos offscreen/hidden */}
        <div className="hidden" aria-hidden="true">
          {PEOPLE.filter((p) => p.photo).map((p) => (
            <Image
              key={p.photo}
              src={p.photo!}
              alt={p.name}
              width={60}
              height={60}
              priority
            />
          ))}
        </div>
        <p className="t-editorial text-center">
          <PopLetters text={copy.people.setup} />
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16">
        <p className="t-editorial text-center">
          <PopLetters text={copy.people.transitions.closer} />
        </p>
      </div>
    );
  }

  const chapter = CHAPTERS[chapterIdx]!;

  return (
    <div className="absolute inset-0 text-ink pt-20 pb-16 overflow-hidden bg-paper">
      <AnimatePresence mode="wait">
        {step === "transition" ? (
          <TransitionCard key={`trans-${chapter.id}`} text={copy.people.transitions[chapter.transitionKey]} />
        ) : step === "title" ? (
          <TitleCard key={`title-${chapter.id}`} chapter={chapter} />
        ) : chapter.kind === "sponsors" ? (
          <SponsorsBoard key={`content-${chapter.id}`} chapter={chapter} />
        ) : chapter.kind === "special" ? (
          <SpecialThanksCard key={`content-${chapter.id}`} chapter={chapter} />
        ) : (
          <CastMoment key={`content-${chapter.id}`} chapter={chapter} />
        )}
      </AnimatePresence>
    </div>
  );
}
