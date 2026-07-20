import type { StoryId } from "@/lib/stories";

/**
 * One song per story (owner decision, 2026-07-20). EDIT THIS FILE ONLY:
 * drop your MP3s in public/audio/stories/ and point each story at its
 * file — e.g. `"the-year": "/audio/stories/the-year.mp3"`.
 *
 * Every entry currently points at the shared test loop so the whole
 * experience has sound TODAY. The audio engine (lib/audio.ts) crossfades
 * between tracks on story change, and any missing/404 file silently falls
 * back to FALLBACK_TRACK — so a half-filled map is always safe to ship.
 */
export const FALLBACK_TRACK = "/audio/loop.mp3";

export const SOUNDTRACK: Record<StoryId, string> = {
  "the-year": "/audio/loop.mp3", // placeholder → /audio/stories/the-year.mp3
  moments: "/audio/loop.mp3", // placeholder → /audio/stories/moments.mp3
  built: "/audio/loop.mp3", // placeholder → /audio/stories/built.mp3
  "group-chat": "/audio/loop.mp3", // placeholder → /audio/stories/group-chat.mp3
  people: "/audio/loop.mp3", // placeholder → /audio/stories/people.mp3
  "your-events": "/audio/loop.mp3", // placeholder → /audio/stories/your-events.mp3
  standing: "/audio/loop.mp3", // placeholder → /audio/stories/standing.mp3
  "your-chapter": "/audio/loop.mp3", // placeholder → /audio/stories/your-chapter.mp3
  "your-club": "/audio/loop.mp3", // placeholder → /audio/stories/your-club.mp3
  "whats-next": "/audio/loop.mp3", // placeholder → /audio/stories/whats-next.mp3
  summary: "/audio/loop.mp3", // placeholder → /audio/stories/summary.mp3
};
