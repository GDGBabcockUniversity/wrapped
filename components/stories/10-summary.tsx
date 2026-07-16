"use client";

import { motion } from "motion/react";
import { CLUBS } from "@/lib/clubs";
import { CHAPTER } from "@/lib/content/chapter";
import { copy, fmt } from "@/lib/copy";
import { SPRING } from "@/lib/stories";
import type { StoryProps } from "./types";

function nameFontSize(name: string): string {
  if (name.length > 24) return "clamp(1.4rem, 8cqw, 2.4rem)";
  if (name.length > 16) return "clamp(1.7rem, 10cqw, 3rem)";
  return "clamp(2.2rem, 13cqw, 4rem)";
}

function Barcode({ seed }: { seed: string }) {
  const bars = Array.from({ length: 18 }, (_, i) => {
    const code = seed.charCodeAt(i % seed.length) || 65;
    return 1 + (code % 4);
  });
  return (
    <div className="flex items-end gap-[3px] justify-center h-8" aria-hidden>
      {bars.map((w, i) => (
        <span
          key={i}
          className="bg-ink"
          style={{ width: `${w}px`, height: `${8 + w * 4}px` }}
        />
      ))}
    </div>
  );
}

async function shareSummary() {
  const shareData = {
    title: "GDG Wrapped 25/26",
    text: "My GDG Babcock year, wrapped.",
    url: typeof window !== "undefined" ? window.location.origin : undefined,
  };
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(shareData);
    }
  } catch {
    // user canceled the share sheet — not an error
  }
}

export function SummaryStory({ snapshot, guest, onReplay }: StoryProps) {
  const club = snapshot ? CLUBS[snapshot.club.id] : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink px-6 pt-20 pb-16 gap-5">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={SPRING.default}
        className="bg-cream text-ink rounded-2xl p-5 w-[82cqw] max-w-[360px] flex flex-col"
        style={{ aspectRatio: "9 / 14" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            <span className="w-2 h-2 rounded-full bg-gdg-blue" />
            <span className="w-2 h-2 rounded-full bg-gdg-red" />
            <span className="w-2 h-2 rounded-full bg-gdg-yellow" />
            <span className="w-2 h-2 rounded-full bg-gdg-green" />
          </div>
          <span className="t-label text-ink/60">{copy.summary.title}</span>
        </div>

        {guest || !snapshot ? (
          <>
            <p className="t-display mt-4" style={{ fontSize: "clamp(1.6rem, 9cqw, 2.8rem)" }}>
              {copy.summary.guestTitle}
            </p>
            <div className="border-t border-ink/15 my-4" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                  {CHAPTER.eventsRun}
                </p>
                <p className="t-label text-ink/45 mt-1 text-[0.55rem]">EVENTS</p>
              </div>
              <div>
                <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                  {CHAPTER.members}+
                </p>
                <p className="t-label text-ink/45 mt-1 text-[0.55rem]">MEMBERS</p>
              </div>
              <div>
                <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                  {CHAPTER.productsShipped}
                </p>
                <p className="t-label text-ink/45 mt-1 text-[0.55rem]">PRODUCTS</p>
              </div>
            </div>
            <p className="t-body text-ink/65 mt-6 text-center">{copy.summary.guestSub}</p>
            <div className="flex justify-center mt-4">
              <a
                href="https://gdgbabcock.com"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-ink text-cream px-5 py-2.5 t-label"
              >
                {copy.summary.guestCta}
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="t-display mt-4" style={{ fontSize: nameFontSize(snapshot.name) }}>
              {snapshot.name}
            </p>
            <div className="border-t border-ink/15 my-4" />
            <div className="flex flex-col gap-3">
              <div>
                <p className="t-label text-ink/45 text-[0.55rem]">{copy.summary.memberSince}</p>
                <p className="t-stat" style={{ fontSize: "clamp(1rem, 6cqw, 1.6rem)" }}>
                  {snapshot.joinMonthLabel}
                </p>
              </div>
              <div>
                <p className="t-label text-ink/45 text-[0.55rem]">{copy.summary.club}</p>
                <p
                  className="t-stat"
                  style={{ fontSize: "clamp(1rem, 6cqw, 1.6rem)", color: club!.hex }}
                >
                  {club!.name}
                </p>
              </div>
              <div>
                <p className="t-label text-ink/45 text-[0.55rem]">{copy.summary.standing}</p>
                <p className="t-stat" style={{ fontSize: "clamp(1rem, 6cqw, 1.6rem)" }}>
                  {snapshot.standing.tier === "member"
                    ? copy.summary.standingValueMember
                    : fmt(copy.summary.standingValue, {
                        percentile: snapshot.standing.percentile,
                      })}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-center mt-5">
              {!snapshot.flags.zeroCheckins && (
                <div>
                  <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                    {snapshot.events.checkins}
                  </p>
                  <p className="t-label text-ink/45 mt-1 text-[0.55rem]">
                    {copy.summary.statEvents}
                  </p>
                </div>
              )}
              {snapshot.messages.matched && (
                <div>
                  <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                    {snapshot.messages.count}
                  </p>
                  <p className="t-label text-ink/45 mt-1 text-[0.55rem]">
                    {copy.summary.statMessages}
                  </p>
                </div>
              )}
              <div>
                <p className="t-stat" style={{ fontSize: "clamp(1.2rem, 7cqw, 2rem)" }}>
                  {snapshot.tenureMonths}
                </p>
                <p className="t-label text-ink/45 mt-1 text-[0.55rem]">{copy.summary.statMonths}</p>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <Barcode seed={snapshot.name} />
              <p className="t-label text-ink/40 text-center mt-1 text-[0.5rem]">
                GDG&middot;BABCOCK&middot;2025&ndash;26
              </p>
            </div>
          </>
        )}
      </motion.div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={shareSummary}
          className="rounded-full bg-cream text-ink px-6 py-3 t-label"
        >
          {copy.summary.share}
        </button>
        <button
          onClick={onReplay}
          className="rounded-full border border-cream/40 text-cream px-6 py-3 t-label"
        >
          {copy.summary.replay}
        </button>
      </div>
    </div>
  );
}
