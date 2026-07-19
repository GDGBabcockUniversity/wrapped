"use client";

import { isMuted } from "@/lib/audio";

/**
 * Synthesized SFX engine (build6 §5.1) — zero asset files, WebAudio only.
 * One shared AudioContext, created lazily on the same first-gesture unlock
 * that lib/audio.ts's startAudio() already hooks. Sound is seasoning: every
 * call no-ops when muted (the existing mute is the one switch — no second
 * toggle) or before the context exists. vibrate() stays independent —
 * haptics are not sound.
 */

export type SfxName = "whoosh" | "tick" | "thud" | "shimmer" | "blip-up" | "blip-down";

const COOLDOWN_MS = 80;

let ctx: AudioContext | null = null;
const lastPlayed: Partial<Record<SfxName, number>> = {};

/** Call from the first user gesture inside the player. Idempotent. */
export function initSfx(): void {
  if (ctx || typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
}

function envelope(gain: GainNode, peak: number, t0: number, endAt: number) {
  gain.gain.setValueAtTime(peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
}

function playWhoosh(c: AudioContext, t0: number) {
  const dur = 0.18;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1;
  filter.frequency.setValueAtTime(800, t0);
  filter.frequency.exponentialRampToValueAtTime(250, t0 + dur);
  const gain = c.createGain();
  envelope(gain, 0.1, t0, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

function playTone(
  c: AudioContext,
  t0: number,
  opts: { type: OscillatorType; from: number; to?: number; dur: number; peak: number }
) {
  const osc = c.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
  const gain = c.createGain();
  envelope(gain, opts.peak, t0, t0 + opts.dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur);
}

function playShimmer(c: AudioContext, t0: number) {
  const dur = 0.35;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.06, t0 + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  master.connect(c.destination);

  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 6;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start(t0);
  lfo.stop(t0 + dur);

  for (const freq of [880, 1320]) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
}

export function playSfx(name: SfxName): void {
  if (!ctx || isMuted()) return;
  const t = performance.now();
  if (t - (lastPlayed[name] ?? 0) < COOLDOWN_MS) return;
  lastPlayed[name] = t;

  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const t0 = ctx.currentTime;

  switch (name) {
    case "whoosh":
      return playWhoosh(ctx, t0);
    case "tick":
      return playTone(ctx, t0, { type: "square", from: 1900, dur: 0.018, peak: 0.05 });
    case "thud":
      return playTone(ctx, t0, { type: "sine", from: 120, to: 60, dur: 0.09, peak: 0.22 });
    case "shimmer":
      return playShimmer(ctx, t0);
    case "blip-up":
      return playTone(ctx, t0, { type: "sine", from: 520, to: 780, dur: 0.12, peak: 0.08 });
    case "blip-down":
      return playTone(ctx, t0, { type: "sine", from: 520, to: 260, dur: 0.12, peak: 0.08 });
  }
}
