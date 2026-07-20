"use client";

/**
 * The soundtrack engine (§12 build2.md, per-story tracks 2026-07-20). Every
 * story carries its own song (lib/soundtrack.ts — placeholder map the owner
 * edits); the engine crossfades between them on story change, mute
 * preference remembered across sessions.
 *
 * Autoplay policy is the whole difficulty here, and the 2026-07-20 rebuild
 * fixes three ways the previous version could end in permanent silence:
 *
 *  1. It unlocked on the FIRST gesture only (`once: true`) and swallowed the
 *     play() rejection. One rejected call — a track still loading, a context
 *     the browser hadn't resumed yet, an iOS gesture that didn't count — and
 *     the music never came back for the rest of the session. Now every
 *     gesture retries until a `playing` event actually confirms sound, and
 *     only then are the listeners removed.
 *  2. It played through a bare HTMLAudioElement while lib/sfx.ts built its
 *     own AudioContext. The element is now routed INTO the shared context
 *     (lib/audio-context.ts) so music and SFX share one graph and one iOS
 *     audio session.
 *  3. A suspended context stayed suspended. ensureAudioContext() resumes on
 *     every gesture.
 *
 * Degradation contract is unchanged: a story track that fails to load falls
 * back to FALLBACK_TRACK without interrupting playback; if the fallback
 * itself is missing, `available` flips false, the mute button hides, and the
 * feature degrades to silence with zero UI residue.
 */

import { ensureAudioContext, getAudioContext } from "@/lib/audio-context";
import { FALLBACK_TRACK, SOUNDTRACK } from "@/lib/soundtrack";
import type { StoryId } from "@/lib/stories";

const MUTE_KEY = "wrapped-muted";
const VOLUME = 0.35;
const CROSSFADE_MS = 900;
// Any of these counts as the gesture that lets us start. Several are listed
// because no single one fires reliably everywhere: iOS Safari has historically
// honoured `touchend` when `pointerdown` was too early in the gesture, and a
// keyboard visitor produces neither.
const UNLOCK_EVENTS = ["pointerdown", "touchend", "click", "keydown"] as const;

interface Deck {
  el: HTMLAudioElement;
  src: string;
  node: MediaElementAudioSourceNode | null;
}

let current: Deck | null = null;
let fadeRaf = 0;
let desiredSrc: string | null = null; // set before first gesture, played on unlock
let playing = false; // confirmed by a real `playing` event, not by hope
let primed = false; // unlock listeners armed
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

/** True once a `playing` event has confirmed the soundtrack is audible. */
export function isAudioPlaying(): boolean {
  return playing;
}

let visibilityHooked = false;
function hookVisibility() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", () => {
    if (!current) return;
    if (document.hidden) current.el.pause();
    else if (!isMuted()) attemptPlay();
  });
}

/** Assigning an out-of-range volume THROWS; belt-and-braces so no rounding
    error can ever take the fade loop down with it again. */
function setVolume(el: HTMLAudioElement, v: number) {
  el.volume = Math.min(1, Math.max(0, v));
}

function resolveSrc(src: string): string {
  return badSrcs.has(src) ? FALLBACK_TRACK : src;
}

function makeDeck(src: string): Deck {
  const el = new Audio(src);
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  // iOS refuses inline playback for media without this, even audio-only.
  el.setAttribute("playsinline", "");
  el.addEventListener("playing", () => {
    if (playing) return;
    playing = true;
    disarmUnlock();
    notify();
  });
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

  // Route into the shared graph — but only when the context is actually
  // running. A MediaElementAudioSourceNode redirects ALL of the element's
  // output into the graph, so attaching one to a context that never resumes
  // would trade "maybe silent" for "definitely silent". Unrouted elements
  // play straight to the device, which is a perfectly good fallback.
  let node: MediaElementAudioSourceNode | null = null;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "running") {
    try {
      node = ctx.createMediaElementSource(el);
      node.connect(ctx.destination);
    } catch {
      node = null; // already routed, or the browser said no — play direct
    }
  }
  return { el, src, node };
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
    // Clamped at BOTH ends, and that lower clamp is the whole ballgame: the
    // timestamp rAF hands a callback is the frame's START time, which can
    // predate the performance.now() captured a moment earlier in the same
    // frame. `now - t0` then goes NEGATIVE, `el.volume = 0.35 * -0.07`
    // throws IndexSizeError (volume must be 0..1), the exception kills this
    // rAF loop on its first tick — and the deck plays on forever at the
    // volume 0 it was created with. That is exactly why the soundtrack was
    // silent: it was never not-playing, it was playing at zero.
    const t = Math.min(1, Math.max(0, (now - t0) / CROSSFADE_MS));
    setVolume(next.el, VOLUME * t);
    if (old) setVolume(old.el, oldStart * (1 - t));
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else if (old) {
      old.el.pause();
      old.el.src = "";
      old.node?.disconnect();
    }
  }
  fadeRaf = requestAnimationFrame(step);
}

/** Start, or nudge, playback. Cheap and idempotent — safe on every gesture. */
function attemptPlay() {
  if (!available || typeof window === "undefined" || isMuted()) return;
  hookVisibility();
  if (!current) {
    crossfadeTo(desiredSrc ?? FALLBACK_TRACK);
    return;
  }
  if (current.el.paused) {
    current.el.play().catch(() => {});
  }
}

function onUnlockGesture() {
  // The context must be created/resumed from inside the gesture, before the
  // deck is built — makeDeck() routes into it only if it is already running.
  ensureAudioContext();
  attemptPlay();
}

function disarmUnlock() {
  if (!primed || typeof window === "undefined") return;
  primed = false;
  for (const type of UNLOCK_EVENTS) {
    window.removeEventListener(type, onUnlockGesture, { capture: true });
  }
}

/**
 * Arm the unlock listeners. Every gesture retries until playback is
 * confirmed, then they remove themselves. Call once when the player mounts;
 * the returned function tears down.
 */
export function primeAudio(): () => void {
  if (typeof window === "undefined") return () => {};
  if (primed) return disarmUnlock;
  primed = true;
  for (const type of UNLOCK_EVENTS) {
    window.addEventListener(type, onUnlockGesture, { capture: true, passive: true });
  }
  return disarmUnlock;
}

/**
 * Point the engine at a story's song. Safe to call before the first user
 * gesture — the src is remembered and starts on unlock. After unlock it
 * crossfades from whatever is playing.
 */
export function setStoryTrack(storyId: StoryId): void {
  const src = SOUNDTRACK[storyId] ?? FALLBACK_TRACK;
  desiredSrc = src;
  if (current) crossfadeTo(src);
}

export function toggleMute(): void {
  const next = !isMuted();
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // private mode — the toggle still works for this page-load via element state
  }
  if (next) {
    current?.el.pause();
  } else {
    // Unmuting is itself a gesture — a good moment to (re)try everything.
    ensureAudioContext();
    if (current) current.el.volume = VOLUME;
    attemptPlay();
  }
  notify();
}
