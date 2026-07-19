"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { StickerChip } from "@/components/sticker-chip";
import { MOMENTS, GROUP_CHAT } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { vibrate } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";
import type { StoryProps } from "./types";

interface Scene {
  id: string;
  title: string;
  caption: string;
  photos: string[];
  /** One stat stinger, pinned to the scene's first supporting photo
      (build5 §7.2) — the connective tissue back to the group chat's own
      numbers. Omitted entirely when there's nothing verified to say. */
  stat?: string;
}

const SCENES: Scene[] = [
  {
    id: "orbit",
    title: MOMENTS[0]!.title,
    caption: MOMENTS[0]!.caption,
    photos: MOMENTS[0]!.images,
    stat: "547 TICKETS", // VERIFIED — build5 §3.1, ORBIT admin dashboard
  },
  { id: "devfest", title: MOMENTS[1]!.title, caption: MOMENTS[1]!.caption, photos: MOMENTS[1]!.images },
  {
    id: "games-spaces",
    title: "GAMES & SPACES",
    caption: "Loud nights, longer talks.",
    photos: [...MOMENTS[2]!.images, ...MOMENTS[3]!.images].slice(0, 4),
    stat: `${GROUP_CHAT.busiestDay.count.toLocaleString("en-US")} MESSAGES IN ONE NIGHT`,
  },
];

const SCENE_MS = 4800;
const WIPE_MS = 280;
// The deal (build6 §2.3): photos land 260ms apart, not 150ms — the pile
// assembling IS the screen's motion for its first ~1.2s (law 10).
const DEAL_STAGGER_S = 0.26;
// The flick fires this long before the scene ends, so the reveal has time
// to breathe before the wipe (build6 §2.3).
const FLICK_BEFORE_END_MS = 1400;

// Scrapbook positions, CONTAINER-relative (build6 §2.3) — each slot is a
// left/top percentage of the stage plus a self-centering translate, not a
// percentage of the photo's own tiny width. The old transform-percentage
// offsets moved supporting photos by a few px of their own size, which
// combined with an inverted z-stack left them fully eclipsed under the
// hero — "why am I seeing only one picture." The hero enters FIRST and
// sits lowest (z 1); supports land ON TOP of its edges (z 2,3,4), a pile
// by design, not an eclipse.
const PHOTO_SLOTS = [
  // Hero — carries the scene title on its own corner (build5 §7.1).
  { left: "50%", top: "42%", r: -4, w: "74cqw", maxW: 300, frame: "polaroid", enterDX: 0, enterDY: -100, tape: true },
  { left: "24%", top: "64%", r: -12, w: "46cqw", maxW: 170, frame: "torn", enterDX: -100, enterDY: 20, tape: false },
  { left: "78%", top: "60%", r: 15, w: "42cqw", maxW: 155, frame: "polaroid", enterDX: 100, enterDY: 20, tape: true },
  { left: "70%", top: "18%", r: 8, w: "38cqw", maxW: 140, frame: "torn", enterDX: 20, enterDY: -150, tape: false },
];

