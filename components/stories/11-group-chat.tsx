"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { SlamStat } from "@/components/slam-stat";
import { StickerChip } from "@/components/sticker-chip";
import { GROUP_CHAT } from "@/lib/content/chapter";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import { useGlQualityContext } from "@/components/gl/quality-context";
import { StripeBandFigure } from "@/components/gl/static-figure";
import { ACCENT_HEX } from "@/components/gl/shaders";
import { playSfx } from "@/lib/sfx";
import type { StoryProps } from "./types";

/**
 * The Group Chat — a new public story (build5 §4) auditing the main
 * community chat: fun summaries, the loudest members, word stats. Rides
 * the-year's diagonal stripe band as its one ambient system (law 1) — no
 * new shader branch needed. Every beat is a number-then-consequence
 * moment (law 9); the `topSubgroup` beat is null-skipped until the owner
 * uploads subgroup exports (build5 §5.2).
 */

/** The generic slam + label + optional detail beat most of this story's
    moments share (same three-beat layering as build5 §3.2's StatBeat). */
function Stat({ value, label, detail }: { value: number | string; label: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6">
      <SlamStat
        value={value}
        className="t-display text-center text-gdg-green"
        style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)", fontVariantNumeric: "tabular-nums" }}
      />
      <motion.p
        className="t-label text-cream/60 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {label}
      </motion.p>
      {detail && (
        <motion.p
          className="t-body text-cream/50 text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          {detail}
        </motion.p>
      )}
    </div>
  );
}

/** A redacted-bar list row (build4 §7.1 style), width proportional to
    count, popping in one-by-one — the top-yappers and dialect lists. */
function BarRow({ label, count, maxCount, index }: { label: string; count: number; maxCount: number; index: number }) {
  const widthPct = 40 + (maxCount > 0 ? (count / maxCount) * 60 : 0);
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, scaleX: 0.9, y: 10 }}
      animate={{ opacity: 1, scaleX: 1, y: 0 }}
      transition={{ ...SPRING.default, delay: index * 0.09 }}
      style={{ transformOrigin: "left" }}
    >
      <span
        className="inline-block rounded-[3px] px-[0.5em] py-[0.15em] t-stat bg-cream text-ink truncate"
        style={{ width: `${widthPct}%`, fontSize: "clamp(0.8rem, 3.8cqw, 1.05rem)" }}
      >
        {label}
      </span>
      <span
        className="t-label text-cream/40 flex-shrink-0"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </span>
    </motion.div>
  );
}

function BarList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const maxCount = rows[0]?.count ?? 0;
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <p className="t-editorial text-center">
        <PopLetters text={title} />
      </p>
      <div className="flex flex-col gap-2 w-full">
        {rows.map((r, i) => (
          <BarRow key={r.label} label={r.label} count={r.count} maxCount={maxCount} index={i} />
        ))}
      </div>
    </div>
  );
}

