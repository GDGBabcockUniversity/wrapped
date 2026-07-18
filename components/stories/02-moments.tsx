"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { MOMENTS } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";

interface Scene {
  id: string;
  title: string;
  caption: string;
  photos: string[];
}

const SCENES: Scene[] = [
  { id: "orbit", title: MOMENTS[0]!.title, caption: MOMENTS[0]!.caption, photos: MOMENTS[0]!.images },
  { id: "devfest", title: MOMENTS[1]!.title, caption: MOMENTS[1]!.caption, photos: MOMENTS[1]!.images },
  {
    id: "games-spaces",
    title: "GAMES & SPACES",
    caption: "Loud nights, longer talks.",
    photos: [...MOMENTS[2]!.images, ...MOMENTS[3]!.images].slice(0, 4),
  },
];

const SCENE_MS = 4300;
const WIPE_MS = 280;

// Varied scrapbook positions depending on photo index
const GET_PHOTO_STYLE = (index: number, total: number) => {
  const styles = [
    // Hero photo
    { x: "0%", y: "-5%", r: -4, w: "65cqw", maxW: 240, frame: "polaroid", enter: { y: "-100%", x: "0%" }, tape: true },
    // Supporting photo 1
    { x: "-15%", y: "15%", r: -12, w: "45cqw", maxW: 160, frame: "torn", enter: { x: "-100%", y: "20%" }, tape: false },
    // Supporting photo 2
    { x: "20%", y: "25%", r: 15, w: "42cqw", maxW: 150, frame: "polaroid", enter: { x: "100%", y: "20%" }, tape: true },
    // Supporting photo 3
    { x: "5%", y: "-35%", r: 8, w: "38cqw", maxW: 140, frame: "torn", enter: { y: "-150%", x: "20%" }, tape: false },
  ];
  return styles[index % styles.length]!;
};

function Doodle({ type, delay }: { type: 'star' | 'arrow' | 'squiggle' | 'circle', delay: number }) {
  const reduceMotion = useReducedMotion();
  
  if (type === 'star') {
    return (
      <motion.svg 
        className="absolute top-[10%] left-[10%] w-12 h-12 text-gdg-red z-20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ delay, duration: 0.1 }}
      >
        <path className={reduceMotion ? "" : "doodle-path doodle-draw"} style={{ animationDelay: `${delay}s` }} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </motion.svg>
    );
  }
  if (type === 'arrow') {
    return (
      <motion.svg 
        className="absolute bottom-[20%] right-[10%] w-16 h-16 text-gdg-blue z-20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ delay, duration: 0.1 }}
      >
        <path className={reduceMotion ? "" : "doodle-path doodle-draw"} style={{ animationDelay: `${delay}s` }} d="M5 12h14M12 5l7 7-7 7" />
      </motion.svg>
    );
  }
  if (type === 'squiggle') {
    return (
      <motion.svg 
        className="absolute top-[30%] right-[5%] w-12 h-12 text-gdg-green z-20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ delay, duration: 0.1 }}
      >
        <path className={reduceMotion ? "" : "doodle-path doodle-draw"} style={{ animationDelay: `${delay}s` }} d="M2 12c2.21-2.21 5.79-2.21 8 0 2.21 2.21 5.79 2.21 8 0 2.21-2.21 5.79-2.21 8 0" />
      </motion.svg>
    );
  }
  if (type === 'circle') {
    return (
      <motion.svg 
        className="absolute bottom-[10%] left-[15%] w-16 h-16 text-gdg-yellow z-20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ delay, duration: 0.1 }}
      >
        <path className={reduceMotion ? "" : "doodle-path doodle-draw"} style={{ animationDelay: `${delay}s` }} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      </motion.svg>
    );
  }
  return null;
}

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
  index,
  total,
  title,
  failed,
  onError,
}: {
  src: string;
  index: number;
  total: number;
  title: string;
  failed: boolean;
  onError: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [landed, setLanded] = useState(false);
  
  const style = GET_PHOTO_STYLE(index, total);
  const enterDelay = index * 0.15;

  return (
    <motion.div
      className={`absolute bg-paper shadow-lg flex flex-col ${style.frame === 'polaroid' ? 'p-2 pb-6 rounded-sm' : 'p-0 photo-frame-torn'}`}
      style={{ width: style.w, maxWidth: style.maxW, zIndex: 10 - index }}
      initial={
        reduceMotion
          ? { x: style.x, y: style.y, rotate: style.r, opacity: 1 }
          : { x: style.enter.x, y: style.enter.y, rotate: style.r * 2, opacity: 0 }
      }
      animate={{ x: style.x, y: style.y, rotate: style.r, opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { ...SPRING.photo, delay: enterDelay }}
      onAnimationComplete={() => setLanded(true)}
    >
      <div className={`relative w-full aspect-square bg-cream-deep overflow-hidden flex items-center justify-center ${style.frame === 'torn' ? 'aspect-[4/5]' : ''}`}>
        {failed ? (
          <span className="t-label text-ink/40 px-4 text-center">{title}</span>
        ) : (
          <Image
            src={src}
            alt={title}
            fill
            sizes="(max-width: 480px) 60vw, 240px"
            className="object-cover opacity-90 contrast-[1.05] saturate-[85%]"
            onError={onError}
          />
        )}
      </div>
      {style.tape && (
        <motion.div
          aria-hidden
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-cream shadow-sm opacity-80"
          style={{ transform: 'translateX(-50%) rotate(-4deg)' }}
          initial={{ scale: reduceMotion ? 1 : 1.3, opacity: reduceMotion ? 0.8 : 0 }}
          animate={landed || reduceMotion ? { scale: 1, opacity: 0.8 } : {}}
          transition={{ duration: 0.18, delay: enterDelay + 0.1 }}
        />
      )}
    </motion.div>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  const reduceMotion = useReducedMotion();
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());

  return (
    <motion.div
      className="relative flex-1 w-full flex items-center justify-center overflow-visible"
      initial={{ scale: 1, x: "0%" }}
      animate={reduceMotion ? {} : { scale: 1.04, x: "-1%" }}
      transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
    >
      {scene.photos.map((src, i) => (
        <ScenePhoto
          key={`${scene.id}-${i}`}
          src={src}
          index={i}
          total={scene.photos.length}
          title={scene.title}
          failed={failedKeys.has(src)}
          onError={() => setFailedKeys((prev) => new Set(prev).add(src))}
        />
      ))}
      <Doodle type="star" delay={0.4} />
      <Doodle type="arrow" delay={0.6} />
      <Doodle type="squiggle" delay={0.8} />
      <Doodle type="circle" delay={0.5} />
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
        {/* Preload moments images offscreen/hidden */}
        <div className="hidden" aria-hidden="true">
          {SCENES.flatMap((s) => s.photos).map((src) => (
            <Image
              key={src}
              src={src}
              alt="preload"
              width={240}
              height={240}
              priority
            />
          ))}
        </div>
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
      <div className="text-center mt-4 min-h-24 z-30">
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
          className="absolute inset-y-0 w-full bg-gdg-red pointer-events-none z-40"
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
