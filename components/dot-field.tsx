"use client";

import { useReducedMotion } from "motion/react";
import { motion } from "motion/react";
import { useGlQualityContext } from "@/components/gl/quality-context";

/**
 * The coin-flip dot field (build4 §3) — bands of big polka dots that
 * continuously flip between ink and accent faces, the DOM-lane counterpart
 * to the shader figures: law 1's "one ambient system," law 2's "the accent
 * is what moves."
 */

const DOTS_PER_ROW = 7;
const DOT_SIZE = { width: "11cqw", maxWidth: 44 };

function Dot({ index, accent, static: isStatic }: { index: number; accent: string; static: boolean }) {
  // Deterministic stagger (SSR rule: no Math.random) — net effect ~2-4
  // dots mid-flip at any moment.
  const delay = ((index * 41) % 23) * 0.35;
  const repeatDelay = ((index * 17) % 11) + 4;
  const presetAccent = index % 5 === 2;

  if (isStatic) {
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{ ...DOT_SIZE, aspectRatio: "1", backgroundColor: presetAccent ? accent : "#0f0f0f" }}
      />
    );
  }

  return (
    <div className="relative flex-shrink-0" style={{ ...DOT_SIZE, aspectRatio: "1", perspective: 400 }}>
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateX: [0, 180, 360] }}
        transition={{ duration: 0.9, delay, repeat: Infinity, repeatDelay, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: "#0f0f0f", backfaceVisibility: "hidden" }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: accent, backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
        />
      </motion.div>
    </div>
  );
}

function DotRow({ accent, offset, static: isStatic }: { accent: string; offset: boolean; static: boolean }) {
  return (
    <div
      className="flex justify-center"
      style={{ gap: "4.5cqw", marginLeft: offset ? "calc(11cqw / 2)" : 0 }}
    >
      {Array.from({ length: DOTS_PER_ROW }, (_, i) => (
        <Dot key={i} index={i} accent={accent} static={isStatic} />
      ))}
    </div>
  );
}

export function DotField({
  accent,
  edge,
  rows = 2,
}: {
  accent: string;
  edge: "top" | "bottom" | "both";
  rows?: number;
}) {
  const reduceMotion = useReducedMotion();
  const glQuality = useGlQualityContext();
  const isStatic = !!reduceMotion || glQuality === "off";

  const rowStack = (keyPrefix: string) =>
    Array.from({ length: rows }, (_, r) => (
      <DotRow key={`${keyPrefix}-${r}`} accent={accent} offset={r % 2 === 1} static={isStatic} />
    ));

  return (
    // -z-10: see components/gl/static-figure.tsx's note — an absolutely
    // positioned element at z-index:auto paints above static in-flow
    // content regardless of DOM order.
    <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {(edge === "top" || edge === "both") && (
        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 pt-2">{rowStack("top")}</div>
      )}
      {(edge === "bottom" || edge === "both") && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 pb-2">{rowStack("bottom")}</div>
      )}
    </div>
  );
}
