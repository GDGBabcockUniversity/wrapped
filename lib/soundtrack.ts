import type { StoryId } from "@/lib/stories";

/**
 * One loop per story (owner, 2026-07-31). Each chapter carries its own short
 * piece of music that loops for as long as the chapter is on screen; the
 * engine (lib/audio.ts) crossfades between them at the boundary.
 *
 * EDIT THIS FILE ONLY. Drop an MP3 in public/audio/stories/ and uncomment the
 * matching line. Entries left out fall through to the shared loop below, so a
 * half-filled map is always safe to ship: chapters with their own loop get it,
 * the rest keep playing the shared bed without a restart or a gap.
 *
 * Two things worth knowing when cutting the files:
 *
 *  - They loop, so the end has to meet the start. A bar that resolves and
 *    stops will thud once a minute. Keep them short — 15 to 30 seconds is
 *    plenty, since most chapters are on screen for under a minute and the
 *    long ones (moments, built, people) are meant to sit under a bed, not
 *    play a whole song.
 *  - Only the NEXT chapter's file is fetched ahead (lib/audio.ts), so weight
 *    matters. The shared loop is 4MB, which is far more than a loop needs;
 *    aim for a few hundred KB each.
 */
export const FALLBACK_TRACK = "/audio/loop.mp3";

export const SOUNDTRACK: Partial<Record<StoryId, string>> = {
  // "the-year": "/audio/stories/the-year.mp3",
  // moments: "/audio/stories/moments.mp3",
  // built: "/audio/stories/built.mp3",
  // "group-chat": "/audio/stories/group-chat.mp3",
  // people: "/audio/stories/people.mp3",
  // "your-events": "/audio/stories/your-events.mp3",
  // "your-radar": "/audio/stories/your-radar.mp3",
  // standing: "/audio/stories/standing.mp3",
  // "your-chapter": "/audio/stories/your-chapter.mp3",
  // "your-club": "/audio/stories/your-club.mp3",
  // "whats-next": "/audio/stories/whats-next.mp3",
  // summary: "/audio/stories/summary.mp3",
};

/** The loop a story plays, which is the shared one until its own file lands. */
export function trackFor(storyId: StoryId): string {
  return SOUNDTRACK[storyId] ?? FALLBACK_TRACK;
}
