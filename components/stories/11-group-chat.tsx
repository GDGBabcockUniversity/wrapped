"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PopLetters } from "@/components/pop-letters";
import { SlamStat } from "@/components/slam-stat";
import { StickerChip } from "@/components/sticker-chip";
import { GROUP_CHAT, GROUP_TOPICS } from "@/lib/content/chapter";
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
        transition={{ duration: 0.35, delay: 0.55 }}
      >
        {label}
      </motion.p>
      {detail && (
        <motion.p
          className="t-body text-cream/50 text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 1.0 }}
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
      transition={{ ...SPRING.default, delay: index * 0.15 }}
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

function BarList({
  title,
  rows,
  sub,
}: {
  title: string;
  rows: { label: string; count: number }[];
  /** An optional line beneath the list — the starters beat's "Silence
      never stood a chance." (build6 §6.3). */
  sub?: string;
}) {
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
      {sub && (
        <motion.p
          className="t-body text-cream/50 text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 + rows.length * 0.15 }}
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

// build6 §6.3: the vocabulary beat — top words as scattered sticker chips,
// each with its count beneath, stamping in one by one.
const VOCAB_ROTATIONS = [-6, 4, -3, 6, -5, 2];
const VOCAB_STAMP_MS = 170;

function VocabChip({ word, count, index }: { word: string; count: number; index: number }) {
  const reduceMotion = useReducedMotion();
  const rot = VOCAB_ROTATIONS[index % VOCAB_ROTATIONS.length]!;
  return (
    <motion.div
      className="flex flex-col items-center gap-0.5"
      style={{ rotate: 0 }}
      initial={reduceMotion ? { rotate: rot } : { scale: 1.3, rotate: rot * 2, opacity: 0 }}
      animate={{ scale: 1, rotate: rot, opacity: 1 }}
      transition={
        reduceMotion ? { duration: 0.01 } : { ...SPRING.stamp, delay: (index * VOCAB_STAMP_MS) / 1000 }
      }
    >
      <StickerChip className="t-editorial">{word.toUpperCase()}</StickerChip>
      <span className="t-label text-cream/50" style={{ fontSize: "0.55rem" }}>
        {count}
      </span>
    </motion.div>
  );
}

// build6 §6.3: the emoji podium — top 3 on stepped platforms, landing in
// ascending order (3rd, then 2nd, then 1st — the winner lands last),
// displayed left-to-right as 2nd/1st/3rd like a real podium.
const PODIUM_DISPLAY_ORDER = [1, 0, 2];
const PODIUM_PLATFORM_H: Record<number, number> = { 0: 72, 1: 52, 2: 36 };
const PODIUM_LAND_DELAY_S: Record<number, number> = { 0: 0.3, 1: 0.15, 2: 0 };

function EmojiPodium() {
  const top3 = GROUP_TOPICS.emojiLeaderboard?.slice(0, 3) ?? [];
  const rest = GROUP_TOPICS.emojiLeaderboard?.slice(3, 8) ?? [];
  return (
    <div className="flex flex-col items-center gap-4 px-6 w-full">
      <p className="t-editorial text-center">
        <PopLetters text={copy.groupChat.emojiTitle} />
      </p>
      <div className="flex items-end justify-center gap-3">
        {PODIUM_DISPLAY_ORDER.map((rank) => {
          const item = top3[rank];
          if (!item) return null;
          return (
            <motion.div
              key={item.emoji}
              className="flex flex-col items-center gap-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...SPRING.stamp, delay: PODIUM_LAND_DELAY_S[rank] }}
            >
              <span style={{ fontSize: rank === 0 ? "2.75rem" : "2rem" }}>{item.emoji}</span>
              <span className="t-label text-cream/60">{item.count}</span>
              <div className="w-14 rounded-t-md bg-cream/15" style={{ height: PODIUM_PLATFORM_H[rank] }} />
            </motion.div>
          );
        })}
      </div>
      {rest.length > 0 && (
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          {rest.map((e) => (
            <span key={e.emoji} className="t-label flex items-center gap-1">
              <span style={{ fontSize: "1.1rem" }}>{e.emoji}</span>
              <span className="text-cream/50" style={{ fontSize: "0.6rem" }}>
                {e.count}
              </span>
            </span>
          ))}
        </motion.div>
      )}
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
        transition={{ duration: 0.35, delay: 0.55 }}
      >
        {copy.groupChat.busiestLabel}
      </motion.p>
      <motion.div
        initial={{ scale: 1.25, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
        transition={{ ...SPRING.stamp, delay: 0.75 }}
      >
        <StickerChip className="t-label">{GROUP_CHAT.busiestDay.label}</StickerChip>
      </motion.div>
      <motion.p
        className="t-body text-cream/50 text-sm text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.25 }}
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
        transition={{ duration: 0.4, delay: 0.75 }}
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

  // build6 §6.3: the topics engine's four beats — inserted after dialect,
  // before streak. Every field is null-skipped independently: a batch
  // where one analyzer came up empty still shows the rest.
  if (GROUP_TOPICS.topicBuckets) {
    beats.push(
      <BarList
        key="topics"
        title={copy.groupChat.topicsTitle}
        rows={GROUP_TOPICS.topicBuckets.slice(0, 4).map((b) => ({ label: b.name, count: b.count }))}
      />
    );
  }

  if (GROUP_TOPICS.wordsOfYear && GROUP_TOPICS.wordsOfYear.length > 0) {
    const top6 = GROUP_TOPICS.wordsOfYear.slice(0, 6);
    beats.push(
      <div key="vocab" className="flex flex-col items-center gap-4 px-6">
        <p className="t-editorial text-center">
          <PopLetters text={copy.groupChat.vocabTitle} />
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-xs">
          {top6.map((w, i) => (
            <VocabChip key={w.word} word={w.word} count={w.count} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (GROUP_TOPICS.emojiLeaderboard && GROUP_TOPICS.emojiLeaderboard.length > 0) {
    beats.push(<EmojiPodium key="emoji" />);
  }

  if (GROUP_TOPICS.starters && GROUP_TOPICS.starters.length > 0) {
    beats.push(
      <BarList
        key="starters"
        title={copy.groupChat.startersTitle}
        rows={GROUP_TOPICS.starters.slice(0, 3).map((s) => ({ label: s.name, count: s.count }))}
        sub={copy.groupChat.startersSub}
      />
    );
  }

  // 7. laughs
  beats.push(
    <Stat key="laughs" value={GROUP_CHAT.laughs} label={copy.groupChat.laughsLabel} detail={copy.groupChat.laughsSub} />
  );

  // 8. streak
  beats.push(
    <Stat key="streak" value={GROUP_CHAT.streakDays} label={copy.groupChat.streakLabel} detail={copy.groupChat.streakSub} />
  );

  // 9. most active subgroup — null-skipped until subgroup exports land.
  // build6 §6.3: now that the track exports are merged, allSubgroups fills
  // for real too — a compact 4-row bar list beneath the headline, so the
  // beat names the winner AND shows how every track stacked up.
  if (GROUP_CHAT.topSubgroup) {
    const subgroup = GROUP_CHAT.topSubgroup;
    const allTracks = GROUP_CHAT.allSubgroups;
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
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          {fmt(copy.groupChat.subgroupSub, { messages: subgroup.messages })}
        </motion.p>
        {allTracks && allTracks.length > 0 && (
          <motion.div
            className="w-full max-w-xs flex flex-col gap-2 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
          >
            <p className="t-label text-cream/50 text-center" style={{ fontSize: "0.6rem" }}>
              {copy.groupChat.subgroupAllTitle}
            </p>
            {allTracks.map((t, i) => (
              <BarRow key={t.name} label={t.name} count={t.messages} maxCount={allTracks[0]!.messages} index={i} />
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  return beats;
}

// build7 §6: "the whatsapp stats just blitz through — calm down, this is a
// journey." Every beat re-timed to breathe — stat beats ~3800ms, list/podium/
// vocab ~4200ms, the busiest-day and streak moment beats ~4000ms — paired with
// the slower within-beat reveals above (labels, details, and bar rows now land
// with real space between them). Beats are per-index so the two moment beats
// (busiest, streak) and the richer lists get their extra air.
const BEAT_MS = [
  3800, // messages (stat)
  4200, // yappers (list)
  4000, // busiest (moment — three sub-beats)
  3800, // night
  3800, // stickers (stat)
  4200, // dialect (list)
  4200, // topics (list)
  4200, // vocabulary (stamped chips)
  4200, // emoji podium
  4200, // starters (list)
  3600, // laughs (stat)
  4000, // streak (stat/moment)
  4400, // subgroup (headline + 4-row ranking)
];
const BEATS = buildBeats();

export function GroupChatStory({ phase, active, paused, onComplete }: StoryProps) {
  const glQuality = useGlQualityContext();
  const [beatIdx, setBeatIdx] = useState(0);

  useEffect(() => {
    if (phase !== "reveal" || !active || paused) return;
    const ms = BEAT_MS[beatIdx] ?? 3800;
    const isLast = beatIdx >= BEATS.length - 1;
    const id = setTimeout(() => {
      if (isLast) {
        // Hand off after the final beat's hold rather than idling — the
        // slower total now exceeds a fixed revealMs, so onComplete drives the
        // advance (same pattern as moments/people; §6 + build6 §2.6).
        onComplete?.();
        return;
      }
      setBeatIdx((i) => i + 1);
      playSfx("tick");
    }, ms);
    return () => clearTimeout(id);
  }, [phase, active, paused, beatIdx, onComplete]);

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
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {BEATS[beatIdx]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
