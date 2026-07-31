"use client";

/**
 * The soundtrack engine (§12 build2.md; per-story loops 2026-07-31). Every
 * chapter carries its own loop (lib/soundtrack.ts); the engine crossfades
 * between them on story change and remembers the mute preference across
 * sessions.
 *
 * Autoplay policy is the whole difficulty here, and it is worth stating
 * plainly what a browser will and will not allow, because the design brief
 * ("sound on by default, like Spotify") sits right on the line:
 *
 *  - A page cannot start audio on a cold load. Chrome and Safari both block
 *    it until the visitor has interacted with the document, and a magic-link
 *    visitor arrives at /wrapped having interacted with nothing.
 *  - The permission belongs to the DOCUMENT, not to the click. Tapping WATCH
 *    on the landing page grants it — provided the move to /wrapped is a
 *    client-side navigation rather than a fresh document. That is the whole
 *    trick, and it is what app/page.tsx does: unlock inside the click
 *    handler, then router.push.
 *
 * So there are three ways in, in order of preference:
 *
 *  1. unlockAudio() from the landing CTA's own gesture — the common path, and
 *     the one where sound is already playing before the first chapter draws.
 *  2. autoplayAudio() on a cold load, which succeeds on browsers that have
 *     decided this origin has earned it and fails silently everywhere else.
 *  3. The armed unlock listeners below, which retry on EVERY gesture until a
 *     `playing` event confirms real sound. An earlier version listened
 *     `once: true` and swallowed the rejection, so a single "no" — a track
 *     still loading, a context not yet resumed — meant silence for the whole
 *     session.
 *
 * When all three fail, `isAudioBlocked()` goes true and the player shows a
 * cue, because silence with no explanation reads as a broken build.
 *
 * Degradation contract is unchanged: a story loop that fails to load falls
 * back to FALLBACK_TRACK without interrupting playback; if the fallback
 * itself is missing, `available` flips false, the mute button hides, and the
 * feature degrades to silence with zero UI residue.
 */

import { ensureAudioContext, getAudioContext } from "@/lib/audio-context";
import { FALLBACK_TRACK, trackFor } from "@/lib/soundtrack";
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
let blocked = false; // a play() call was actually refused
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

/**
 * True when there IS a soundtrack, the visitor has not muted it, and the
 * browser refused to start it. The player shows a cue on this, and only this
 * — "not playing yet" is not the same as "refused", and showing a tap-for-
 * sound prompt while the first loop is merely still downloading would be a
 * lie the visitor acts on.
 */
export function isAudioBlocked(): boolean {
  return available && blocked && !playing && !isMuted();
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

/** Start an element and record whether the browser actually allowed it. */
function play(el: HTMLAudioElement) {
  const started = el.play();
  if (!started) return; // older browsers return void
  started
    .then(() => {
      if (!blocked) return;
      blocked = false;
      notify();
    })
    .catch(() => {
      // NotAllowedError (no gesture yet) or AbortError (a newer play()
      // superseded this one). Either way we are not making sound, and the
      // armed listeners are still there to try again.
      if (blocked || playing) return;
      blocked = true;
      notify();
    });
}

// Loops are fetched one chapter ahead so the crossfade has bytes to work
// with. These elements are never played — they exist to warm the HTTP cache
// and are held in a Set purely so nothing collects them mid-download.
const warmed = new Map<string, HTMLAudioElement>();
const WARM_LIMIT = 3;

/** Fetch a chapter's loop ahead of time. Never plays, never makes sound. */
export function preloadStoryTrack(storyId: StoryId): void {
  if (typeof window === "undefined" || !available) return;
  if (
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData
  ) {
    return;
  }
  const src = resolveSrc(trackFor(storyId));
  // Nothing to fetch if it is already playing, already warmed, or known bad.
  // desiredSrc is checked as well as the live deck because on a cold load the
  // player asks for this warm-up before the first deck exists, and warming a
  // file the very next line is about to stream costs a second full download
  // of it — which today, with every chapter on the shared loop, is 4MB.
  if (src === current?.src || src === desiredSrc) return;
  if (warmed.has(src) || badSrcs.has(src)) return;

  const el = new Audio();
  el.preload = "auto";
  el.src = src;
  warmed.set(src, el);
  if (warmed.size > WARM_LIMIT) {
    const oldest = warmed.keys().next().value;
    if (oldest !== undefined && oldest !== src) warmed.delete(oldest);
  }
}

function makeDeck(src: string): Deck {
  const el = new Audio(src);
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  // iOS refuses inline playback for media without this, even audio-only.
  el.setAttribute("playsinline", "");
  el.addEventListener("playing", () => {
    if (blocked) {
      blocked = false;
      notify();
    }
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
    // A story loop 404'd mid-play — glide onto the shared loop instead.
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
  if (!isMuted()) play(next.el);

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
    play(current.el);
  }
}

/**
 * Start the soundtrack from inside a user gesture. Exported so the landing
 * page can spend its CTA click on it and hand an already-playing engine to
 * /wrapped through a client-side navigation.
 */
export function unlockAudio(): void {
  // The context must be created/resumed from inside the gesture, before the
  // deck is built — makeDeck() routes into it only if it is already running.
  ensureAudioContext();
  attemptPlay();
}

/**
 * Try to start on a cold load, with no gesture to spend. Deliberately does
 * NOT create the AudioContext: constructing one outside a gesture leaves a
 * suspended context that makeDeck() would decline to route through anyway,
 * and on iOS it can claim the page's audio session while producing nothing.
 *
 * The refusal is expected, and the call is still worth making. It builds the
 * deck and starts it buffering, so when the first touch does arrive the sound
 * is there immediately rather than after a download. That is the whole reason
 * to ask for something the browser will almost certainly decline.
 *
 * Starting muted, which is the usual way around this, does NOT work: the
 * muted-autoplay allowance covers <video>, and Chromium refuses a muted
 * <audio> exactly as it refuses an unmuted one (measured 2026-07-31, at
 * document-start under --autoplay-policy=document-user-activation-required).
 * Wrapping every loop in a dummy video track would buy a preroll, at the cost
 * of an entirely separate encode of every file.
 */
export function autoplayAudio(): void {
  // Save-Data exists to stop precisely this: several megabytes fetched on the
  // chance the visitor might later want to hear it. Wait to be asked.
  if (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData
  ) {
    return;
  }
  attemptPlay();
}

function onUnlockGesture() {
  unlockAudio();
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
  // Already audible — the landing CTA got there first. Arming listeners now
  // would only give them something to remove.
  if (playing) return () => {};
  if (primed) return disarmUnlock;
  primed = true;
  for (const type of UNLOCK_EVENTS) {
    window.addEventListener(type, onUnlockGesture, { capture: true, passive: true });
  }
  return disarmUnlock;
}

/**
 * Point the engine at a story's loop. Safe to call before the first user
 * gesture — the src is remembered and starts on unlock. After unlock it
 * crossfades from whatever is playing. Chapters that share a loop (every
 * chapter, until the per-story files land) are a no-op, so the music runs
 * unbroken across the boundary instead of restarting.
 */
export function setStoryTrack(storyId: StoryId): void {
  const src = trackFor(storyId);
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
    // Restore the volume BEFORE unlocking: a deck that already exists was
    // paused at whatever level it held, while one unlockAudio() has to build
    // is created at 0 and fades in on its own.
    if (current) current.el.volume = VOLUME;
    unlockAudio();
  }
  notify();
}
