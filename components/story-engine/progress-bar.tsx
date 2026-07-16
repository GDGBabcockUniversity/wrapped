"use client";

import { useEffect, useRef } from "react";
import type { RefObject, ReactNode } from "react";

export function ProgressBar({
  progressRef,
  total,
  currentPos,
  field,
  label,
  onOpenGrid,
  shareSlot,
}: {
  progressRef: RefObject<number>;
  total: number;
  currentPos: number;
  field: "ink" | "cream";
  label: string;
  onOpenGrid: () => void;
  shareSlot?: ReactNode;
}) {
  const fillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    function paint() {
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${progressRef.current})`;
      }
      raf = requestAnimationFrame(paint);
    }
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, currentPos]);

  const track = field === "ink" ? "bg-cream/25" : "bg-ink/20";
  const fill = field === "ink" ? "bg-cream" : "bg-ink";
  const text = field === "ink" ? "text-cream" : "text-ink";

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 px-3"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full overflow-hidden ${track}`}
          >
            <div
              ref={i === currentPos ? fillRef : undefined}
              className={`h-full w-full origin-left ${fill}`}
              style={{
                transform: i < currentPos ? "scaleX(1)" : "scaleX(0)",
              }}
            />
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between mt-2 ${text}`}>
        <span className="t-label opacity-90">{label}</span>
        <div className="flex items-center gap-3">
          {shareSlot}
          <button
            onClick={onOpenGrid}
            aria-label="Story grid"
            className="text-lg leading-none opacity-90"
          >
            &#8862;
          </button>
        </div>
      </div>
    </div>
  );
}
