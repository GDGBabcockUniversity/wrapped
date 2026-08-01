/**
 * What each beat SHOWS, as opposed to how long it gets (build spec §5).
 *
 * The two failure modes this exists to prevent are the two I shipped in turn.
 * Setting the spec's short durations while the components still tried to
 * render their full sequences truncated them — the credits reached 41% of the
 * roster and stopped. Giving them their full scripted length instead brought
 * the content back and took the deck to 5:42, which is the old deck with a
 * new running order rather than the re-cut the spec asked for.
 *
 * Neither is what the spec says. §5 shortens the durations AND cuts the
 * content in the same breath: "Five cards maximum" for the moments, "Four
 * beats" for the group chat with stickers, dialect, vocabulary, streaks and
 * subgroups explicitly out, no guess game in built. The durations were only
 * ever right alongside these cuts.
 *
 * So the components keep every bit of their craft — the polaroids, the
 * receipt, the chapter cards, the faces — and render a shorter sequence of it.
 * Cut by dropping content on purpose. Never by ending a beat early.
 */

/**
 * Sequence keys each beat keeps, in the component's own order. `null` means
 * no cut: run everything.
 */
export interface Cut {
  /** Maximum items from the component's sequence. */
  limit?: number;
  /** Specific keys to keep, when the choice matters more than the count. */
  keep?: string[];
}

/**
 * The moments spread: eleven pages down to five (§5). One page per event,
 * choosing the events with photographs actually on disk and the widest
 * spread of treatments — a polaroid, a filmstrip, a postcard with a stat.
 */
export const MOMENTS_KEEP = [
  "meetups-1",   // filmstrip, the rhythm underneath the year
  "games-1",     // postcard with the loudest-night stat
  "devfest-1",   // polaroid, the continent's biggest
  "orbit-1",     // polaroid, the flagship
  "orbit-3",     // postcard, tickets issued — closes on a number
];

/**
 * The group chat: thirteen beats down to four (§5) — total messages, peak
 * hour and after-midnight, the loudest five, who restarts the chat. Everything
 * else the export offers is good and stays out, because a montage dies at
 * beat six and this chapter can eat the whole runtime.
 */
export const GROUP_CHAT_KEEP = 4;

/**
 * What we built: the saga's strongest run rather than all of it. Every
 * product keeps a number; the intermediate line beats and the second half of
 * the ORBIT stat run come out.
 */
export const BUILT_LIMIT = 12;

/**
 * The credits keep the people. This is the one place the spec's own cut — a
 * sixteen-bar roll of seventeen section lines — costs more than it saves,
 * because the faces ARE the beat. The chapters stay; the sponsor wall and the
 * closer arc come out, since those are the parts a member scrolls past.
 */
export const PEOPLE_LIMIT = 12;
