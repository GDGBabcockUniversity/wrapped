"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { StoryId } from "@/lib/stories";
import type { Snapshot } from "@/lib/snapshot";

const ShareSheet = dynamic(() => import("./share-sheet").then((m) => m.ShareSheet), {
  ssr: false,
});

export function ShareButton({
  storyId,
  label = "Share",
  variant = "chip",
  snapshot,
}: {
  storyId: StoryId;
  label?: string;
  variant?: "chip" | "primary";
  snapshot?: Snapshot | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Every story now opens the preview-first sheet (2026-07-20) — no more
  // silent direct-download that could differ from what the sheet showed,
  // and no story is un-shareable.
  const base =
    variant === "primary"
      ? "rounded-full bg-cream text-ink px-6 py-3 t-label w-full"
      : "rounded-full bg-ink/40 text-cream px-3 py-1.5 t-label text-[0.6rem] flex items-center gap-1.5";

  return (
    <>
      <button onClick={() => setSheetOpen(true)} className={base}>
        <span aria-hidden>&#8593;</span> {label}
      </button>
      {sheetOpen && (
        <ShareSheet storyId={storyId} snapshot={snapshot} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}
