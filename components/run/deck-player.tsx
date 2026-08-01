"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DECK, MOVEMENTS, timeline } from "@/lib/deck";
import { visualFor, vectorBetween } from "@/lib/deck-visuals";
import { STORY_COMPONENTS } from "@/components/stories";
import { StoryFrame } from "@/components/story-engine/story-frame";
import { TapZones } from "@/components/story-engine/tap-zones";
import { ACCENT_HEX } from "@/components/gl/shaders";
import { CLUBS } from "@/lib/clubs";
import { LoudestDay } from "@/components/run/loudest-day";
import { EraBeat, HandoffFrame, HandoverBeat, RoomsBeat, TitleBeat } from "@/components/run/beats";
import * as C from "@/lib/deck-copy";
import type { Snapshot } from "@/lib/snapshot";

const AUDIO_SRC = "/audio/wrapped.mp3";
const FULL_GAIN = 0.6;
/** §2: make the braid audible. Org beats play the full mix; personal beats
    duck, so the handoff is felt before it is read. */
const PERSONAL_GAIN = 0.3;
const DUCK_MS = 450;

const CLUB_PATTERN_INDEX = { grid: 0, waves: 1, halftone: 2, diagonals: 3 } as const;

type Vector = [number, number];
type Phase = "idle" | "running" | "gated" | "done";

// The canvas camera. Screens live on a plane and advancing whips across it —
// outgoing and incoming travel TOGETHER, never mode="wait", or the whip reads
// as two slides instead of one move.
const pct = (n: number) => `${n}%`;
const WHIP_TIMES = [0, 0.19, 1];
const WHIP_EASE: ["easeOut", [number, number, number, number]] = ["easeOut", [0.83, 0, 0.17, 1]];
const WHIP_DURATION = 0.47;
const ANTICIPATE_PCT = 1.5;
const SMEAR_TIMES = [0, 0.19, 0.745, 1];
const WHIP_TRANSITION = { duration: WHIP_DURATION, times: WHIP_TIMES, ease: WHIP_EASE };
const SMEAR_TRANSITION = { duration: WHIP_DURATION, times: SMEAR_TIMES, ease: WHIP_EASE };

/** Motion blur without `filter`: the travelling screen stretches along its
    dominant axis and eases back in the whip's last 120ms. */
function smear(v: Vector, axis: "x" | "y"): number[] {
  const dominant = v[1] !== 0 ? "y" : "x";
  return axis === dominant ? [1, 1, 1.045, 1] : [1, 1, 1, 1];
}

interface CameraCustom { v: Vector; reduceMotion: boolean }

const CAMERA_VARIANTS = {
  enter: ({ v }: CameraCustom) => ({ x: pct(v[0] * 100), y: pct(v[1] * 100), scaleX: 1, scaleY: 1 }),
  center: ({ v }: CameraCustom) => ({
    x: [pct(v[0] * 100), pct(v[0] * 100 + v[0] * ANTICIPATE_PCT), pct(0)],
    y: [pct(v[1] * 100), pct(v[1] * 100 + v[1] * ANTICIPATE_PCT), pct(0)],
    scaleX: smear(v, "x"),
    scaleY: smear(v, "y"),
    transition: { x: WHIP_TRANSITION, y: WHIP_TRANSITION, scaleX: SMEAR_TRANSITION, scaleY: SMEAR_TRANSITION },
  }),
  exit: ({ v, reduceMotion }: CameraCustom) => {
    // Sideways exits shear; clean verticals hold straight, which falls out of
    // sign(v[0]) without branching. Reduced motion zeroes it.
    const s = reduceMotion ? 0 : Math.sign(v[0]);
    return {
      x: [pct(0), pct(v[0] * ANTICIPATE_PCT), pct(-v[0] * 100)],
      y: [pct(0), pct(v[1] * ANTICIPATE_PCT), pct(-v[1] * 100)],
      scaleX: smear(v, "x"),
      scaleY: smear(v, "y"),
      rotate: [0, 0.4 * s, 2.2 * s],
      transition: {
        x: WHIP_TRANSITION, y: WHIP_TRANSITION,
        scaleX: SMEAR_TRANSITION, scaleY: SMEAR_TRANSITION, rotate: WHIP_TRANSITION,
      },
    };
  },
};

