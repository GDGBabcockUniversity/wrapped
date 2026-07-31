"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const LIFE_MS = 5200;
const EXIT_S = 0.45;
const SWIPE_S = 1.9; // one full demo swipe, including the pause between
// How long the visitor has to sit doing nothing before the demo appears at
// all. Long enough that anyone who was going to swipe unprompted already has,
// short enough to arrive while they are still wondering what to do.
const IDLE_BEFORE_MS = 2600;
// Everything that proves someone can already drive the thing. `wheel` and
// `touchmove` are in the list because a trackpad or a half-committed drag is
// someone reaching for the gesture even when it never lands as a swipe.
const INTERACTIONS = ["pointerdown", "keydown", "wheel", "touchmove"] as const;
// localStorage, not sessionStorage — "first time" means first time on this
// DEVICE (owner, 2026-07-20). A returning visitor already knows the moves;
// only genuinely new people get the flash.
// v3: the icon-chip legend was replaced by the demonstrated swipe.
// v4: it waits for stillness now, so a v3 visitor who never actually saw the
// old flash is worth showing it to once.
const STORAGE_KEY = "wrapped-coach-v4";

const CREAM = "#fff6e0";

/** A hand, drawn the way the platform coach marks draw one: index finger up,
    curled fist beneath. Deliberately simple — it has to read at 44px while
    moving. */
function Hand() {
  return (
    <svg width="46" height="60" viewBox="0 0 46 60" fill="none" aria-hidden>
      {/* The demo plays over ink AND cream story fields — the shadow is what
          keeps a cream-stroked hand legible on the light ones. */}
      <g
        style={{ filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.5))" }}
        stroke={CREAM}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(15,15,15,0.55)"
      >
        {/* index finger */}
        <path d="M19 30V9.5a4.2 4.2 0 0 1 8.4 0V30" />
        {/* fist */}
        <path d="M27.4 24.5a3.7 3.7 0 0 1 7.4 0v6M34.8 27.5a3.6 3.6 0 0 1 7 0v10.8c0 8.4-5.2 14.4-13.4 14.4h-3.2c-5.6 0-8.6-2.4-11.4-7L8 37.6a3.7 3.7 0 0 1 6-4.3l5 5.4V30" />
      </g>
    </svg>
  );
}

/**
 * The first-run gesture coach (build6 §4.2, rebuilt as a demonstration
 * 2026-07-20) — the previous version was a legend: four chips of arrow
 * glyphs and shouty labels that a visitor had to READ. A first-time TikTok
 * user is never told to scroll; they're shown one hand travelling up the
 * screen, once, and they copy it. This shows the swipe instead of naming it:
 * the hand rises along a fading track, twice, over a dim scrim.
 *
 * It waits to be needed (owner, 2026-07-31: the swipe gimmick "shouldn't
 * always be visible"). Appearing on a fixed cue meant everybody got taught,
 * including the majority who had already swiped by the time the demo showed
 * up and now had a hand crawling over a chapter they were reading. So it
 * arms on `active` and then holds: only a run of IDLE_BEFORE_MS with nobody
 * touching anything brings it out, and the first touch of any kind takes it
 * away again. Someone who interacts before it appears never sees it at all,
 * and is marked as knowing the moves so no later visit shows it either.
 */
export function GestureHint({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (!active || armed.current) return;
    armed.current = true;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // storage unavailable (private mode) — fall through and coach once
      // per load, which is the safe way to be wrong.
    }

    function learned() {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // nothing to remember it with; the in-component guards still hold
      }
    }

    // Deferred through setTimeout rather than calling setState synchronously
    // in the effect body (React's cascading-render guidance).
    const idle = setTimeout(() => setShow(true), IDLE_BEFORE_MS);
    const life = setTimeout(() => {
      setShow(false);
      learned();
    }, IDLE_BEFORE_MS + LIFE_MS);

    // Capture phase, because TapZones sits above the whole stage and stops
    // plenty of these from bubbling anywhere useful.
    function onInteract() {
      clearTimeout(idle);
      clearTimeout(life);
      setShow(false);
      learned();
      teardown();
    }
    function teardown() {
      for (const type of INTERACTIONS) {
        window.removeEventListener(type, onInteract, { capture: true });
      }
    }
    for (const type of INTERACTIONS) {
      window.addEventListener(type, onInteract, { capture: true, passive: true });
    }

    return () => {
      clearTimeout(idle);
      clearTimeout(life);
      teardown();
      // `active` going false means story 0's reveal is over — the chapter
      // this was teaching is gone. Hiding here as well as on the life timer
      // is not belt and braces: clearing the timers WITHOUT hiding would
      // strand a visible demo on top of every chapter that followed, which
      // is the one outcome this component must never produce. It survives
      // today only because story 0's reveal (8000ms) happens to outlast the
      // demo (IDLE_BEFORE_MS + LIFE_MS), and no story timing should be able
      // to break a coach mark.
      setShow(false);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-24 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_S }}
        >
          {/* A soft vignette under the demo so the hand reads over any
              story field without dimming the whole reveal. */}
          <div
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background:
                "linear-gradient(to top, rgb(15 15 15 / 0.55), transparent)",
            }}
          />

          <div className="relative flex flex-col items-center gap-3">
            {/* The track the hand travels — a hint of where the screen goes,
                not an arrow telling you about it. */}
            <div className="relative h-[132px] w-[46px]">
              {!reduceMotion && (
                <motion.div
                  className="absolute left-1/2 bottom-3 w-[2px] -translate-x-1/2 origin-bottom rounded-full"
                  style={{ background: CREAM, height: 96 }}
                  animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 0.28, 0.28, 0] }}
                  transition={{
                    duration: SWIPE_S,
                    times: [0, 0.28, 0.6, 0.78],
                    ease: "easeOut",
                    repeat: Infinity,
                    repeatDelay: 0.2,
                  }}
                />
              )}
              <motion.div
                className="absolute left-0 bottom-0"
                animate={
                  reduceMotion
                    ? { y: -36, opacity: 1 }
                    : { y: [8, -84, -84], opacity: [0, 1, 0] }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.01 }
                    : {
                        duration: SWIPE_S,
                        times: [0, 0.62, 0.86],
                        ease: [0.22, 0.9, 0.28, 1],
                        repeat: Infinity,
                        repeatDelay: 0.2,
                      }
                }
              >
                <Hand />
              </motion.div>
            </div>

            <span
              className="t-label text-cream"
              style={{ fontSize: "0.6rem", opacity: 0.8 }}
            >
              Swipe for the next chapter
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
