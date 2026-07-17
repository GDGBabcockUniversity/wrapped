"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { track } from "@vercel/analytics";
import type { StoryId } from "@/lib/stories";
import type { Snapshot } from "@/lib/snapshot";
import { supportsLiveCard, type LiveCardKind } from "./live-card-support";
import { shareOrDownloadFile } from "./share-utils";

type ShareState = "idle" | "loading" | "error";

const LIVE_CARD_STORIES = new Set<StoryId>(["your-club", "summary"]);

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
  const [state, setState] = useState<ShareState>("idle");
  const [sheetOpen, setSheetOpen] = useState(false);

  const offersLiveCard =
    LIVE_CARD_STORIES.has(storyId) && !!snapshot && supportsLiveCard();

  async function onClick() {
    if (offersLiveCard) {
      setSheetOpen(true);
      return;
    }
    setState("loading");
    try {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const res = await fetch(`/api/share/${storyId}${search}`);
      if (!res.ok) throw new Error("share fetch failed");
      const blob = await res.blob();
      const file = new File([blob], `gdg-wrapped-${storyId}.png`, { type: "image/png" });

      await shareOrDownloadFile(file, "GDG Wrapped 25/26");

      track("share", { id: storyId });
      setState("idle");
    } catch (err) {
      // A user canceling the native share sheet throws AbortError — silent, not an error.
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setTimeout(() => setState("idle"), 600);
    }
  }

  const base =
    variant === "primary"
      ? "rounded-full bg-cream text-ink px-6 py-3 t-label w-full"
      : "rounded-full bg-ink/40 text-cream px-3 py-1.5 t-label text-[0.6rem] flex items-center gap-1.5";

  return (
    <>
      <button
        onClick={onClick}
        disabled={state === "loading"}
        className={`${base} ${state === "error" ? "animate-[shake_0.3s_ease-in-out]" : ""} disabled:opacity-60`}
      >
        {state === "loading" ? (
          <span aria-hidden>&#8230;</span>
        ) : (
          <>
            <span aria-hidden>&#8593;</span> {label}
          </>
        )}
      </button>
      {sheetOpen && snapshot && (
        <ShareSheet
          storyId={storyId as LiveCardKind}
          snapshot={snapshot}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
