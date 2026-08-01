"use client";

import { motion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { StickerChip } from "@/components/sticker-chip";
import { Counter } from "@/components/counter";
import { SPRING, TIMING } from "@/lib/stories";
import { assignTitle } from "@/lib/titles";
import * as C from "@/lib/deck-copy";
import type { Snapshot } from "@/lib/snapshot";

/**
 * The beats the spec adds, built rather than borrowed.
 *
 * Every one of these previously rendered an older story that happened to sit
 * nearby — the era beat showed tenure, the title beat showed a percentile, the
 * handoffs did not render at all. The new writing and the titles engine were
 * both in the repo and neither was on screen, which is the difference between
 * a re-cut deck and the old deck with new music over it.
 *
 * They share the deck's own primitives, so they carry its texture: letters
 * pop, numerals slam-assemble, cards idle-float, scribbles sit underneath.
 */

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] as const },
});

/**
 * The braid, made visible (§1). An org montage never ends on an org number —
 * it hands off to one of the member's. This is the frame that does it, and
 * without it the principle the whole spec is built on is just a comment.
 */
export function HandoffFrame({ line, field }: { line: C.Line; field: "ink" | "cream" }) {
  const ink = field === "ink";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <AmbientScribbles field={field} />
      <motion.div {...rise(0)}>
        <StickerChip>AND YOU</StickerChip>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING.default, delay: 0.12 }}
        className="max-w-sm"
      >
        <span
          className={`t-display ${ink ? "text-cream" : "text-ink"}`}
          style={{ fontSize: "clamp(1.5rem, 7vw, 2.6rem)" }}
        >
          <PopLetters text={line.text} profile="fast" />
        </span>
      </motion.div>
      {line.sub && (
        <motion.p {...rise(0.5)} className={`t-body text-sm ${ink ? "text-cream/65" : "text-ink/65"}`}>
          {line.sub}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Your arrival (§01). One join date becomes a place in the story: when you
 * turned up, what did not exist yet, and which intake you belong to.
 */
export function EraBeat({ snapshot }: { snapshot: Snapshot | null }) {
  const lines = C.arrival(snapshot);
  const era = lines.find((l) => l.kicker === "YOU ARE");
  const body = lines.filter((l) => l.kicker !== "YOU ARE");

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
      <AmbientScribbles field="ink" />
      {body.map((l, i) => (
        <motion.p
          key={l.text}
          {...rise(i * 0.5)}
          className={i === 0 ? "t-body text-cream/60" : "t-display text-cream"}
          style={i === 0 ? undefined : { fontSize: "clamp(1.4rem, 6.5vw, 2.3rem)" }}
        >
          {l.text}
        </motion.p>
      ))}

      {era && (
        <IdleFloat y={-4} duration={6} delay={1.6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
            transition={{ ...SPRING.stamp, delay: 1.5 }}
            className="mt-3 flex flex-col items-center gap-2 border-2 border-gdg-blue/70 px-6 py-4"
          >
            <span className="t-label text-gdg-blue" style={{ fontSize: "0.55rem" }}>
              {era.kicker}
            </span>
            <SlamStat
              value={era.text}
              className="t-display text-cream leading-none"
              style={{ fontSize: "clamp(1.15rem, 6vw, 2rem)" }}
            />
          </motion.div>
        </IdleFloat>
      )}
    </div>
  );
}

/**
 * Your title (§08). The peak of the identity movement, and until now it
 * rendered somebody else's percentile.
 *
 * Every member gets one, and the because-line states the metric that produced
 * it — a title whose evidence does not earn the claim is the only real
 * failure mode this beat has.
 */
export function TitleBeat({ snapshot, revealed }: { snapshot: Snapshot | null; revealed: boolean }) {
  if (!snapshot) return null;

  // TODO(pipeline): real per-tier z-scores. The engine is exercised here; the
  // inputs are stand-ins derived from the snapshot's own totals.
  const z: Record<string, number> = {
    messages: snapshot.messages.matched ? Math.min(3, snapshot.messages.count / 400) : 0,
    checkins: Math.min(3, snapshot.events.checkins / 8),
    reads: snapshot.radar ? Math.min(3, snapshot.radar.reads / 12) : 0,
    plays: snapshot.radar ? Math.min(3, snapshot.radar.plays / 20) : 0,
    attendanceRate:
      snapshot.events.registrations > 0
        ? Math.min(3, (snapshot.events.checkins / snapshot.events.registrations) * 2.4)
        : 0,
  };
  const tier = snapshot.standing.percentile <= 15 ? "A" : snapshot.standing.percentile <= 50 ? "B" : "C";
  const t = assignTitle({ z, tier });

  if (!revealed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
        <AmbientScribbles field="cream" />
        <motion.p {...rise(0)} className="t-display text-ink" style={{ fontSize: "clamp(1.4rem, 6.5vw, 2.3rem)" }}>
          Everyone in this chat has a reputation.
        </motion.p>
        <motion.p {...rise(0.5)} className="t-body text-ink/60">
          Yours is ready.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <AmbientScribbles field="cream" />
      <motion.span {...rise(0)} className="t-label text-gdg-red">
        YOU ARE
      </motion.span>
      <IdleFloat y={-3} duration={6.5} delay={1}>
        <SlamStat
          value={t.title}
          className="t-display text-ink leading-none"
          style={{ fontSize: "clamp(1.9rem, 10vw, 3.6rem)" }}
        />
      </IdleFloat>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="t-body text-ink/70 text-sm max-w-xs"
      >
        {t.because}
      </motion.p>
      <motion.p {...rise(1.25)} className="t-label text-ink/40" style={{ fontSize: "0.55rem" }}>
        {t.kind === "compound" ? "A RARE ONE" : t.kind === "floor" ? "SOMEONE HOLDS THE MIDDLE" : ""}
      </motion.p>
    </div>
  );
}

/**
 * Your rooms (§07). The social graph — the chapter no consumer music product
 * can copy, because none of them know who else was in the room.
 */
export function RoomsBeat({ snapshot }: { snapshot: Snapshot | null }) {
  const r = snapshot?.rooms;
  if (!snapshot || !r || snapshot.events.checkins === 0) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <AmbientScribbles field="ink" />
      <motion.p {...rise(0)} className="t-display text-cream" style={{ fontSize: "clamp(1.3rem, 6vw, 2.1rem)" }}>
        You didn&apos;t do this alone.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING.default, delay: 0.5 }}
        className="flex flex-col items-center gap-1"
      >
        <Counter
          value={r.count}
          durationMs={TIMING.countUpMs}
          active
          className="t-display text-gdg-blue leading-none"
        />
        <span className="t-label text-cream/60">MEMBERS IN A ROOM WITH YOU</span>
      </motion.div>

      {/* Co-attendance is DIRECTIONAL: this member's card says Victor, and
          Victor's may say someone else. "Most often with" is true either way.
          "You two were inseparable" claims something the data cannot know —
          name freely, never infer feeling from proximity. */}
      {r.top && (
        <motion.p {...rise(1.1)} className="t-body text-cream/85 text-sm">
          Most often with <span className="text-cream">{r.top.name}</span>. {r.top.events} events.
        </motion.p>
      )}

      {r.group && (
        <motion.p {...rise(1.5)} className="t-body text-cream/70 text-sm max-w-xs">
          You and {r.group.others} others made all {r.group.days} days of {r.group.seriesName}.
        </motion.p>
      )}

      {r.origin && (
        <motion.div {...rise(1.9)} className="mt-2 flex flex-col items-center gap-1">
          <span className="t-label text-cream/40" style={{ fontSize: "0.5rem" }}>
            FIRST PERSON YOU EVER CHECKED IN BESIDE
          </span>
          <span className="t-display text-cream" style={{ fontSize: "clamp(1.05rem, 5vw, 1.5rem)" }}>
            {r.origin.name}
          </span>
          <span className="t-body text-cream/50 text-xs">
            {r.origin.dateLabel} &middot; {r.origin.eventName}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/** The handover (§11) — the beat that turns a recap into a story. */
export function HandoverBeat({ snapshot }: { snapshot: Snapshot | null }) {
  const lines = C.handover(snapshot);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
      <AmbientScribbles field="cream" />
      {lines.map((l, i) => (
        <motion.div key={l.text} {...rise(i * 1.1)} className="max-w-sm">
          <span
            className={i === lines.length - 1 ? "t-display text-gdg-green" : "t-display text-ink"}
            style={{ fontSize: i === lines.length - 1 ? "clamp(1.5rem, 7vw, 2.6rem)" : "clamp(1.2rem, 5.5vw, 1.9rem)" }}
          >
            {l.text}
          </span>
          {l.sub && <p className="t-body text-ink/60 text-sm mt-1">{l.sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}
