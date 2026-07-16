"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MOMENTS } from "@/lib/content/chapter";
import { copy } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";

const PRINTS = MOMENTS.flatMap((m) =>
  m.images.map((src, i) => ({ src, moment: m, key: `${m.id}-${i}` }))
);
const ROTATIONS = [-3, 2.5, -1.5];
const CYCLE_MS = 1800;

export function MomentsStory({ phase, active, paused }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const [topIdx, setTopIdx] = useState(0);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused || reduceMotion) return;
    const id = setInterval(() => {
      setTopIdx((i) => (i + 1) % PRINTS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [phase, active, paused, reduceMotion]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-ink px-6 pt-20 pb-16 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.9, y: 0, rotate: -4 }}
          transition={{ duration: 0.24 }}
          className="w-[90px] h-7 rounded-sm bg-gdg-red"
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1 }}
          className="t-editorial text-center"
        >
          {copy.moments.setup}
        </motion.p>
      </div>
    );
  }

  const activeMoment = PRINTS[topIdx]!.moment;
  const visibleCount = paused ? PRINTS.length : Math.min(PRINTS.length, 3);
  const center = (visibleCount - 1) / 2;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream text-ink px-6 pt-20 pb-16">
      <div className="relative flex-1 w-full flex items-center justify-center">
        <AnimatePresence>
          {Array.from({ length: visibleCount }).map((_, depth) => {
            const printIdx = (topIdx + depth) % PRINTS.length;
            const print = PRINTS[printIdx]!;
            const isTop = depth === 0;
            const rotate = paused ? (depth - center) * 6 : ROTATIONS[printIdx % 3];
            const x = paused ? (depth - center) * 18 : 0;
            const y = paused ? 0 : depth * 6;
            return (
              <motion.div
                key={print.key}
                className="absolute bg-paper p-2 pb-8 shadow-lg rounded-sm"
                style={{ zIndex: visibleCount - depth, width: "62cqw", maxWidth: 220 }}
                initial={false}
                animate={{ rotate, x: `${x}%`, y, opacity: 1 }}
                exit={isTop ? { x: "120%", rotate: 12, opacity: 0 } : undefined}
                transition={reduceMotion ? { duration: 0 } : SPRING.photo}
              >
                <div className="relative w-full aspect-square bg-ink overflow-hidden">
                  <Image
                    src={print.src}
                    alt={print.moment.title}
                    fill
                    sizes="(max-width: 480px) 90vw, 380px"
                    className="object-cover opacity-90 contrast-[1.05] saturate-[85%]"
                  />
                </div>
                {isTop && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-5 rounded-sm bg-gdg-red/90 rotate-2" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="text-center mt-4 min-h-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMoment.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="t-display">{activeMoment.title}</p>
            <p className="t-editorial mt-1">{activeMoment.caption}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
