"use client";

/**
 * The soundtrack engine (§12 build2.md, per-story tracks 2026-07-20). Every
 * story carries its own song (lib/soundtrack.ts — placeholder map the owner
 * edits); the engine crossfades between them on story change, started on the
 * visitor's FIRST tap (browsers block autoplay before a gesture), mute
 * preference remembered across sessions.
 *
 * Degradation contract: a story track that fails to load falls back to
 * FALLBACK_TRACK without interrupting playback; if the fallback itself is
 * missing, `available` flips false, the mute button hides, and the whole
 * feature degrades to silence with zero UI residue.
 */

import { FALLBACK_TRACK, SOUNDTRACK } from "@/lib/soundtrack";
import type { StoryId } from "@/lib/stories";

const MUTE_KEY = "wrapped-muted";
const VOLUME = 0.35;
const CROSSFADE_MS = 900;

interface Deck {
  el: HTMLAudioElement;
  src: string;
}

let current: Deck | null = null;
let fadeRaf = 0;
let desiredSrc: string | null = null; // set before first gesture, played on unlock
let started = false;
let available = true;
const badSrcs = new Set<string>(); // 404'd tracks — don't retry, fall back
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

let visibilityHooked = false;
function hookVisibility() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", () => {
    if (!current) return;
    if (document.hidden) current.el.pause();
    else if (started && !isMuted()) current.el.play().catch(() => {});
  });
}

function resolveSrc(src: string): string {
  return badSrcs.has(src) ? FALLBACK_TRACK : src;
}

function makeDeck(src: string): Deck {
  const el = new Audio(src);
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  el.addEventListener("error", () => {
    badSrcs.add(src);
    if (src === FALLBACK_TRACK) {
      // The shared loop itself is missing — the whole feature stands down.
      available = false;
      if (current?.src === src) current = null;
      notify();
      return;
    }
    // A story track 404'd mid-play — glide onto the shared loop instead.
    if (current?.src === src) {
      current = null;
      crossfadeTo(FALLBACK_TRACK);
    }
  });
  return { el, src };
}

/** Volume ramp both decks over CROSSFADE_MS, then retire the old one. */
function crossfadeTo(src: string) {
  if (!available || typeof window === "undefined") return;
  const target = resolveSrc(src);
  if (current?.src === target) return;

  const old = current;
  const next = makeDeck(target);
  current = next;
  if (!isMuted()) next.el.play().catch(() => {});

  cancelAnimationFrame(fadeRaf);
  const t0 = performance.now();
  const oldStart = old?.el.volume ?? 0;

  function step(now: number) {
    const t = Math.min(1, (now - t0) / CROSSFADE_MS);
    next.el.volume = VOLUME * t;
    if (old) old.el.volume = oldStart * (1 - t);
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else if (old) {
      old.el.pause();
      old.el.src = "";
    }
  }
  fadeRaf = requestAnimationFrame(step);
}

/**
 * Point the engine at a story's song. Safe to call before the first user
 * gesture — the src is remembered and starts on unlock. After unlock it
 * crossfades from whatever is playing.
 */
export function setStoryTrack(storyId: StoryId): void {
  const src = SOUNDTRACK[storyId] ?? FALLBACK_TRACK;
  desiredSrc = src;
  if (started) crossfadeTo(src);
}

/** Call from the first user gesture inside the player. Idempotent. */
export function startAudio(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  hookVisibility();
  crossfadeTo(desiredSrc ?? FALLBACK_TRACK);
  notify();
}

export function toggleMute(): void {
  const next = !isMuted();
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // private mode — the toggle still works for this page-load via element state
  }
  if (current) {
    if (next) current.el.pause();
    else if (started) {
      current.el.volume = VOLUME;
      current.el.play().catch(() => {});
    }
  }
  notify();
}
