"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import type { Snapshot } from "@/lib/snapshot";
import type { LiveCardKind } from "./live-card-support";

type Stage = "idle" | "recording" | "error";

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
      const { renderLiveCardBlob, fileExtensionFor, shareOrDownloadFile } = await import(
        "./live-card"
      );
      const blob = await renderLiveCardBlob(storyId, snapshot, setProgress);
      const ext = fileExtensionFor(blob.type);
      const file = new File([blob], `gdg-wrapped-${storyId}.${ext}`, { type: blob.type });
      await shareOrDownloadFile(file);
      track("share", { id: storyId, kind: "video" });
      setStage("idle");
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStage("idle");
        return;
      }
      setStage("error");
      setTimeout(() => setStage("idle"), 600);
    }
  }

  async function shareImage() {
    try {
      const res = await fetch(`/api/share/${storyId}`);
      if (!res.ok) throw new Error("share fetch failed");
      const blob = await res.blob();
      const file = new File([blob], `gdg-wrapped-${storyId}.png`, { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "GDG Wrapped 25/26" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gdg-wrapped-${storyId}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      track("share", { id: storyId, kind: "image" });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  return (
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
        {stage === "error" && (
          <p className="t-body text-gdg-red text-sm text-center">
            Couldn&apos;t render that — try the image instead.
          </p>
        )}
        <button onClick={onClose} className="t-label text-ink/40 mt-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
