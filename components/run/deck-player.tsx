"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DECK, MOVEMENTS, timeline } from "@/lib/deck";
import { assignTitle } from "@/lib/titles";
import type { Snapshot } from "@/lib/snapshot";
import * as C from "@/lib/deck-copy";

const AUDIO_SRC = "/audio/wrapped.mp3";
const FULL_GAIN = 0.6;
/**
 * §2: make the braid audible. Org beats play the full mix; personal beats duck
 * to the same track, quieter. The handoff from "31 events run" to "you were in
 * 9 of those rooms" gets felt before it is read.
 */
const PERSONAL_GAIN = 0.28;
const DUCK_MS = 450;

type Phase = "idle" | "running" | "gated" | "done";

interface BeatContent {
  lines: C.Line[];
  club?: ReturnType<typeof C.club>;
  credits?: boolean;
}

function contentFor(id: string, snap: Snapshot | null): BeatContent | null {
  switch (id) {
    case "cold-open": return { lines: C.coldOpen() };
    case "arrival": return { lines: C.arrival(snap) };
    case "the-year": return { lines: C.theYear(snap) };
    case "built": return { lines: C.built(snap) };
    case "moments": return { lines: C.moments(snap) };
    case "group-chat": return { lines: C.groupChat(snap) };
    case "loudest-day": { const l = C.loudestDay(snap); return l && { lines: l }; }
    case "rooms": { const l = C.rooms(snap); return l && { lines: l }; }
    case "title": {
      if (!snap) return null;
      // Real assignment, on placeholder z-scores until the pipeline computes
      // them — the engine is what is being exercised here, not the inputs.
      const z: Record<string, number> = {
        messages: snap.messages.matched ? Math.min(3, snap.messages.count / 400) : 0,
        checkins: Math.min(3, snap.events.checkins / 8),
        reads: snap.radar ? Math.min(3, snap.radar.reads / 12) : 0,
        plays: snap.radar ? Math.min(3, snap.radar.plays / 20) : 0,
      };
      const t = assignTitle({ z, tier: snap.standing.percentile <= 15 ? "A" : snap.standing.percentile <= 50 ? "B" : "C" });
      return { lines: [
        { text: "Everyone in this chat has a reputation." },
        { kicker: "YOU ARE", text: t.title, sub: t.because },
      ] };
    }
    case "club": { const c = C.club(snap); return c && { lines: [], club: c }; }
    case "people": return { lines: [], credits: true };
    case "handover": return { lines: C.handover(snap) };
    default: return null;
  }
}

/** The beat covering a moment on the deck timeline. */
function beatAt<T extends { atSec: number }>(beats: T[], t: number): T | undefined {
  let found = beats[0];
  for (const b of beats) if (t >= b.atSec) found = b;
  return found;
}

