"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@vercel/analytics";
import type { Snapshot } from "@/lib/snapshot";
import type { LiveCardKind } from "./live-card-support";

import { shareOrDownloadFile } from "./share-utils";

type Stage = "idle" | "recording" | "error";

// The camera-whip wrapper in player.tsx carries `will-change: transform`,
// which (per spec) becomes the containing block for any `position: fixed`
// descendant and traps it in a lower stacking context than TapZones —
// z-[70] here would never actually paint above TapZones' z-[15], and a
// backdrop tap to dismiss would fall through to TapZones as an ordinary
// stage tap instead (build3.md §3.2). Portaling to document.body removes
// the sheet from that subtree entirely.
const RECORD_TIMEOUT_MS = 8000;

export function ShareSheet({
  storyId,
  snapshot,
  onClose,
}: {
  storyId: LiveCardKind;
  snapshot: Snapshot;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);

  async function shareLive() {
    setStage("recording");
    setProgress(0);
    try {
      const { renderLiveCardBlob, fileExtensionFor } = await import(
        "./live-card"
      );
      // MediaRecorder + canvas.captureStream on some browsers (notably
      // older iOS Safari) can fail to ever fire `dataavailable`, hanging
      // this promise forever with the sheet stuck on "Rendering…" — race
      // it against a hard timeout instead of trusting it always settles
      // (build3.md §3.3).
      const blob = await Promise.race([
        renderLiveCardBlob(storyId, snapshot, setProgress),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("recording timed out")), RECORD_TIMEOUT_MS)
        ),
      ]);
      const ext = fileExtensionFor(blob.type);
      const file = new File([blob], `gdg-wrapped-${storyId}.${ext}`, { type: blob.type });
      await shareOrDownloadFile(file, "GDG Wrapped 25/26");
      track("share", { id: storyId, kind: "video" });
      setStage("idle");
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStage("idle");
        return;
      }
      // Held until the visitor acts (not auto-reset) — a 600ms flash was
      // easy to miss, which read as "sharing does nothing" rather than
      // "that failed, try the other option" (build3.md §3.3).
      setStage("error");
    }
  }

  async function shareImage() {
    try {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const res = await fetch(`/api/share/${storyId}${search}`);
      if (!res.ok) throw new Error("share fetch failed");
      const blob = await res.blob();
      const file = new File([blob], `gdg-wrapped-${storyId}.png`, { type: "image/png" });
      await shareOrDownloadFile(file, "GDG Wrapped 25/26");
      track("share", { id: storyId, kind: "image" });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="toast w-full max-w-sm bg-cream text-ink rounded-t-2xl p-5 pb-8 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
      >
        <p className="t-label text-ink/50 text-center mb-1">Share your card</p>

        {stage === "error" ? (
          <>
            <p className="t-body text-gdg-red text-sm text-center">
              Couldn&apos;t render the live card on this device.
            </p>
            <button
              onClick={shareImage}
              className="rounded-full bg-ink text-cream px-6 py-3.5 t-label"
            >
              Share image instead
            </button>
          </>
        ) : (
          <>
            <button
              onClick={shareLive}
              disabled={stage === "recording"}
              className="rounded-full bg-ink text-cream px-6 py-3.5 t-label disabled:opacity-70"
            >
              {stage === "recording"
                ? `Rendering… ${Math.round(progress * 3)}s`
                : "Share live card"}
            </button>
            <button
              onClick={shareImage}
              disabled={stage === "recording"}
              className="rounded-full border border-ink/25 text-ink px-6 py-3.5 t-label disabled:opacity-50"
            >
              Share image
            </button>
          </>
        )}
        <button onClick={onClose} className="t-label text-ink/40 mt-1">
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
