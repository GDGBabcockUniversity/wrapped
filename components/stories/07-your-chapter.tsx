"use client";

import { motion, useReducedMotion } from "motion/react";
import { copy, fmt } from "@/lib/copy";
import type { StoryProps } from "./types";

const YEAR_START = new Date("2025-09-01T00:00:00Z").getTime();
const YEAR_END = new Date("2026-08-01T00:00:00Z").getTime();

interface Milestone {
  label: string;
  date: number;
  name: string;
}

const MILESTONES: Milestone[] = [
  { label: "SEP '25", name: "ORBIT", date: new Date("2025-09-01T00:00:00Z").getTime() },
  { label: "NOV '25", name: "DEVFEST", date: new Date("2025-11-01T00:00:00Z").getTime() },
  { label: "MAY '26", name: "THE 100", date: new Date("2026-05-01T00:00:00Z").getTime() },
  { label: "JUL '26", name: "WRAPPED", date: new Date("2026-07-01T00:00:00Z").getTime() },
];

function fractionAlong(date: number): number {
  const now = Math.min(Date.now(), YEAR_END);
  const span = Math.max(now - YEAR_START, 1);
  return Math.max(0, Math.min(1, (date - YEAR_START) / span));
}

function resolveMilestone(joinDate: string): string {
  const t = new Date(joinDate).getTime();
  if (t < new Date("2025-09-01").getTime()) return "ORBIT";
  if (t < new Date("2026-01-01").getTime()) return "DevFest";
  return "The 100";
}

export function YourChapterStory({ phase, snapshot, guest }: StoryProps) {
  const reduceMotion = useReducedMotion();
  if (guest) return null; // guests never see this story — engine skips it entirely
  if (!snapshot) return null;

  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink text-cream px-6 pt-20 pb-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="t-display text-center"
        >
          {snapshot.isNewMember ? copy.yourChapter.setupNew : copy.yourChapter.setup}
        </motion.p>
      </div>
    );
  }

  const joinFraction = fractionAlong(new Date(snapshot.joinDate).getTime());
  const milestone = resolveMilestone(snapshot.joinDate);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink text-cream px-6 pt-20 pb-16 gap-8">
      <p className="t-editorial text-center">
        {fmt(
          snapshot.isNewMember ? copy.yourChapter.revealNew : copy.yourChapter.reveal,
          { joinMonthLabel: snapshot.joinMonthLabel }
        )}
      </p>

      <div className="relative w-full max-w-sm h-32">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-cream/10" />
        <motion.div
          className="absolute top-1/2 left-0 h-[2px] bg-cream/25 origin-left"
          style={{ width: "100%" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
        />
        {MILESTONES.map((m, i) => {
          const leftPct = fractionAlong(m.date) * 100;
          const edgeAlign =
            leftPct < 8 ? "left" : leftPct > 92 ? "right" : "center";
          return (
            <motion.div
              key={m.name}
              className="absolute top-1/2 flex flex-col items-center gap-1"
              style={{ left: `${leftPct}%`, transform: "translate(-50%, -50%)" }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + leftPct / 100 * 0.5 }}
            >
              <span className="w-2 h-2 rounded-full bg-gdg-green" aria-hidden />
              <span
                className="t-label text-cream/45 text-[0.5rem] whitespace-nowrap absolute"
                style={{
                  top: i % 2 === 0 ? "1.1rem" : "2.1rem",
                  left: edgeAlign === "left" ? 0 : edgeAlign === "right" ? "auto" : "50%",
                  right: edgeAlign === "right" ? 0 : "auto",
                  transform: edgeAlign === "center" ? "translateX(-50%)" : "none",
                }}
              >
                {m.label} {m.name}
              </span>
            </motion.div>
          );
        })}
        <motion.div
          className="absolute top-1/2 flex flex-col items-center"
          style={{
            left: `${Math.max(2, Math.min(98, joinFraction * 100))}%`,
            transform: "translate(-50%, -100%)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: -8 }}
          transition={{ duration: 0.4, delay: 1 }}
        >
          <span className="t-label text-cream text-[0.55rem] mb-1">YOU</span>
          <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden>
            <path d="M1 0 L11 4 L1 8 Z" fill="#fff6e0" />
            <line x1="1" y1="0" x2="1" y2="16" stroke="#fff6e0" strokeWidth="1" />
          </svg>
        </motion.div>
      </div>

      <div className="text-center">
        <p className="t-body">
          {snapshot.tenureMonths < 12
            ? copy.yourChapter.tenureUnderOne
            : fmt(copy.yourChapter.tenure, { tenureMonths: snapshot.tenureMonths })}
        </p>
        <p className="t-body text-cream/55 mt-1">
          {snapshot.isNewMember
            ? copy.yourChapter.loreNew
            : fmt(copy.yourChapter.loreBefore, { milestone })}
        </p>
      </div>
    </div>
  );
}
