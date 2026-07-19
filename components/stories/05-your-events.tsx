"use client";

import { motion, useReducedMotion } from "motion/react";
import { Counter } from "@/components/counter";
import { SlamStat } from "@/components/slam-stat";
import { IdleFloat } from "@/components/idle-float";
import { KineticWords } from "@/components/kinetic-words";
import { CHAPTER } from "@/lib/content/chapter";
import { copy, fmt } from "@/lib/copy";
import { TIMING } from "@/lib/stories";
import type { StoryProps } from "./types";

function AdmitOneTicket() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.svg
      width="200"
      height="100"
      viewBox="0 0 280 140"
      className="text-outline-base text-outline-blue"
      animate={reduceMotion ? {} : { rotate: [-2, 2] }}
      transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    >
      <rect
        x="4"
        y="4"
        width="272"
        height="132"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="4" cy="70" r="10" fill="#0f0f0f" />
      <circle cx="276" cy="70" r="10" fill="#0f0f0f" />
      <rect
        x="20"
        y="20"
        width="240"
        height="100"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <text
        x="140"
        y="78"
        textAnchor="middle"
        fill="currentColor"
        fontSize="22"
        fontWeight={700}
        letterSpacing="0.15em"
      >
        ADMIT ONE
      </text>
    </motion.svg>
  );
}

export function YourEventsStory({ phase, snapshot, guest }: StoryProps) {
  if (phase === "setup") {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-cream px-6 pt-20 pb-16">
        <p className="t-display text-center">
          <KineticWords text={guest ? copy.yourEvents.guestSetup : copy.yourEvents.setup} />
        </p>
      </div>
    );
  }

  if (guest) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-4 text-center">
        <p className="t-display">{copy.yourEvents.guestReveal}</p>
        <p className="t-body text-cream/55">{copy.yourEvents.guestSub}</p>
        <a
          href="https://gdgbabcock.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-cream text-ink px-6 py-3 t-label mt-2"
        >
          Join GDG Babcock
        </a>
      </div>
    );
  }

  const events = snapshot?.events ?? { checkins: 0, registrations: 0, titles: [] };
  const isZero = snapshot?.flags.zeroCheckins ?? true;

  if (isZero) {
    const [zeroPrefix, zeroSuffix] = copy.yourEvents.zeroReveal.split("{eventsRun}");
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-6 text-center">
        <AdmitOneTicket />
        <div>
          <p className="t-display">
            {zeroPrefix}
            <Counter value={CHAPTER.eventsRun} className="inline" active />
            {zeroSuffix}
          </p>
          <p className="t-body text-cream/55 mt-2">{copy.yourEvents.zeroSub}</p>
        </div>
      </div>
    );
  }

  const isOne = events.checkins === 1;
  const isPerfect = events.checkins === events.registrations && events.checkins > 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-cream px-6 pt-20 pb-16 gap-4 text-center">
      <IdleFloat y={-2} scale={1.02} duration={3} delay={1.2}>
        {/* The monument slams (build4 §5.1) — a till prints, this is not a till. */}
        <SlamStat
          value={events.checkins}
          className="t-monument text-outline-base text-outline-blue leading-none"
          style={{ fontSize: "clamp(6rem, 45cqw, 16rem)" }}
        />
      </IdleFloat>

      {/* The three-beat payoff (build4 §5.2): stat at 0ms, caption at
          +1100ms, share affordance at +2200ms (ProgressBar's shareSlot). */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 1.1 }}
      >
        <p className="t-body">
          {isOne
            ? copy.yourEvents.revealOne
            : fmt(copy.yourEvents.reveal, { checkins: events.checkins })}
        </p>
        <p className="t-body text-cream/55 mt-1">
          {isPerfect
            ? copy.yourEvents.subPerfect
            : fmt(copy.yourEvents.sub, { registrations: events.registrations })}
        </p>
      </motion.div>

      {events.titles.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
          {events.titles.slice(0, 5).map((title, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: (i * TIMING.staggerMs) / 1000 }}
              className="flex items-center gap-2 justify-center"
            >
              <span className="w-1.5 h-1.5 bg-gdg-blue flex-shrink-0" aria-hidden />
              <span className="t-label text-cream/80 truncate">{title}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
