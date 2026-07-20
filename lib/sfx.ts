"use client";

import { isMuted } from "@/lib/audio";

/**
 * Synthesized SFX engine (build7 §5 — rebuilt from build6's thin single-osc
 * blips, which the owner called "severely subpar"). Still zero asset files,
 * WebAudio only, but every cue now has BODY (layered partials, sub weight,
 * click transients) and SPACE (a shared compressor + short convolver reverb),
 * with click-free attack ramps. One shared AudioContext, created lazily on
 * the same first-gesture unlock as the music; every call no-ops when muted or
 * before unlock; 80ms per-name cooldown so rapid taps don't machine-gun.
 */

export type SfxName = "whoosh" | "tick" | "thud" | "shimmer" | "blip-up" | "blip-down";

const COOLDOWN_MS = 80;

interface Bus {
  input: GainNode; // dry sum — voices connect here
  reverb: ConvolverNode; // wet send — voices also connect here (low)
}

let ctx: AudioContext | null = null;
let bus: Bus | null = null;
const lastPlayed: Partial<Record<SfxName, number>> = {};

function makeNoise(c: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** A short algorithmic room impulse — exponentially-decaying noise. Gives
    every cue a small space to sit in instead of sitting on the glass. */
function makeImpulse(c: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

function buildBus(c: BaseAudioContext): Bus {
  const input = c.createGain();
  input.gain.value = 0.5;
  const comp = c.createDynamicsCompressor();
  input.connect(comp);
  comp.connect(c.destination);

  const reverb = c.createConvolver();
  reverb.buffer = makeImpulse(c, 0.18, 2.6);
  const ret = c.createGain();
  ret.gain.value = 0.16;
  reverb.connect(ret);
  ret.connect(comp);

  return { input, reverb };
}

/** An envelope gain with a click-free attack ramp, connected dry to the bus
    and (optionally) sent to the reverb. Voices route their sources through
    the returned node. */
function voiceOut(c: BaseAudioContext, b: Bus, t0: number, peak: number, attack: number, dur: number, wet: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(b.input);
  if (wet > 0) {
    const s = c.createGain();
    s.gain.value = wet;
    g.connect(s);
    s.connect(b.reverb);
  }
  return g;
}

function vWhoosh(c: BaseAudioContext, b: Bus, t0: number) {
  const dur = 0.22;
  const noise = c.createBufferSource();
  noise.buffer = makeNoise(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(1200, t0);
  bp.frequency.exponentialRampToValueAtTime(300, t0 + dur);
  const ng = voiceOut(c, b, t0, 0.12, 0.006, dur, 0.5);
  noise.connect(bp).connect(ng);
  noise.start(t0);
  noise.stop(t0 + dur);

  const sub = c.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(220, t0);
  sub.frequency.exponentialRampToValueAtTime(70, t0 + dur);
  const sg = voiceOut(c, b, t0, 0.09, 0.006, dur, 0.3);
  sub.connect(sg);
  sub.start(t0);
  sub.stop(t0 + dur);
}

function vTick(c: BaseAudioContext, b: Bus, t0: number) {
  const dur = 0.03;
  const carrier = c.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 2400;
  const mod = c.createOscillator();
  mod.type = "sine";
  mod.frequency.value = 1600;
  const modGain = c.createGain();
  modGain.gain.value = 1400;
  mod.connect(modGain).connect(carrier.frequency);
  const g = voiceOut(c, b, t0, 0.06, 0.002, dur, 0.25);
  carrier.connect(g);
  carrier.start(t0);
  carrier.stop(t0 + dur);
  mod.start(t0);
  mod.stop(t0 + dur);
}

function vThud(c: BaseAudioContext, b: Bus, t0: number) {
  const dur = 0.16;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(48, t0 + dur);
  const g = voiceOut(c, b, t0, 0.28, 0.004, dur, 0.35);
  osc.connect(g);
  osc.start(t0);
  osc.stop(t0 + dur);

  // A click transient on the attack gives the landing definition.
  const click = c.createBufferSource();
  click.buffer = makeNoise(c, 0.01);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  const cg = voiceOut(c, b, t0, 0.14, 0.001, 0.02, 0.2);
  click.connect(hp).connect(cg);
  click.start(t0);
  click.stop(t0 + 0.02);
}

function vShimmer(c: BaseAudioContext, b: Bus, t0: number) {
  const dur = 0.42;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(700, t0);
  lp.frequency.exponentialRampToValueAtTime(4200, t0 + dur * 0.7);
  const g = voiceOut(c, b, t0, 0.06, 0.02, dur, 0.85);
  lp.connect(g);
  const base = 740;
  [1, 2, 3].forEach((mult, i) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = base * mult;
    o.detune.value = (i - 1) * 6;
    o.connect(lp);
    o.start(t0);
    o.stop(t0 + dur);
  });
}

function vBlip(c: BaseAudioContext, b: Bus, t0: number, up: boolean) {
  const dur = 0.13;
  const f0 = 520;
  const f1 = up ? 820 : 300;
  const g = voiceOut(c, b, t0, 0.08, 0.006, dur, 0.35);
  const tri = c.createOscillator();
  tri.type = "triangle";
  tri.frequency.setValueAtTime(f0, t0);
  tri.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const sin = c.createOscillator();
  sin.type = "sine";
  sin.frequency.setValueAtTime(f0, t0);
  sin.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const sinG = c.createGain();
  sinG.gain.value = 0.5;
  tri.connect(g);
  sin.connect(sinG).connect(g);
  tri.start(t0);
  tri.stop(t0 + dur);
  sin.start(t0);
  sin.stop(t0 + dur);
}

/** Call from the first user gesture inside the player. Idempotent. */
export function initSfx(): void {
  if (ctx || typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
  bus = buildBus(ctx);
}

export function playSfx(name: SfxName): void {
  if (!ctx || !bus || isMuted()) return;
  const t = performance.now();
  if (t - (lastPlayed[name] ?? 0) < COOLDOWN_MS) return;
  lastPlayed[name] = t;

  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const t0 = ctx.currentTime;

  switch (name) {
    case "whoosh":
      return vWhoosh(ctx, bus, t0);
    case "tick":
      return vTick(ctx, bus, t0);
    case "thud":
      return vThud(ctx, bus, t0);
    case "shimmer":
      return vShimmer(ctx, bus, t0);
    case "blip-up":
      return vBlip(ctx, bus, t0, true);
    case "blip-down":
      return vBlip(ctx, bus, t0, false);
  }
}
