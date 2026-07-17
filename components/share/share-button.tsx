"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import type { StoryId } from "@/lib/stories";

type ShareState = "idle" | "loading" | "error";

export function ShareButton({
  storyId,
  label = "Share",
  variant = "chip",
}: {
  storyId: StoryId;
  label?: string;
  variant?: "chip" | "primary";
}) {
  const [state, setState] = useState<ShareState>("idle");

  async function onClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/share/${storyId}`);
      if (!res.ok) throw new Error("share fetch failed");
      const blob = await res.blob();
      const file = new File([blob], `gdg-wrapped-${storyId}.png`, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
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
  );
}