export function DeckPlayer({ snapshot }: { snapshot: Snapshot | null }) {
  const reduceMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [now, setNow] = useState(0);
  const gainRef = useRef(FULL_GAIN);

  // Beats a member has no data for are dropped, and the deck CLOSES UP around
  // them. Filtering a already-timed deck instead leaves every surviving beat
  // sitting at its original position, so a guest — who loses four personal
  // beats — spends forty-two seconds on one screen while the audio plays on.
  // Drop first, time second.
  const beats = useMemo(
    () => timeline(DECK.filter((b) => contentFor(b.id, snapshot) !== null)),
    [snapshot]
  );

  const active = useMemo(() => beatAt(beats, now), [beats, now]);

  const content = active ? contentFor(active.id, snapshot) : null;
  const total = beats.length ? beats.at(-1)!.atSec + beats.at(-1)!.durationSec : 1;

  // The clock reads these so it does not have to re-arm every time the deck
  // or its length changes. Written in an effect rather than during render:
  // touching a ref while rendering is exactly the tearing React warns about.
  const beatsRef = useRef(beats);
  const totalRef = useRef(total);
  useEffect(() => {
    beatsRef.current = beats;
    totalRef.current = total;
  }, [beats, total]);

  // The AUDIO is the clock. Driving the deck from its own timer and hoping it
  // stays with the track is what puts a reveal next to the downbeat instead of
  // on it; reading currentTime cannot drift by construction.
  //
  // The gate and the end of the deck are decided HERE rather than in effects
  // that watch `now`, because both are consequences of the clock advancing.
  // An effect that watches state and then sets state is a cascading render
  // waiting to happen, and React lints it for good reason.
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
        if (beat?.interactive && !gatedRef.current.has(beat.id)) {
          // An interactive beat genuinely waits, so the audio waits with it.
          // Pausing is safe HERE specifically because resuming happens inside
          // a tap handler, the one moment a mobile browser always honours.
          //
          // The latch matters: resuming leaves the playhead past the gate, so
          // without a record of which beats have asked, this re-fires on the
          // next frame and the tap does nothing but re-pause.
          if (t >= beat.atSec + beat.durationSec * 0.45) {
            gatedRef.current.add(beat.id);
            el.pause();
            setPhase("gated");
            return;
          }
        }

        if (t >= totalRef.current - 0.05) {
          // A shortened deck ends before the stitched file does, so the audio
          // has to be told. Without this the track plays under the end card.
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

  // Duck for personal beats, ramped rather than stepped so the change reads as
  // a mix move and not a glitch.
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

  const start = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = FULL_GAIN;
    el.play().then(() => setPhase("running")).catch(() => setPhase("running"));
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setPhase("running");
  }, []);

  const movement = active ? MOVEMENTS[active.movement] : null;

  return (
    <main className="fixed inset-0 bg-ink text-cream overflow-hidden select-none">
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" playsInline />

      {phase === "idle" && (
        <button
          onClick={start}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5"
        >
          <span className="t-label text-cream/50">GDG ON CAMPUS BABCOCK</span>
          <span className="text-outline-base text-outline-cream leading-none"
                style={{ fontSize: "clamp(3rem, 15vw, 7rem)" }}>WRAPPED</span>
          <span className="t-display text-gdg-blue" style={{ fontSize: "clamp(1.4rem, 8vw, 3rem)" }}>
            2025&ndash;26
          </span>
          <span className="mt-6 rounded-full bg-cream text-ink px-8 py-4 t-label">Play</span>
        </button>
      )}

      {/* Progress: one segment per beat, so where you are in the deck is
          legible without a scrubber. */}
      {phase !== "idle" && (
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1 p-2">
          {beats.map((b) => {
            const done = now >= b.atSec + b.durationSec;
            const within = now >= b.atSec && !done;
            const pct = within ? ((now - b.atSec) / b.durationSec) * 100 : done ? 100 : 0;
            return (
              <div key={b.id} className="h-[3px] flex-1 rounded-full bg-cream/20 overflow-hidden">
                <div className="h-full bg-cream" style={{ width: `${pct}%` }} />
              </div>
            );
          })}
        </div>
      )}

      {phase !== "idle" && movement && active && (
        <div className="absolute top-5 left-3 z-30 t-label text-cream/35" style={{ fontSize: "0.55rem" }}>
          {movement.numeral} · {active.movement.toUpperCase()} · {active.shape}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase !== "idle" && active && content && (
          <motion.div
            key={active.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center px-8"
          >
            {content.credits ? (
              <Credits durationSec={active.durationSec} reduceMotion={!!reduceMotion} />
            ) : content.club ? (
              <ClubBeat club={content.club} gated={phase === "gated"} onPick={resume} />
            ) : (
              <Lines
                lines={content.lines}
                atSec={now - active.atSec}
                durationSec={active.durationSec}
                shape={active.shape}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "gated" && active?.shape === "GATE" && (
        <button
          onClick={resume}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 rounded-full bg-cream text-ink px-8 py-4 t-label"
        >
          Show me
        </button>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-ink/90">
          <p className="t-label text-cream/50">GDG&middot;BABCOCK&middot;2025&ndash;26</p>
          <p className="t-display text-cream" style={{ fontSize: "clamp(1.6rem,7vw,3rem)" }}>
            That was the point.
          </p>
          <button
            onClick={() => {
              gatedRef.current.clear();
              setNow(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
              start();
            }}
            className="mt-4 rounded-full border border-cream/40 text-cream px-6 py-3 t-label"
          >
            Watch again
          </button>
        </div>
      )}
    </main>
  );
}

/** A beat's lines, revealed in sequence across the beat's own duration. */
function Lines({
  lines, atSec, durationSec, shape,
}: { lines: C.Line[]; atSec: number; durationSec: number; shape: string }) {
  // MONTAGE accelerates; everything else divides its time evenly.
  const weights = shape === "MONTAGE"
    ? lines.map((_, i) => Math.max(0.5, 2 - i * 0.3))
    : lines.map(() => 1);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const startAt = weights.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1]! + (weights[i - 1]! / totalW) * durationSec);
    return acc;
  }, []);
  let index = 0;
  for (let i = 0; i < startAt.length; i++) if (atSec >= startAt[i]!) index = i;
  const line = lines[index];
  if (!line) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex flex-col items-center text-center gap-3 max-w-lg"
      >
        {line.kicker && <span className="t-label text-gdg-blue">{line.kicker}</span>}
        {line.stat && (
          <span className="t-display text-cream leading-none"
                style={{ fontSize: "clamp(3rem, 18vw, 7rem)" }}>{line.stat}</span>
        )}
        {line.text && (
          <span className={line.stat ? "t-label text-cream/70" : "t-display text-cream"}
                style={line.stat ? undefined : { fontSize: "clamp(1.5rem, 7vw, 2.75rem)" }}>
            {line.text}
          </span>
        )}
        {line.sub && <span className="t-body text-cream/60 text-sm max-w-sm">{line.sub}</span>}
      </motion.div>
    </AnimatePresence>
  );
}