/** Content travels 12% further than its screen, on a softer spring. Two
    layers at different speeds is what reads as space rather than a slide. */
const PARALLAX_SPRING = { type: "spring" as const, stiffness: 260, damping: 32 };
const PARALLAX_VARIANTS = {
  enter: (v: Vector) => ({ x: pct(v[0] * 12), y: pct(v[1] * 12) }),
  center: { x: "0%", y: "0%", transition: { x: PARALLAX_SPRING, y: PARALLAX_SPRING } },
  exit: (v: Vector) => ({ x: pct(-v[0] * 12), y: pct(-v[1] * 12), transition: { x: PARALLAX_SPRING, y: PARALLAX_SPRING } }),
};

/** Screens are transparent so the shader shows through, so each travelling
    screen carries its own opaque backdrop while moving and fades it once
    settled. Without this the whip double-exposes. */
const BACKDROP_VARIANTS = {
  enter: { opacity: 1 },
  center: { opacity: 0, transition: { delay: 0.15, duration: 0.3 } },
  exit: { opacity: 1, transition: { duration: 0 } },
};

/** A blink of the incoming beat's accent at the seam — connective tissue. */
const SEAM_VARIANTS = {
  enter: { opacity: 0.9 },
  center: { opacity: 0, transition: { delay: 0.1, duration: 0.3 } },
  exit: { opacity: 0 },
};

function seamEdge(v: Vector): "top" | "bottom" | "left" | "right" {
  if (v[1] !== 0) return v[1] > 0 ? "top" : "bottom";
  return v[0] > 0 ? "right" : "left";
}

function beatAt<T extends { atSec: number }>(beats: T[], t: number): T | undefined {
  let found = beats[0];
  for (const b of beats) if (t >= b.atSec) found = b;
  return found;
}

/** What a beat draws: a story component, one of the new beats, or the
    personal line an org montage hands off to. */
function BeatBody({
  id, story, storyPhase, field, snapshot, paused, revealed, handoff, onReplay,
}: {
  id: string;
  story?: keyof typeof STORY_COMPONENTS;
  storyPhase: "setup" | "reveal";
  field: "ink" | "cream";
  snapshot: Snapshot | null;
  paused: boolean;
  revealed: boolean;
  handoff: boolean;
  onReplay: () => void;
}) {
  if (handoff) {
    const lines =
      id === "the-year" ? C.theYear(snapshot)
      : id === "built" ? C.built(snapshot)
      : C.groupChat(snapshot);
    return <HandoffFrame line={lines[lines.length - 1]!} field={field} />;
  }
  switch (id) {
    case "arrival": return <EraBeat snapshot={snapshot} />;
    case "loudest-day": return <LoudestDay snapshot={snapshot} />;
    case "rooms": return <RoomsBeat snapshot={snapshot} />;
    case "title": return <TitleBeat snapshot={snapshot} revealed={revealed} />;
    case "handover": return <HandoverBeat snapshot={snapshot} />;
    default: break;
  }
  if (!story) return null;
  const Story = STORY_COMPONENTS[story];
  return (
    <Story
      phase={storyPhase}
      active
      snapshot={snapshot}
      guest={!snapshot}
      paused={paused}
      onReplay={onReplay}
    />
  );
}

