"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  subscribeAudio,
  getAudioVersion,
  isAudioBlocked,
  unlockAudio,
} from "@/lib/audio";

/**
 * Shown only when the browser has actually refused to start the soundtrack —
 * a cold load straight into /wrapped from a magic link, where there is no
 * earlier gesture to spend (see lib/audio.ts).
 *
 * It is a cue, not a gate: the chapter plays on behind it, every tap anywhere
 * on the stage already retries the audio, and this disappears the moment
 * sound arrives. It exists because the mute button in the top chrome fades to
 * nothing when idle, so a silent first-time visitor otherwise has no way of
 * knowing there was ever meant to be music.
 */
export function SoundCue() {
  useSyncExternalStore(subscribeAudio, getAudioVersion, () => 0);
  const blocked = isAudioBlocked();

  return (
    <AnimatePresence>
      {blocked && (
        <motion.button
          key="sound-cue"
          onClick={unlockAudio}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-ink/70 text-cream px-3.5 py-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path
              d="M16.5 8.5a5 5 0 0 1 0 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="t-label" style={{ fontSize: "0.6rem" }}>
            Tap for sound
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
