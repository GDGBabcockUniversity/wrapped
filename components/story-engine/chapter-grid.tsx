"use client";

import { STORIES } from "@/lib/stories";
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
        {STORIES.map((s) => {
          const locked = !isMember && GUEST_LOCKED.has(s.id);
          const isSeen = seen[s.index];
          return (
            <button
              key={s.id}
              disabled={locked}
              onClick={() => !locked && onSelect(s.index)}
              className={`aspect-[9/16] rounded-xl p-3 flex flex-col justify-between text-left transition-opacity ${
                s.field === "ink" ? "bg-ink-2 text-cream" : "bg-cream-deep text-ink"
              } ${isSeen ? "opacity-100" : "opacity-55"} ${
                locked ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-full"
                  style={{ background: ACCENT_HEX[s.accent] }}
                />
                {locked && <span aria-hidden>&#128274;</span>}
              </div>
              <div>
                <p className="t-label opacity-90">{s.label}</p>
                <p className="t-body text-xs opacity-70 mt-1">
                  {copy.grid[s.id]}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
