"use client";

/**
 * ONE AudioContext for the whole app (2026-07-20). The music engine
 * (lib/audio.ts) and the synthesized SFX (lib/sfx.ts) used to live in
 * separate worlds: sfx built its own context while the soundtrack played
 * through a bare HTMLAudioElement. On iOS that combination is a known
 * silence bug — creating a WebAudio context sets the page's audio session,
 * and a detached media element started around the same gesture can end up
 * routed nowhere. Sharing one context (and routing the media element into
 * it, see lib/audio.ts) keeps every sound on one graph.
 *
 * Both callers must go through ensureAudioContext() from inside a user
 * gesture — it creates the context on first call and resumes it every time,
 * since browsers can suspend it again at any point (tab hide, iOS call).
 */

let ctx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** The context if one already exists — never creates. */
export function getAudioContext(): AudioContext | null {
  return ctx;
}