function getPhotoSlot(index: number) {
  return PHOTO_SLOTS[index % PHOTO_SLOTS.length]!;
}

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
  title,
  stat,
  flicked,
  failed,
  onError,
}: {
  src: string;
  index: number;
  title: string;
  /** Only ever shown on the first supporting photo (index 1) — build5 §7.2. */
  stat?: string;
  /** The flick (build6 §2.3): the last-dealt photo flings away near the
      scene's end, revealing what it covered. */
  flicked?: boolean;
  failed: boolean;
  onError: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [landed, setLanded] = useState(false);

  const slot = getPhotoSlot(index);
  const enterDelay = index * DEAL_STAGGER_S;
  const isHero = index === 0;
  // Resting position is a self-centering -50%/-50% (the slot's left/top
  // anchor the photo's CENTER on the stage); the entrance adds an extra
  // percentage-of-self offset on top for the "flying in" start, composed
  // on the same x/y channel Motion already owns.
  const restX = -50;
  const restY = -50;

  return (
    <motion.div
      className={`absolute bg-paper shadow-lg flex flex-col ${slot.frame === 'polaroid' ? 'p-2 pb-6 rounded-sm' : 'p-0 photo-frame-torn'}`}
      style={{ left: slot.left, top: slot.top, width: slot.w, maxWidth: slot.maxW, zIndex: index + 1 }}
      initial={
        reduceMotion
          ? { x: `${restX}%`, y: `${restY}%`, rotate: slot.r, opacity: 1 }
          : { x: `${restX + slot.enterDX}%`, y: `${restY + slot.enterDY}%`, rotate: slot.r * 2, opacity: 0 }
      }
      animate={
        flicked
          ? { x: `${restX + 140}%`, y: `${restY}%`, rotate: slot.r + 30, opacity: 0 }
          : { x: `${restX}%`, y: `${restY}%`, rotate: slot.r, opacity: 1 }
      }
      transition={
        flicked
          ? { type: "spring", stiffness: 180, damping: 20 }
          : reduceMotion
            ? { duration: 0 }
            : { ...SPRING.photo, delay: enterDelay }
      }
      onAnimationComplete={() => setLanded(true)}
    >
      <div className={`relative w-full aspect-square bg-cream-deep overflow-hidden flex items-center justify-center ${slot.frame === 'torn' ? 'aspect-[4/5]' : ''}`}>
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
      {slot.tape && (
        <motion.div
          aria-hidden
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-cream shadow-sm opacity-80"
          style={{ transform: 'translateX(-50%) rotate(-4deg)' }}
          initial={{ scale: reduceMotion ? 1 : 1.3, opacity: reduceMotion ? 0.8 : 0 }}
          animate={landed || reduceMotion ? { scale: 1, opacity: 0.8 } : {}}
          transition={{ duration: 0.18, delay: enterDelay + 0.1 }}
        />
      )}
      {/* The scene title, slapped onto the hero photo's corner (build5
          §7.1) — no more title marooned below an empty field. Top-left,
          not bottom-left (build6 §2.3 fix): every support slot (24/64,
          78/60, 70/18) lands across the hero's bottom and right edges —
          a title on the bottom-left corner got buried under the pile the
          moment a support photo landed on top of it. Top-left is the one
          corner none of the four slots ever reach. */}
      {isHero && (
        <motion.p
          className="sticker-chip t-display absolute -top-4 -left-3 z-20 whitespace-nowrap"
          style={{ rotate: 0, fontSize: "clamp(1.3rem, 7cqw, 2rem)" }}
          initial={reduceMotion ? { rotate: -3, opacity: 1 } : { scale: 1.25, rotate: -8, opacity: 0 }}
          animate={landed || reduceMotion ? { scale: 1, rotate: -3, opacity: 1 } : {}}
          transition={reduceMotion ? { duration: 0 } : SPRING.stamp}
        >
          {title}
        </motion.p>
      )}
      {/* One stat stinger per scene, pinned to the first supporting photo's
          corner (build5 §7.2), landing 400ms after this photo does. */}
      {index === 1 && stat && (
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 1.25, rotate: -6, opacity: 0 }}
          animate={landed || reduceMotion ? { scale: 1, rotate: -1.5, opacity: 1 } : {}}
          transition={reduceMotion ? { duration: 0 } : { ...SPRING.stamp, delay: 0.4 }}
        >
          <StickerChip className="t-label text-[0.55rem] whitespace-nowrap">{stat}</StickerChip>
        </motion.div>
      )}
    </motion.div>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  const reduceMotion = useReducedMotion();
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());
  const [flicked, setFlicked] = useState(false);
  // The flick needs a photo underneath it to reveal — below 3 photos
  // there's nothing to uncover, so it's skipped (build6 §2.3).
  const canFlick = scene.photos.length >= 3;
  const flickIndex = scene.photos.length - 1;

  useEffect(() => {
    if (!canFlick || reduceMotion) return;
    const t = setTimeout(() => {
      setFlicked(true);
      vibrate(6);
    }, SCENE_MS - FLICK_BEFORE_END_MS);
    return () => clearTimeout(t);
  }, [canFlick, reduceMotion]);

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
          title={scene.title}
          stat={scene.stat}
          flicked={canFlick && i === flickIndex && flicked}
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

/** The setup tease (build6 §2.3): a real photo being taped down, not a
    lone red rectangle that read as a broken image. Same entrance timing
    the old swatch used; the red tape strip is its own unchanged size and
    rotation, just now sitting on top of something. */
function SetupTease() {
  const [failed, setFailed] = useState(false);
  const photo = SCENES[0]!.photos[0]!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 0.9, y: 0 }}
      transition={{ duration: 0.24 }}
      className="relative"
      style={{ width: 96, rotate: -6 }}
    >
      <div className="relative bg-paper shadow-lg p-1.5 pb-4 rounded-sm">
        <div className="relative w-full aspect-square bg-cream-deep overflow-hidden">
          {!failed && (
            <Image
              src={photo}
              alt=""
              fill
              sizes="96px"
              className="object-cover opacity-90 contrast-[1.05] saturate-[85%]"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
      <div
        aria-hidden
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-[90px] h-7 rounded-sm bg-gdg-red"
        style={{ transform: "translateX(-50%) rotate(-4deg)" }}
      />
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
          playSfx("tick");
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
        <SetupTease />
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
      {/* The title now rides on the hero photo itself (build5 §7.1) — this
          block is just the caption, no longer a marooned title line. */}
      <div className="text-center mt-4 min-h-12 z-30">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
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
