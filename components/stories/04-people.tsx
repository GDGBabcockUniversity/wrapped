"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { PEOPLE } from "@/lib/content/chapter";
import { InitialsAvatar } from "@/components/initials-avatar";
import { KineticWords } from "@/components/kinetic-words";
import { copy } from "@/lib/copy";
import { TIMING } from "@/lib/stories";
import type { StoryProps } from "./types";

const SECTION_ORDER = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS"] as const;

export function PeopleStory({ phase, active, paused }: StoryProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  const [showTitle, setShowTitle] = useState(true);
  const [finished, setFinished] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    pausedRef.current = paused;
  });

  useEffect(() => {
    if (phase !== "reveal" || !active) return;
    const titleTimeout = setTimeout(() => setShowTitle(false), 1000);

    if (reduceMotion) {
      return () => clearTimeout(titleTimeout);
    }

    let raf = 0;
    let elapsed = 0;
    let lastTs: number | null = null;
    let done = false;

    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      if (!pausedRef.current && !done) elapsed += delta;

      const container = containerRef.current;
      const content = contentRef.current;
      if (container && content) {
        const maxScroll = Math.max(0, content.scrollHeight - container.clientHeight);
        const fraction = Math.min(1, elapsed / TIMING.peopleMs);
        content.style.transform = `translateY(-${fraction * maxScroll}px)`;
        if (fraction >= 1 && !done) {
          done = true;
          setFinished(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(titleTimeout);
    };
  }, [phase, active, reduceMotion]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16">
        <p className="t-editorial text-center">
          <KineticWords text={copy.people.setup} />
        </p>
      </div>
    );
  }

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    people: PEOPLE.filter((p) => p.section === section),
  })).filter((g) => g.people.length > 0);

  return (
    <div className="absolute inset-0 flex flex-col text-ink px-6 pt-20 pb-16 overflow-hidden">
      {showTitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="t-display text-center mt-8"
        >
          {copy.people.reveal}
        </motion.p>
      ) : (
        <p className="t-label text-ink/70 absolute top-20 left-6">{copy.people.reveal}</p>
      )}

      {finished ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="t-editorial text-center">&hellip;and everyone who showed up.</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-hidden mt-10">
          <div ref={contentRef} className="flex flex-col gap-8">
            {grouped.map((g) => (
              <div key={g.section}>
                <div className="relative inline-block mb-3">
                  <p className="t-label text-ink/55">{g.section}</p>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: "left" }}
                    className="h-[2px] bg-gdg-yellow mt-1"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {g.people.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      {p.photo && !failedPhotos.has(p.name) ? (
                        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={p.photo}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="36px"
                            onError={() =>
                              setFailedPhotos((prev) => new Set(prev).add(p.name))
                            }
                          />
                        </div>
                      ) : (
                        <InitialsAvatar name={p.name} index={i} sizePx={36} />
                      )}
                      <div>
                        <p className="t-body font-bold">{p.name}</p>
                        <p className="t-label text-ink/45">{p.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
