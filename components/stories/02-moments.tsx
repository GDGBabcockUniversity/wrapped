"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { MOMENTS } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";

/**
 * The scrapbook, as three directed scenes (§11.5 build2.md) rather than one
 * pile shedding photos. ORBIT, DEVFEST, and GAMES+SPACES combined — each a
 * composed collage, hard-seamed by a masking-tape wipe.
 */
interface Scene {
  id: string;
  title: string;
  caption: string;
  photos: string[]; // 2 or 3, slotted A/B/(C)
}

const SCENES: Scene[] = [
  { id: "orbit", title: MOMENTS[0]!.title, caption: MOMENTS[0]!.caption, photos: MOMENTS[0]!.images },
  { id: "devfest", title: MOMENTS[1]!.title, caption: MOMENTS[1]!.caption, photos: MOMENTS[1]!.images },
  {
    id: "games-spaces",
    title: "GAMES & SPACES",
    caption: "Loud nights, longer talks.",
    photos: [...MOMENTS[2]!.images, ...MOMENTS[3]!.images],
  },
];

const SCENE_MS = 3400;
const WIPE_MS = 280;

// Resting poses per slot (A/B/C) — §11.5.
const RESTING = [
  { x: -18, y: -6, r: -5 },
  { x: 16, y: 4, r: 3 },
  { x: 0, y: -14, r: 1.5 },
];

function TypewriterCaption({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? text.length : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 24);
    return () => clearInterval(id);
  }, [text, reduceMotion]);

  return (
    <p className="t-editorial mt-1" style={{ letterSpacing: "0.01em" }}>
      {text.slice(0, shown)}
      <span aria-hidden className="opacity-0">
        {text.slice(shown)}
      </span>
    </p>
  );
}

function ScenePhoto({
  src,
  slot,
  title,
  failed,
  onError,
}: {
  src: string;
  slot: 0 | 1 | 2;
  title: string;
  failed: boolean;
  onError: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [landed, setLanded] = useState(false);
  const pose = RESTING[slot]!;
  const isDrop = slot === 2;
  const enterDelay = slot === 0 ? 0 : slot === 1 ? 0.12 : 0.05;

  return (
    <motion.div
      className="absolute bg-paper p-2 pb-8 shadow-lg rounded-sm"
      style={{ width: "58cqw", maxWidth: 210, zIndex: slot + 1 }}
      initial={
        reduceMotion
          ? { x: `${pose.x}%`, y: `${pose.y}%`, rotate: pose.r, opacity: 1 }
          : isDrop
            ? { x: `${pose.x}%`, y: "-140%", rotate: pose.r, opacity: 0 }
            : { x: slot === 0 ? "-140%" : "140%", y: `${pose.y}%`, rotate: slot === 0 ? -18 : 18, opacity: 0 }
      }
      animate={{ x: `${pose.x}%`, y: `${pose.y}%`, rotate: pose.r, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { ...SPRING.photo, delay: enterDelay }}
      onAnimationComplete={() => setLanded(true)}
    >
      <div className="relative w-full aspect-square bg-cream-deep overflow-hidden flex items-center justify-center">
        {failed ? (
          <span className="t-label text-ink/40 px-4 text-center">{title}</span>
        ) : (
          <Image
            src={src}
            alt={title}
            fill
            sizes="(max-width: 480px) 60vw, 220px"
            className="object-cover opacity-90 contrast-[1.05] saturate-[85%]"
            onError={onError}
          />
        )}
      </div>
      <motion.div
        aria-hidden
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-5 rounded-sm bg-gdg-red/90 rotate-2"
        initial={{ scale: reduceMotion ? 1 : 1.3, opacity: reduceMotion ? 0.9 : 0 }}
        animate={landed || reduceMotion ? { scale: 1, opacity: 0.9 } : {}}
        transition={{ duration: 0.18, delay: 0.06 }}
      />
    </motion.div>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  const reduceMotion = useReducedMotion();
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());

  return (
    <motion.div
      className="relative flex-1 w-full flex items-center justify-center overflow-hidden"
      initial={{ scale: 1, x: "0%" }}
      animate={reduceMotion ? {} : { scale: 1.06, x: "-2%" }}
      transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
    >
      {scene.photos.map((src, i) => (
        <ScenePhoto
          key={`${scene.id}-${i}`}
          src={src}
          slot={i as 0 | 1 | 2}
          title={scene.title}
          failed={failedKeys.has(src)}
          onError={() => setFailedKeys((prev) => new Set(prev).add(src))}
        />
      ))}
    </motion.div>
  );
}

export function MomentsStory({ phase, active, paused }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function scheduleNext(fromIdx: number) {
      if (fromIdx >= SCENES.length - 1) return;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setWiping(true);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setSceneIdx(fromIdx + 1);
              setWiping(false);
              scheduleNext(fromIdx + 1);
            }, reduceMotion ? 0 : WIPE_MS)
          );
        }, SCENE_MS - (reduceMotion ? WIPE_MS : 0))
      );
    }
    scheduleNext(sceneIdx);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, active, paused, reduceMotion]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.9, y: 0, rotate: -4 }}
          transition={{ duration: 0.24 }}
          className="w-[90px] h-7 rounded-sm bg-gdg-red"
        />
        <p className="t-editorial text-center">
          <PopLetters text={copy.moments.setup} />
        </p>
      </div>
    );
  }

  const scene = SCENES[sceneIdx]!;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 overflow-hidden">
      <AnimatePresence mode="wait">
        <SceneView key={scene.id} scene={scene} />
      </AnimatePresence>
      <div className="text-center mt-4 min-h-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="t-display">{scene.title}</p>
            <TypewriterCaption text={scene.caption} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The masking-tape wipe between scenes — a hard seam, not a fade. */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-full bg-gdg-red pointer-events-none"
          style={{ left: 0 }}
          initial={{ x: "-110%" }}
          animate={wiping ? { x: ["-110%", "0%", "110%"] } : { x: "-110%" }}
          transition={
            wiping
              ? { duration: WIPE_MS / 1000, times: [0, 0.5, 1], ease: "easeInOut" }
              : { duration: 0 }
          }
        />
      )}
    </div>
  );
}