function ClubBeat({
  club, gated, onPick,
}: { club: NonNullable<ReturnType<typeof C.club>>; gated: boolean; onPick: () => void }) {
  const [guess, setGuess] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center text-center gap-5 max-w-md">
      {!guess ? (
        <>
          <p className="t-display text-cream" style={{ fontSize: "clamp(1.3rem,6vw,2rem)" }}>
            {club.setup}
          </p>
          <p className="t-body text-cream/60 text-sm">{club.setupSub}</p>
          <p className="t-label text-gdg-blue mt-2">GUESS YOURS</p>
          <div className="flex flex-wrap justify-center gap-2">
            {club.options.map((o) => (
              <button
                key={o}
                onClick={() => { setGuess(o); if (gated) onPick(); }}
                className="rounded-full border border-cream/40 px-5 py-3 t-label text-cream"
              >
                {o}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="t-label text-gdg-blue">
            {guess === club.answer ? "Correct. You know yourself." : "Not quite."}
          </p>
          <p className="t-display text-cream leading-none" style={{ fontSize: "clamp(2rem,11vw,4rem)" }}>
            {club.answer}
          </p>
          <p className="t-body text-cream/75 text-sm">{club.definition}</p>
          <p className="t-label text-cream/45">{club.rarity}</p>
        </>
      )}
    </div>
  );
}

/** Sixteen bars of continuous scroll. Its own physics, per §3. */
function Credits({ durationSec, reduceMotion }: { durationSec: number; reduceMotion: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ y: "60%" }}
        animate={{ y: "-115%" }}
        transition={{ duration: durationSec, ease: "linear" }}
        className="flex flex-col items-center gap-7 px-8 text-center"
      >
        <p className="t-label text-gdg-blue">NONE OF THIS HAPPENED BY ITSELF</p>
        {C.CREDITS.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {c.section && <span className="t-label text-cream/40" style={{ fontSize: "0.6rem" }}>{c.section}</span>}
            <span className="t-body text-cream/90">{c.line}</span>
          </div>
        ))}
      </motion.div>
      {reduceMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="t-body text-cream/70">Roll credits.</span>
        </div>
      )}
    </div>
  );
}