function buildBeats(): ReactNode[] {
  const beats: ReactNode[] = [];

  // 1. messages
  beats.push(
    <Stat
      key="messages"
      value={GROUP_CHAT.messages}
      label={copy.groupChat.messagesLabel}
      detail={
        // Null-skip (§15): with full-year coverage there's nothing to
        // disclaim — "0 months missing" must never render.
        GROUP_CHAT.monthsMissing > 0
          ? fmt(copy.groupChat.messagesDetail, { monthsMissing: GROUP_CHAT.monthsMissing })
          : undefined
      }
    />
  );

  // 2. top yappers
  beats.push(
    <BarList
      key="yappers"
      title={copy.groupChat.yappersTitle}
      rows={GROUP_CHAT.topYappers.map((y) => ({ label: y.name, count: y.count }))}
    />
  );

  // 3. busiest day
  beats.push(
    <div key="busiest" className="flex flex-col items-center gap-2 px-6">
      <SlamStat
        value={GROUP_CHAT.busiestDay.count}
        className="t-display text-center text-gdg-green"
        style={{ fontSize: "clamp(2rem, 11cqw, 3.5rem)", fontVariantNumeric: "tabular-nums" }}
      />
      <motion.p
        className="t-label text-cream/60 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {copy.groupChat.busiestLabel}
      </motion.p>
      <motion.div
        initial={{ scale: 1.25, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
        transition={{ ...SPRING.stamp, delay: 0.45 }}
      >
        <StickerChip className="t-label">{GROUP_CHAT.busiestDay.label}</StickerChip>
      </motion.div>
      <motion.p
        className="t-body text-cream/50 text-sm text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.75 }}
      >
        {GROUP_CHAT.busiestDay.line}
      </motion.p>
    </div>
  );

  // 4. peak hour / after-midnight
  beats.push(
    <div key="night" className="flex flex-col items-center gap-3 px-6">
      <p className="t-editorial text-center">
        <PopLetters text={fmt(copy.groupChat.nightTitle, { peakHourLabel: GROUP_CHAT.peakHourLabel })} />
      </p>
      <motion.p
        className="t-body text-cream/55 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        {fmt(copy.groupChat.nightSub, { afterMidnight: GROUP_CHAT.afterMidnight })}
      </motion.p>
    </div>
  );

  // 5. stickers / deleted
  beats.push(
    <Stat
      key="stickers"
      value={GROUP_CHAT.stickers}
      label={copy.groupChat.stickersLabel}
      detail={fmt(copy.groupChat.deletedSub, { deleted: GROUP_CHAT.deleted })}
    />
  );

  // 6. dialect
  beats.push(
    <BarList
      key="dialect"
      title={copy.groupChat.dialectTitle}
      rows={GROUP_CHAT.dialect.map((d) => ({ label: d.word.toUpperCase(), count: d.count }))}
    />
  );

  // 7. laughs
  beats.push(
    <Stat key="laughs" value={GROUP_CHAT.laughs} label={copy.groupChat.laughsLabel} detail={copy.groupChat.laughsSub} />
  );

  // 8. streak
  beats.push(
    <Stat key="streak" value={GROUP_CHAT.streakDays} label={copy.groupChat.streakLabel} detail={copy.groupChat.streakSub} />
  );

  // 9. most active subgroup — null-skipped until subgroup exports land.
  if (GROUP_CHAT.topSubgroup) {
    const subgroup = GROUP_CHAT.topSubgroup;
    beats.push(
      <div key="subgroup" className="flex flex-col items-center gap-2 px-6">
        <p className="t-editorial text-center">
          <PopLetters text={copy.groupChat.subgroupTitle} />
        </p>
        <SlamStat
          value={subgroup.name}
          className="t-display text-center text-gdg-green"
          style={{ fontSize: "clamp(1.6rem, 10cqw, 3rem)" }}
        />
        <motion.p
          className="t-body text-cream/55 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {fmt(copy.groupChat.subgroupSub, { messages: subgroup.messages })}
        </motion.p>
      </div>
    );
  }

  return beats;
}

const BEAT_MS = [2200, 3600, 2600, 2400, 2600, 2800, 2000, 2200, 2400];
const BEATS = buildBeats();

export function GroupChatStory({ phase, active, paused }: StoryProps) {
  const glQuality = useGlQualityContext();
  const [beatIdx, setBeatIdx] = useState(0);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    const ms = BEAT_MS[beatIdx] ?? 2200;
    if (beatIdx >= BEATS.length - 1) return; // hold on the final beat
    const id = setTimeout(() => {
      setBeatIdx((i) => i + 1);
      playSfx("tick");
    }, ms);
    return () => clearTimeout(id);
  }, [phase, active, paused, beatIdx]);

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-cream px-6 pt-20 pb-16">
        <p className="t-display text-center">
          <PopLetters text={copy.groupChat.setup} />
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col text-cream px-6 pt-20 pb-16">
      {/* Static stand-in for the shader's stripe-band figure (build4 §2.3) —
          the story's one ambient system throughout (law 1). */}
      {glQuality === "off" && <StripeBandFigure accentHex={ACCENT_HEX.green} />}
      <div className="flex justify-center mb-6 min-h-[2.5rem] items-center px-4">
        <StickerChip className="t-label">{copy.groupChat.revealLabel}</StickerChip>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={beatIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {BEATS[beatIdx]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
