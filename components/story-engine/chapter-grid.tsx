"use client";

import { motion, useReducedMotion } from "motion/react";
import { STORIES, type StoryId } from "@/lib/stories";
import { copy } from "@/lib/copy";

const ACCENT_HEX: Record<string, string> = {
  blue: "#4285f4",
  red: "#ea4335",
  yellow: "#faab00",
  green: "#34a853",
  club: "#ea4335",
};

// Guests skip stories 6/7 (standing, your-chapter) entirely during playback
// (§15), but the grid still shows them locked — a tease of what unlocks with
// a real Wrapped, rather than pretending those stories don't exist.
const GUEST_LOCKED: Set<string> = new Set(["standing", "your-chapter"]);

/**
 * The grid is chrome, not a story (build6 §3) — build.md's one-accent-per-
 * story law does NOT bind it. Each card gets a bold pure-CSS mini-figure of
 * its story's accent filling the upper ~55%; no JS animation lives in here,
 * since the grid is a menu and must open instantly.
 */
function CardFigure({ id, accent }: { id: StoryId; accent: string }) {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue!;
  switch (id) {
    case "the-year":
      return (
        <>
          <div className="absolute inset-0" style={{ background: `${hex}33` }} />
          <div
            className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2"
            style={{
              background:
                "repeating-linear-gradient(45deg, rgb(255 246 224 / 0.9) 0 8px, transparent 8px 16px)",
            }}
          />
        </>
      );
    case "moments":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative"
            style={{
              width: "42%",
              aspectRatio: "1",
              background: "var(--color-paper)",
              boxShadow: "0 2px 4px rgb(0 0 0 / 0.25)",
              rotate: "-8deg",
            }}
          >
            <div
              className="absolute -top-1 left-1/2 h-2 w-3/5 -translate-x-1/2"
              style={{ background: hex, rotate: "-4deg" }}
            />
          </div>
        </div>
      );
    case "built":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <div className="h-2 rounded-sm bg-cream" style={{ width: "70%" }} />
          <div className="h-2 rounded-sm" style={{ width: "50%", background: hex }} />
          <div className="h-2 rounded-sm bg-cream" style={{ width: "60%" }} />
        </div>
      );
    case "people":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: 40, height: 16 }}>
            <div
              className="absolute rounded-full"
              style={{ width: 16, height: 16, left: 0, background: hex }}
            />
            <div
              className="absolute rounded-full"
              style={{ width: 16, height: 16, left: 12, background: "var(--color-cream)" }}
            />
            <div
              className="absolute rounded-full"
              style={{ width: 16, height: 16, left: 24, border: "1.5px solid var(--color-ink)" }}
            />
          </div>
        </div>
      );
    case "group-chat":
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <div className="rounded-md" style={{ width: "36%", height: "42%", background: hex }} />
          <div className="flex flex-col gap-1">
            <div className="rounded-sm bg-cream" style={{ width: 16, height: 10 }} />
            <div className="rounded-sm bg-cream" style={{ width: 16, height: 10 }} />
          </div>
        </div>
      );
    case "your-events":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative rounded-md"
            style={{
              width: "56%",
              height: "46%",
              border: "1.5px solid var(--color-cream)",
              background: `${hex}33`,
            }}
          >
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l"
              style={{ borderStyle: "dashed", borderColor: "var(--color-cream)" }}
            />
          </div>
        </div>
      );
    case "standing":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, border: `1.5px dashed ${hex}` }}
          >
            <span className="t-label" style={{ fontSize: "0.75rem", color: hex }}>
              %
            </span>
          </div>
        </div>
      );
    case "your-chapter":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: "58%", height: 2, background: hex }}>
            {[0.1, 0.5, 0.85].map((pos) => (
              <div
                key={pos}
                className="absolute rounded-full"
                style={{ width: 4, height: 4, left: `${pos * 100}%`, top: -1, background: hex }}
              />
            ))}
            <div
              className="absolute"
              style={{ right: -1, bottom: 1, width: 1.5, height: 12, background: hex }}
            />
            <div
              className="absolute"
              style={{
                right: -7,
                bottom: 9,
                width: 0,
                height: 0,
                borderTop: "3px solid transparent",
                borderBottom: "3px solid transparent",
                borderLeft: `6px solid ${hex}`,
              }}
            />
          </div>
        </div>
      );
    case "your-club":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative overflow-hidden rounded-md"
            style={{
              width: "42%",
              aspectRatio: "5 / 7",
              background: "var(--color-ink-2)",
              border: "1px solid rgb(255 246 224 / 0.3)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "conic-gradient(#4285f4, #ea4335, #faab00, #34a853, #4285f4)",
                opacity: 0.3,
              }}
            />
          </div>
        </div>
      );
    case "whats-next":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="t-display" style={{ color: hex, rotate: "-45deg", fontSize: "1.8rem" }}>
            &rarr;
          </span>
        </div>
      );
    case "summary":
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[3, 1.5, 2.5, 1.5, 3].map((w, i) => (
            <div key={i} className="bg-cream" style={{ width: w, height: 28 }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function CheckChip({ accent }: { accent: string }) {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue!;
  return (
    <span
      aria-hidden
      className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full text-[10px] font-bold text-ink"
      style={{ width: 16, height: 16, background: hex }}
    >
      &#10003;
    </span>
  );
}

export function ChapterGrid({
  seen,
  isMember,
  onSelect,
  onClose,
}: {
  seen: boolean[];
  isMember: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="absolute inset-0 z-30 bg-ink/90 backdrop-blur-sm flex flex-col p-4">
      <div className="flex justify-end">
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-cream text-2xl leading-none p-2"
        >
          &times;
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 mt-2 pb-4">
        {STORIES.map((s, i) => {
          const locked = !isMember && GUEST_LOCKED.has(s.id);
          const isSeen = seen[s.index];
          return (
            <motion.button
              key={s.id}
              disabled={locked}
              onClick={() => !locked && onSelect(s.index)}
              initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduceMotion ? { duration: 0.01 } : { duration: 0.2, delay: i * 0.04 }}
              className={`relative aspect-[9/16] rounded-xl overflow-hidden flex flex-col text-left ${
                s.field === "ink" ? "bg-ink-2 text-cream" : "bg-cream-deep text-ink"
              } ${locked ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <div className="relative flex-none w-full overflow-hidden" style={{ height: "55%" }}>
                <CardFigure id={s.id} accent={s.accent} />
              </div>
              <div className="flex-1 flex flex-col justify-end p-3">
                <p className="t-label opacity-90">{s.label}</p>
                <p className="t-body text-xs opacity-70 mt-1">{copy.grid[s.id]}</p>
              </div>
              {isSeen && !locked && <CheckChip accent={s.accent} />}
              {locked && (
                <span aria-hidden className="absolute top-2 right-2 z-10">
                  &#128274;
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
