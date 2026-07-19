"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const LIFE_MS = 4000;
const EXIT_S = 0.4;
const STORAGE_KEY = "wrapped-hinted";

/**
 * The first-run gesture hint (build6 §4.2) — the reference Wrapped's own
 * cue that a visitor CAN act even though the story auto-advances. Shows
 * once per session, only while story 0 is in its reveal phase; the caller
 * passes `active` as that exact condition.
 */
export function GestureHint({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    function reveal() {
      try {
        if (sessionStorage.getItem(STORAGE_KEY)) return;
      } catch {
        // sessionStorage unavailable (private mode) — show anyway, once
      }
      setShow(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // non-fatal
      }
    }
    reveal();

    const id = setTimeout(() => setShow(false), LIFE_MS);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_S }}
          style={{
            background: "radial-gradient(closest-side, rgb(15 15 15 / 0.35), transparent)",
            borderRadius: "9999px",
            padding: "4px 10px",
          }}
        >
          {reduceMotion ? (
            <ChevronUp />
          ) : (
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
            >
              <ChevronUp />
            </motion.div>
          )}
          <span className="t-label text-cream" style={{ fontSize: "0.55rem", opacity: 0.7 }}>
            TAP &rarr; NEXT &middot; HOLD TO PAUSE
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChevronUp() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M7 17 L14 9 L21 17"
        stroke="#fff6e0"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
