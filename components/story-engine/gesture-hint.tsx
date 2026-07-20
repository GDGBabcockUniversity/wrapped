"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const LIFE_MS = 5200;
const EXIT_S = 0.45;
// localStorage, not sessionStorage — "first time" means first time on this
// DEVICE (owner, 2026-07-20). A returning visitor already knows the moves;
// only genuinely new people get the flash.
const STORAGE_KEY = "wrapped-coach-v2";

const CUES: { icon: "tap-right" | "tap-left" | "swipe-up" | "hold"; text: string }[] = [
  { icon: "tap-right", text: "TAP → NEXT" },
  { icon: "tap-left", text: "TAP LEFT ← BACK" },
  { icon: "swipe-up", text: "SWIPE ↑ ALL CHAPTERS" },
  { icon: "hold", text: "HOLD TO PAUSE" },
];

function CueIcon({ kind }: { kind: (typeof CUES)[number]["icon"] }) {
  const stroke = "#fff6e0";
  switch (kind) {
    case "tap-right":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="6" cy="8" r="3.4" stroke={stroke} strokeWidth="1.6" />
          <path d="M11 8h3.4M12.4 5.8L14.8 8l-2.4 2.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "tap-left":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="10" cy="8" r="3.4" stroke={stroke} strokeWidth="1.6" />
          <path d="M5 8H1.6M3.6 5.8L1.2 8l2.4 2.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "swipe-up":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 13V4M4.5 7.5L8 3.5l3.5 4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "hold":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="4" y="3" width="2.6" height="10" rx="1.3" fill={stroke} />
          <rect x="9.4" y="3" width="2.6" height="10" rx="1.3" fill={stroke} />
        </svg>
      );
  }
}

/**
 * The first-run gesture coach (build6 §4.2, rebuilt 2026-07-20) — flashes
 * ONCE per device over story 0's reveal, teaches every gesture the player
 * actually supports, then gets out of the way forever. The caller passes
 * `active` as the story-0-reveal condition.
 */
export function GestureHint({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage unavailable (private mode) — show anyway, once per load
    }
    // Deferred through setTimeout rather than calling setState synchronously
    // in the effect body (React's cascading-render guidance).
    const show = setTimeout(() => setShow(true), 0);
    const hide = setTimeout(() => setShow(false), LIFE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute bottom-20 inset-x-0 z-20 flex flex-col items-center gap-1.5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: EXIT_S }}
        >
          {CUES.map((cue, i) => (
            <motion.div
              key={cue.icon}
              className="flex items-center gap-2 rounded-full bg-ink/75 px-3.5 py-1.5"
              style={{ backdropFilter: "blur(2px)" }}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 380, damping: 26, delay: 0.15 + i * 0.14 }
              }
            >
              {reduceMotion || cue.icon !== "swipe-up" ? (
                <CueIcon kind={cue.icon} />
              ) : (
                <motion.span
                  className="inline-flex"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
                >
                  <CueIcon kind={cue.icon} />
                </motion.span>
              )}
              <span className="t-label text-cream" style={{ fontSize: "0.55rem", opacity: 0.85 }}>
                {cue.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
