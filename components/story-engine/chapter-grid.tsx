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

const GDG = ["#4285f4", "#ea4335", "#faab00", "#34a853"] as const;

/**
 * The grid is chrome, not a story (build6 §3) — build.md's one-accent-per-
 * story law does NOT bind it. Each card is a rich pure-CSS mini-poster of its
 * story — the receipt, the polaroid stack, the chat, the ticket, the foil
 * card — not a lone glyph on an empty field (owner, 2026-07-20: the tiles read
 * as placeholders). No JS animation lives here; the grid is a menu and must
 * open instantly. Every figure keeps its hero in the upper region — the parent
 * stage already stops short of the bottom label band.
 */
function CardFigure({ id, accent }: { id: StoryId; accent: string }) {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue!;
  switch (id) {
    case "the-year": {
      // The receipt, printing the year's stats.
      const perf = (pos: "top" | "bottom") => (
        <div className={`absolute ${pos === "top" ? "-top-[3px]" : "-bottom-[3px]"} inset-x-0 flex justify-between px-1`}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: 3, height: 3, background: "var(--color-ink)" }} />
          ))}
        </div>
      );
      return (
        <div className="absolute inset-0" style={{ background: `${hex}22` }}>
          <div
            className="absolute left-1/2 top-[14%] -translate-x-1/2 flex flex-col gap-1.5 px-2.5 py-3"
            style={{ width: "66%", background: "var(--color-paper)", rotate: "-1.5deg", boxShadow: "0 4px 12px rgb(0 0 0 / 0.32)" }}
          >
            {perf("top")}
            {[0.5, 0.36, 0.44, 0.3].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-sm" style={{ width: `${w * 100}%`, background: i === 1 ? hex : "rgb(15 15 15 / 0.75)" }} />
                <div className="flex-1 border-b border-dashed" style={{ borderColor: "rgb(15 15 15 / 0.28)" }} />
                <div className="h-1.5 rounded-sm" style={{ width: 12, background: "rgb(15 15 15 / 0.55)" }} />
              </div>
            ))}
            {perf("bottom")}
          </div>
        </div>
      );
    }
    case "moments": {
      // A tilted polaroid stack.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {[-11, -1, 9].map((rot, i) => (
            <div
              key={i}
              className="absolute bg-paper p-1 pb-3"
              style={{ width: "46%", aspectRatio: "4 / 5", rotate: `${rot}deg`, boxShadow: "0 3px 9px rgb(0 0 0 / 0.32)", zIndex: i }}
            >
              <div className="w-full h-full" style={{ background: i === 1 ? hex : `${hex}77` }} />
            </div>
          ))}
        </div>
      );
    }
    case "built": {
      // The products shipped, a numbered list in GDG colors.
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3.5">
          {GDG.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="t-label" style={{ fontSize: "0.4rem", color: "var(--color-cream)", opacity: 0.55 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="h-2.5 rounded-sm" style={{ flex: 1, background: c, opacity: 0.92, maxWidth: `${88 - i * 12}%` }} />
            </div>
          ))}
        </div>
      );
    }
    case "group-chat": {
      // Message bubbles, left and right.
      const bubbles: [string, string, boolean][] = [
        ["58%", "var(--color-cream)", false],
        ["44%", hex, true],
        ["38%", "var(--color-cream)", false],
        ["62%", hex, true],
      ];
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
          {bubbles.map(([w, bg, right], i) => (
            <div
              key={i}
              className={right ? "self-end rounded-lg rounded-br-sm" : "self-start rounded-lg rounded-bl-sm"}
              style={{ width: w, height: 13, background: bg, opacity: right ? 1 : 0.9 }}
            />
          ))}
        </div>
      );
    }
    case "people": {
      // A wall of faces.
      const cells = Array.from({ length: 9 });
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-1.5">
            {cells.map((_, i) => {
              const fill = i % 4 === 3 ? "transparent" : GDG[i % 4];
              return (
                <div
                  key={i}
                  className="rounded-full"
                  style={{ width: 17, height: 17, background: fill, border: fill === "transparent" ? "1.5px solid rgb(15 15 15 / 0.55)" : "none" }}
                />
              );
            })}
          </div>
        </div>
      );
    }
    case "your-events": {
      // An event ticket: stub + tear + mini barcode.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex" style={{ width: "70%", height: "42%" }}>
            <div
              className="rounded-l-md flex flex-col justify-center gap-1 px-2"
              style={{ flex: 1, background: `${hex}3a`, border: "1.5px solid var(--color-cream)" }}
            >
              <div className="h-1.5 rounded-sm bg-cream" style={{ width: "72%" }} />
              <div className="h-1.5 rounded-sm bg-cream" style={{ width: "50%", opacity: 0.7 }} />
            </div>
            <div className="border-l border-dashed self-stretch" style={{ borderColor: "var(--color-cream)" }} />
            <div
              className="rounded-r-md flex items-center justify-center gap-[2px] px-1.5"
              style={{ background: `${hex}3a`, border: "1.5px solid var(--color-cream)", borderLeftStyle: "none" }}
            >
              {[2, 1, 2, 1, 1].map((w, i) => (
                <div key={i} className="bg-cream" style={{ width: w, height: "50%" }} />
              ))}
            </div>
          </div>
        </div>
      );
    }
    case "standing": {
      // The certification seal.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center rounded-full" style={{ width: 74, height: 74, border: `1.5px dashed ${hex}` }}>
            <div className="absolute inset-1.5 rounded-full" style={{ border: `1px solid ${hex}44` }} />
            <span className="t-monument leading-none" style={{ fontSize: "1.15rem", color: hex }}>
              TOP
            </span>
          </div>
        </div>
      );
    }
    case "your-chapter": {
      // The tenure timeline with a YOU flag.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: "72%", height: 2, background: `${hex}55` }}>
            {[0.12, 0.4, 0.68, 0.92].map((pos) => (
              <div key={pos} className="absolute rounded-full" style={{ width: 6, height: 6, left: `${pos * 100}%`, top: -2, background: hex }} />
            ))}
            <div className="absolute flex flex-col items-center" style={{ left: "56%", bottom: 2 }}>
              <span className="t-label rounded-full px-1" style={{ fontSize: "0.36rem", color: "var(--color-ink)", background: hex, lineHeight: 1.4 }}>
                YOU
              </span>
              <div style={{ width: 1.5, height: 12, background: hex }} />
            </div>
          </div>
        </div>
      );
    }
    case "your-club": {
      // The foil trading card.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative overflow-hidden rounded-md flex flex-col justify-between p-1.5"
            style={{ width: "52%", aspectRatio: "5 / 7", background: "var(--color-ink)", border: "1px solid rgb(255 246 224 / 0.35)" }}
          >
            <div className="absolute inset-0" style={{ background: "conic-gradient(#4285f4, #ea4335, #faab00, #34a853, #4285f4)", opacity: 0.42 }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 42%, rgb(255 246 224 / 0.28) 50%, transparent 58%)" }} />
            <div className="relative h-2.5 rounded-sm" style={{ width: "45%", background: "rgb(255 246 224 / 0.85)" }} />
            <div className="relative flex flex-col gap-1">
              <div className="h-2 rounded-sm" style={{ width: "80%", background: "rgb(255 246 224 / 0.9)" }} />
              <div className="h-1.5 rounded-sm" style={{ width: "55%", background: "rgb(255 246 224 / 0.5)" }} />
            </div>
          </div>
        </div>
      );
    }
    case "whats-next": {
      // A rising trend with a forward arrow.
      return (
        <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-6 pb-[26%]">
          {[0.32, 0.5, 0.72, 1].map((h, i) => (
            <div key={i} className="relative rounded-sm" style={{ width: "13%", height: `${h * 66}px`, background: i === 3 ? hex : `${hex}55` }}>
              {i === 3 && (
                <span className="t-display absolute -top-3 left-1/2 -translate-x-1/2" style={{ color: hex, rotate: "-45deg", fontSize: "1rem" }}>
                  &rarr;
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    case "summary": {
      // The shareable ID card: logo, name, barcode.
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative rounded-md flex flex-col justify-between p-2"
            style={{ width: "58%", aspectRatio: "5 / 7", background: "var(--color-cream)", boxShadow: "0 4px 12px rgb(0 0 0 / 0.3)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-[2px]">
                {GDG.map((c, i) => (
                  <span key={i} className="rounded-full" style={{ width: 4, height: 4, background: c }} />
                ))}
              </div>
              <div className="h-1.5 rounded-sm" style={{ width: 18, background: "rgb(15 15 15 / 0.25)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-2.5 rounded-sm" style={{ width: "75%", background: "var(--color-ink)" }} />
              <div className="h-1.5 rounded-sm" style={{ width: "45%", background: hex }} />
            </div>
            <div className="flex items-end gap-[2px] justify-center">
              {[3, 1.5, 2.5, 1.5, 3, 2, 1.5].map((w, i) => (
                <div key={i} style={{ width: w, height: 14, background: "var(--color-ink)" }} />
              ))}
            </div>
          </div>
        </div>
      );
    }
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
      {/* The scroll wrapper owns the definite height; the grid inside is
          natural (auto) height. That distinction is load-bearing: when the
          grid ITSELF was the flex-1 definite-height child, its auto-rows
          couldn't size to the aspect-[9/16] cards (aspect-ratio doesn't feed
          intrinsic row sizing there), so rows squashed to ~135px, every card
          overflowed and painted over the one below, and labels were buried
          under the next card (owner, IMG_6450). Auto-height grid inside a
          scroll wrapper sizes each row to the full card. */}
      <div className="overflow-y-auto flex-1 mt-2">
        <div className="grid grid-cols-2 content-start gap-3 pb-4">
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
              className={`relative aspect-[9/16] rounded-xl overflow-hidden text-left ${
                s.field === "ink" ? "bg-ink-2 text-cream" : "bg-cream-deep text-ink"
              } ${locked ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {/* Figure fills the tile's upper ~70%; the label rides ON it over
                  a scrim — a tile must say which story it is no matter how the
                  figure area lays out (2026-07-20: labels were getting lost
                  below the fold, so the grid read as anonymous previews). The
                  stage stops short of the bottom band so a rich figure never
                  fights the label. */}
              <div className="absolute inset-x-0 top-0 bottom-[28%] overflow-hidden">
                <CardFigure id={s.id} accent={s.accent} />
              </div>
              <span
                className="absolute top-2 left-2 t-label opacity-50"
                style={{ fontSize: "0.55rem" }}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="absolute inset-x-0 bottom-0 p-3 pt-10"
                style={{
                  background:
                    s.field === "ink"
                      ? "linear-gradient(transparent, rgb(15 15 15 / 0.88))"
                      : "linear-gradient(transparent, rgb(248 236 201 / 0.94))",
                }}
              >
                <p className="t-label" style={{ fontSize: "0.6rem" }}>
                  {s.label}
                </p>
                <p className="t-body text-xs opacity-70 mt-0.5">{copy.grid[s.id]}</p>
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
    </div>
  );
}
