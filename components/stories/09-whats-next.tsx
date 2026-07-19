"use client";

import { motion, useReducedMotion } from "motion/react";
import { KineticWords } from "@/components/kinetic-words";
import { PopLetters } from "@/components/pop-letters";
import { copy } from "@/lib/copy";
import { DotField } from "@/components/dot-field";
import { AmbientScribbles } from "@/components/ambient-scribbles";
import { ACCENT_HEX } from "@/components/gl/shaders";
import type { StoryProps } from "./types";

export function WhatsNextStory({ phase }: StoryProps) {
  const reduceMotion = useReducedMotion();

  if (phase === "setup") {
    // build6 §2.7: was a bare line on a naked field — law 10 applies to
    // quiet screens too, so it gets scribbles at minimum.
    return (
      <div className="absolute inset-0 flex items-center justify-center text-ink px-6 pt-20 pb-16">
        <AmbientScribbles field="cream" />
        <p className="t-editorial text-center">
          <KineticWords text={copy.whatsNext.setup} />
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-ink px-6 pt-20 pb-16 gap-6 text-center">
      {/* Replaces the shader's ember motes as this story's one ambient
          system (build4 §3) — the shader keeps only its grain darkening. */}
      <DotField accent={ACCENT_HEX.green} edge="bottom" />
      {/* Filled type, not outlined — PopLetters' bubbly per-letter pop needs
          a stable glyph per letter, which an SVG outline filter can't give
          (§11.7 build2.md: never combine kinetic/pop type with outlines). */}
      <p className="t-display text-gdg-green">
        <PopLetters text={copy.whatsNext.revealTitle} wave />
      </p>
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        animate={reduceMotion ? {} : { y: [8, -8] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <path
          d="M12 30 L24 16 L36 30"
          stroke="#34a853"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      <p className="t-body text-ink/65">{copy.whatsNext.revealSub}</p>
      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <a
          href="https://babcock100.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink text-cream px-6 py-3 t-label text-center"
        >
          {copy.whatsNext.ctaHundred}
        </a>
        <a
          href="https://gdgbabcock.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-ink/30 text-ink px-6 py-3 t-label text-center"
        >
          {copy.whatsNext.ctaJoin}
        </a>
      </div>
    </div>
  );
}