export function DeckPlayer({ snapshot }: { snapshot: Snapshot | null }) {
  const reduceMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [now, setNow] = useState(0);
  const [vector, setVector] = useState<Vector>([0, 1]);
  // Which interactive beats have been answered. State, not a ref: the render
  // needs it, and reading a ref during render is the tearing React warns about.
  const [revealed, setRevealed] = useState<string[]>([]);
  const gainRef = useRef(FULL_GAIN);
  // The shader field reads progress every frame without re-rendering React.
  const progressRef = useRef(0);

  const beats = useMemo(() => {
    const guest = !snapshot;
    // A guest has nothing to show on the personal beats, and an empty frame
    // is worse than no frame.
    return timeline(
      DECK.filter((b) => !(guest && (b.id === "loudest-day" || b.id === "rooms" || b.id === "title" || b.id === "club")))
    );
  }, [snapshot]);

  const active = useMemo(() => beatAt(beats, now), [beats, now]);
  const index = active ? beats.indexOf(active) : 0;
  const total = beats.length ? beats.at(-1)!.atSec + beats.at(-1)!.durationSec : 1;

  const beatsRef = useRef(beats);
  const totalRef = useRef(total);
  useEffect(() => { beatsRef.current = beats; totalRef.current = total; }, [beats, total]);

  // Whip direction follows the move that actually happened, so a tap back
  // travels the reverse of the way it came.
  const prevIndexRef = useRef(0);
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      setVector(vectorBetween(prevIndexRef.current, index));
      prevIndexRef.current = index;
    }
  }, [index]);

  // The AUDIO is the clock — reading currentTime cannot drift from the music,
  // which a parallel timer eventually always does.
  const gatedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    const tick = () => {
      const el = audioRef.current;
      if (el) {
        const t = el.currentTime;
        setNow(t);
        const beat = beatAt(beatsRef.current, t);
        if (beat) progressRef.current = Math.min(1, (t - beat.atSec) / beat.durationSec);

        if (beat?.interactive && !gatedRef.current.has(beat.id)
            && t >= beat.atSec + beat.durationSec * 0.45) {
          // The beat genuinely waits, so the audio waits with it. Latched,
          // because resuming leaves the playhead past the gate and this would
          // otherwise re-fire on the next frame.
          gatedRef.current.add(beat.id);
          el.pause();
          setPhase("gated");
          return;
        }
        if (t >= totalRef.current - 0.05) {
          el.pause();
          setPhase("done");
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Duck for personal beats, ramped so it reads as a mix move not a glitch.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !active) return;
    const target = active.audience === "org" ? FULL_GAIN : PERSONAL_GAIN;
    const from = gainRef.current;
    if (Math.abs(from - target) < 0.01) return;
    const t0 = performance.now();
    let raf = 0;
    const ramp = (t: number) => {
      const k = Math.min(1, (t - t0) / DUCK_MS);
      gainRef.current = from + (target - from) * k;
      el.volume = Math.max(0, Math.min(1, gainRef.current));
      if (k < 1) raf = requestAnimationFrame(ramp);
    };
    raf = requestAnimationFrame(ramp);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const seek = useCallback((to: number) => {
    const el = audioRef.current;
    const target = beatsRef.current[Math.max(0, Math.min(beatsRef.current.length - 1, to))];
    if (!el || !target) return;
    el.currentTime = target.atSec + 0.01;
    setNow(el.currentTime);
    if (el.paused && phase !== "idle") { el.play().catch(() => {}); setPhase("running"); }
  }, [phase]);

  const start = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = FULL_GAIN;
    el.play().then(() => setPhase("running")).catch(() => setPhase("running"));
  }, []);

  const resume = useCallback(() => {
    const beat = beatAt(beatsRef.current, audioRef.current?.currentTime ?? 0);
    if (beat?.interactive) setRevealed((r) => (r.includes(beat.id) ? r : [...r, beat.id]));
    audioRef.current?.play().catch(() => {});
    setPhase("running");
  }, []);

  const handoffProgress = active ? (now - active.atSec) / active.durationSec : 0;
  const v = active ? visualFor(active) : null;
  const clubMeta = snapshot ? CLUBS[snapshot.club.id] : null;
  const accentHex = v
    ? v.accent === "club" ? clubMeta?.hex ?? ACCENT_HEX.green : ACCENT_HEX[v.accent]
    : ACCENT_HEX.blue;
  const edge = seamEdge(vector);
  const edgeVertical = edge === "top" || edge === "bottom";

  return (
    <StoryFrame
      field={v?.field ?? "ink"}
      storyIndex={v?.shader ?? 0}
      accentHex={accentHex}
      pattern={clubMeta ? CLUB_PATTERN_INDEX[clubMeta.pattern] : 0}
      progressRef={progressRef}
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" playsInline />

      <AnimatePresence initial={false} custom={{ v: vector, reduceMotion: !!reduceMotion }}>
        {phase !== "idle" && active && (
          <motion.div
            key={active.id}
            custom={{ v: vector, reduceMotion: !!reduceMotion }}
            variants={CAMERA_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 z-10 will-change-transform"
          >
            <motion.div
              aria-hidden
              variants={BACKDROP_VARIANTS}
              className={`absolute inset-0 ${v?.field === "ink" ? "bg-ink" : "bg-cream"}`}
            />
            <motion.div
              aria-hidden
              variants={SEAM_VARIANTS}
              className="absolute pointer-events-none"
              style={
                edgeVertical
                  ? { background: accentHex, left: 0, right: 0, height: 2, [edge]: 0 }
                  : { background: accentHex, top: 0, bottom: 0, width: 2, [edge]: 0 }
              }
            />
            <motion.div variants={PARALLAX_VARIANTS} custom={vector} className="absolute inset-0">
              <BeatBody
                id={active.id}
                story={v?.story}
                storyPhase={v!.phase}
                field={v?.field ?? "ink"}
                snapshot={snapshot}
                paused={phase !== "running"}
                revealed={revealed.includes(active.id)}
                handoff={
                  // The braid: an org montage spends its last bars on one of
                  // the member's own numbers. Without this the principle the
                  // whole deck is built on never reaches the screen.
                  !!active.handsOff && handoffProgress > 0.78
                }
                onReplay={() => seek(0)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap the sides, swipe for whole beats — the gesture every visitor
          already has in their thumbs. */}
      {phase === "running" && (
        <TapZones
          onNext={() => seek(index + 1)}
          onPrev={() => seek(index - 1)}
          onNextStory={() => seek(index + 1)}
          onPrevStory={() => seek(index - 1)}
          onPause={() => { audioRef.current?.pause(); setPhase("gated"); }}
          onResume={resume}
          paused={false}
        />
      )}

      {phase !== "idle" && (
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1 p-2 pointer-events-none">
          {beats.map((b) => {
            const done = now >= b.atSec + b.durationSec;
            const within = now >= b.atSec && !done;
            const pctDone = within ? ((now - b.atSec) / b.durationSec) * 100 : done ? 100 : 0;
            return (
              <div key={b.id} className="h-[3px] flex-1 rounded-full bg-cream/25 overflow-hidden">
                <div className="h-full bg-cream" style={{ width: `${pctDone}%` }} />
              </div>
            );
          })}
        </div>
      )}

      {phase !== "idle" && active && (
        <div className="absolute top-5 left-3 z-30 t-label text-cream/30 pointer-events-none"
             style={{ fontSize: "0.5rem" }}>
          {MOVEMENTS[active.movement].numeral} · {active.movement.toUpperCase()}
        </div>
      )}

      {phase === "idle" && (
        <button onClick={start}
                className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5">
          <span className="t-label text-cream/50">GDG ON CAMPUS BABCOCK</span>
          <span className="text-outline-base text-outline-cream leading-none"
                style={{ fontSize: "clamp(3rem, 15vw, 7rem)" }}>WRAPPED</span>
          <span className="t-display text-gdg-blue" style={{ fontSize: "clamp(1.4rem, 8vw, 3rem)" }}>
            2025&ndash;26
          </span>
          <span className="mt-6 rounded-full bg-cream text-ink px-8 py-4 t-label">Play</span>
        </button>
      )}

      {phase === "gated" && (
        <button onClick={resume}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 rounded-full bg-cream text-ink px-8 py-4 t-label">
          {active?.interactive ? "Show me" : "Resume"}
        </button>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-ink/90">
          <p className="t-label text-cream/50">GDG&middot;BABCOCK&middot;2025&ndash;26</p>
          <p className="t-display text-cream" style={{ fontSize: "clamp(1.6rem,7vw,3rem)" }}>
            That was the point.
          </p>
          <button
            onClick={() => { gatedRef.current.clear(); setRevealed([]); seek(0); start(); }}
            className="mt-4 rounded-full border border-cream/40 text-cream px-6 py-3 t-label"
          >
            Watch again
          </button>
        </div>
      )}
    </StoryFrame>
  );
}
