"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeAudio,
  getAudioVersion,
  isMuted,
  isAudioAvailable,
  toggleMute,
} from "@/lib/audio";

/** Speaker toggle for the ambient loop — hides entirely when no track file
 * is deployed (§12 build2.md). Lives inside the chrome fade group. */
export function MuteButton() {
  useSyncExternalStore(subscribeAudio, getAudioVersion, () => 0);
  if (!isAudioAvailable()) return null;
  const muted = isMuted();

  return (
    <button
      onClick={toggleMute}
      aria-label={muted ? "Unmute music" : "Mute music"}
      className="opacity-90"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {muted ? (
          <path
            d="M16 9l5 6M21 9l-5 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
