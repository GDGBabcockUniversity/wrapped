"use client";

/**
 * Ambient soundtrack controller (§12 build2.md). One looping track for the
 * whole experience, started on the visitor's FIRST tap (browsers block
 * autoplay before a gesture), mute preference remembered across sessions.
 *
 * The track itself is owner-supplied: drop a licensed/royalty-free MP3 at
 * public/audio/wrapped-loop.mp3 (~1–2 MB). Until it exists, the loader
 * errors, `available` flips false, and the mute button hides — the whole
 * feature degrades to silence with zero UI residue.
 */

const SRC = "/audio/wrapped-loop.mp3";
const MUTE_KEY = "wrapped-muted";
const VOLUME = 0.35;

let audio: HTMLAudioElement | null = null;
let available = true;
let started = false;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAudioVersion(): number {
  return version;
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isAudioAvailable(): boolean {
  return available;
}

function ensure(): HTMLAudioElement | null {
  if (typeof window === "undefined" || !available) return null;
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      available = false;
      notify();
    });
    document.addEventListener("visibilitychange", () => {
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (started && !isMuted()) audio.play().catch(() => {});
    });
  }
  return audio;
}

/** Call from the first user gesture inside the player. Idempotent. */
export function startAudio(): void {
  if (started) return;
  const el = ensure();
  if (!el) return;
  started = true;
  if (!isMuted()) el.play().catch(() => {});
  notify();
}

export function toggleMute(): void {
  const el = ensure();
  const next = !isMuted();
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // private mode — the toggle still works for this page-load via the element state
  }
  if (el) {
    if (next) el.pause();
    else if (started) el.play().catch(() => {});
  }
  notify();
}
