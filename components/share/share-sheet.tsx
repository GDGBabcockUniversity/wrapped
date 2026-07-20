"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@vercel/analytics";
import type { Snapshot } from "@/lib/snapshot";
import type { StoryId } from "@/lib/stories";
import { CARD_STYLES, type CardStyle } from "./card-themes";
import { supportsLiveCard, type LiveCardKind } from "./live-card-support";
import { shareOrDownloadFile } from "./share-utils";

// The camera-whip wrapper in player.tsx carries `will-change: transform`,
// which (per spec) becomes the containing block for any `position: fixed`
// descendant and traps it in a lower stacking context than TapZones —
// portaling to document.body removes the sheet from that subtree entirely
// (build3.md §3.2).

const RECORD_TIMEOUT_MS = 8000;
const LIVE_CARD_STORIES = new Set<StoryId>(["your-club", "summary"]);

const STYLE_META: Record<CardStyle, { label: string; swatch: string; ring: string }> = {
  classic: { label: "Classic", swatch: "linear-gradient(135deg,#0f0f0f 50%,#fff6e0 50%)", ring: "#fff6e0" },
  ink: { label: "Ink", swatch: "#0f0f0f", ring: "#fff6e0" },
  cream: { label: "Cream", swatch: "#fff6e0", ring: "#0f0f0f" },
  accent: { label: "Bold", swatch: "linear-gradient(135deg,#4285f4,#ea4335,#faab00,#34a853)", ring: "#fff6e0" },
};

type Stage = "idle" | "recording" | "error";

export function ShareSheet({
  storyId,
  snapshot,
  onClose,
}: {
  storyId: StoryId;
  snapshot?: Snapshot | null;
  onClose: () => void;
}) {
  const [style, setStyle] = useState<CardStyle>("classic");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  // Cache the fetched blob per style so Share reuses the EXACT bytes the
  // preview is showing — the old flow fetched a fresh card at share time,
  // which is why "share" could differ from what the sheet displayed.
  const blobCache = useRef<Map<CardStyle, Blob>>(new Map());

  const offersLiveCard =
    LIVE_CARD_STORIES.has(storyId) && !!snapshot && supportsLiveCard();

  // Fetch (or reuse) the card PNG for the current style and show it.
  useEffect(() => {
    let cancelled = false;
    const cached = blobCache.current.get(style);
    if (cached) {
      const url = URL.createObjectURL(cached);
      setPreviewUrl(url);
      setLoadingPreview(false);
      return () => {
        cancelled = true;
        URL.revokeObjectURL(url);
      };
    }
    setLoadingPreview(true);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const sep = search ? "&" : "?";
    let objectUrl: string | null = null;
    fetch(`/api/share/${storyId}${search}${sep}style=${style}`)
      .then((r) => {
        if (!r.ok) throw new Error("preview fetch failed");
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        blobCache.current.set(style, blob);
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setLoadingPreview(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [style, storyId]);

  async function shareImage() {
    const blob = blobCache.current.get(style);
    if (!blob) return;
    try {
      const file = new File([blob], `gdg-wrapped-${storyId}-${style}.png`, { type: "image/png" });
      await shareOrDownloadFile(file, "GDG Wrapped 25/26");
      track("share", { id: storyId, kind: "image", style });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStage("error");
    }
  }

  async function shareLive() {
    if (!snapshot) return;
    setStage("recording");
    setProgress(0);
    try {
      const { renderLiveCardBlob, fileExtensionFor } = await import("./live-card");
      // MediaRecorder + canvas.captureStream can hang without ever firing
      // `dataavailable` on some browsers — race it against a hard timeout
      // (build3.md §3.3).
      const blob = await Promise.race([
        renderLiveCardBlob(storyId as LiveCardKind, snapshot, setProgress),
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
      setStage("error");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="toast w-full max-w-sm bg-cream text-ink rounded-t-2xl px-5 pt-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <p className="t-label text-ink/50">Share this card</p>
          <button onClick={onClose} aria-label="Close" className="text-ink/40 text-xl leading-none px-1">
            &times;
          </button>
        </div>

        {/* The preview IS the deliverable — this exact image is what Share
            sends. No more preview/output mismatch. */}
        <div
          className="relative mx-auto w-full max-w-[220px] rounded-xl overflow-hidden bg-ink/5"
          style={{ aspectRatio: "9 / 16" }}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Your shareable card"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
              style={{ opacity: loadingPreview ? 0.4 : 1 }}
            />
          )}
          {loadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="t-label text-ink/40 text-[0.6rem]">Rendering…</span>
            </div>
          )}
        </div>

        {/* Style picker — Spotify-style row of looks. */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {CARD_STYLES.map((s) => {
            const meta = STYLE_META[s];
            const selected = s === style;
            return (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className="flex flex-col items-center gap-1"
                aria-pressed={selected}
                aria-label={`${meta.label} style`}
              >
                <span
                  className="w-9 h-9 rounded-full"
                  style={{
                    background: meta.swatch,
                    boxShadow: selected ? `0 0 0 2px #f8ecc9, 0 0 0 4px ${meta.ring}` : "inset 0 0 0 1px rgba(15,15,15,0.15)",
                  }}
                />
                <span
                  className="t-label text-[0.5rem]"
                  style={{ opacity: selected ? 0.9 : 0.45 }}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>

        {stage === "error" ? (
          <>
            <p className="t-body text-gdg-red text-sm text-center">
              Couldn&apos;t render that on this device. The image still works.
            </p>
            <button
              onClick={() => setStage("idle")}
              className="rounded-full border border-ink/25 text-ink px-6 py-3 t-label"
            >
              Back to image
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={shareImage}
              disabled={loadingPreview || stage === "recording"}
              className="rounded-full bg-ink text-cream px-6 py-3.5 t-label disabled:opacity-50"
            >
              Share card
            </button>
            {offersLiveCard && (
              <button
                onClick={shareLive}
                disabled={stage === "recording"}
                className="rounded-full border border-ink/25 text-ink px-6 py-3.5 t-label disabled:opacity-60"
              >
                {stage === "recording"
                  ? `Rendering video… ${Math.round(progress * 3)}s`
                  : "Share animated video"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
