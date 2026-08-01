import type { Snapshot } from "@/lib/snapshot";
import { CHAPTER, GROUP_CHAT, MOMENTS, PRODUCT_SAGA } from "@/lib/content/chapter";
import { fmt } from "@/lib/copy";

/**
 * Copy for the twelve-beat deck (build spec §5), resolved against a member's
 * snapshot.
 *
 * The house voice, in one line: specific noun, then a short second sentence
 * that undercuts or names rather than restates. The numbers brag; the copy
 * stays deadpan. Person is fixed per screen — second person for personal
 * beats, first-person plural for org ones, never both in a frame.
 *
 * Every function returns null when its data is missing, and a null beat is
 * skipped rather than rendered empty. A caption over a blank frame inverts the
 * exact feeling the deck exists for.
 */

export interface Line {
  /** Small tracked label above the main line. */
  kicker?: string;
  /** The line itself. */
  text: string;
  /** A big number rendered above the text. */
  stat?: string;
  /** Rendered smaller, beneath. */
  sub?: string;
}

const n = (v: number) => v.toLocaleString("en-US");

// ------------------------------------------------------------------ eras

export const ERAS = [
  { until: "2025-09-01", name: "THE FOUNDING WAVE" },
  { until: "2025-12-01", name: "THE INFO SESSION CLASS" },
  { until: "2026-03-01", name: "THE DEVFEST INTAKE" },
  { until: "2026-05-01", name: "THE ORBIT CLASS" },
  { until: "9999-12-31", name: "THE NEW BLOOD" },
] as const;

/** One join date, five buckets. Turns a date into lore for nothing. */
export function eraFor(joinDate: string): string {
  for (const era of ERAS) if (joinDate < era.until) return era.name;
  return ERAS[ERAS.length - 1]!.name;
}

/** The first thing that shipped after they joined — cheap, and it converts a
    join date into a place in the story. */
const MILESTONES = [
  { at: "2025-10-01", name: "RADAR" },
  { at: "2026-01-15", name: "BABCOCKVOTES" },
  { at: "2026-03-01", name: "ORBIT" },
  { at: "2026-05-01", name: "BABCOCK 100" },
] as const;

export function milestoneAfter(joinDate: string): string | null {
  return MILESTONES.find((m) => m.at > joinDate)?.name ?? null;
}

// ------------------------------------------------------------------ beats

export function coldOpen(): Line[] {
  return [
    { text: "" }, // brand mark holds through the first vocal phrase
    { text: "We kept receipts on the whole year." },
    { text: "Including yours." },
    { text: "Let's start there." },
  ];
}

export function arrival(s: Snapshot | null): Line[] {
  if (!s) {
    return [
      { text: "Some people take years to find their people." },
      { text: "This one is about the people who did." },
    ];
  }
  const milestone = milestoneAfter(s.joinDate);
  if (s.isNewMember || !milestone) {
    return [
      { text: "Some people take years to find their people." },
      { text: `You found us in ${s.joinMonthLabel}.` },
      { text: "Late to the year. Right on time for what's next." },
      { kicker: "YOU ARE", text: eraFor(s.joinDate) },
    ];
  }
  return [
    { text: "You've been here longer than you think." },
    { text: `Since ${s.joinMonthLabel}.` },
    { text: `That's before ${milestone} existed.` },
    { kicker: "YOU ARE", text: eraFor(s.joinDate) },
  ];
}

/** Org receipts, accelerating, then the handoff to a personal number. */
export function theYear(s: Snapshot | null): Line[] {
  const snaps: Line[] = [
    { stat: n(CHAPTER.eventsRun), text: "EVENTS RUN" },
    { stat: `${n(CHAPTER.members)}+`, text: "MEMBERS" },
    { stat: n(CHAPTER.productsShipped), text: "PRODUCTS SHIPPED" },
    { stat: n(CHAPTER.totalCheckins), text: "CHECK-INS LOGGED" },
    { stat: n(CHAPTER.messagesParsed), text: "MESSAGES SENT" },
  ];
  // The braid: an org montage never ends on an org number.
  snaps.push(
    s && s.events.checkins > 0
      ? { text: `And you were in ${s.events.checkins} of those rooms.` }
      : { text: `Every one of those rooms was open to you.` }
  );
  return snaps;
}

export function built(s: Snapshot | null): Line[] {
  const beats: Line[] = [
    { text: "Talk is cheap.", sub: "We ship." },
    { stat: String(PRODUCT_SAGA.votes.elections.value), text: "ELECTIONS RUN" },
    { stat: n(Number(PRODUCT_SAGA.votes.votesCast.value)), text: "VOTES CAST" },
    { stat: String(PRODUCT_SAGA.orbit.tickets.value), text: "ORBIT TICKETS ISSUED" },
    { stat: String(PRODUCT_SAGA.babcock100.value), text: "BABCOCK 100 NOMINATIONS" },
  ];
  // The snapshot counts READS, not distinct issues — a member who opened one
  // issue six times has six reads. "You read 41 of the 7 issues" is what
  // conflating them produces, so the line says what the number actually is.
  const reads = s?.radar?.reads ?? 0;
  beats.push(
    reads > 0
      ? { text: `You opened RADAR ${n(reads)} times.`, sub: "Seven issues went out. You kept coming back." }
      : {
          text: "RADAR published 7 issues this year. You read none of them.",
          sub: "We're not upset. We're going to keep mentioning it.",
        }
  );
  return beats;
}

export function moments(s: Snapshot | null): Line[] {
  const attended = new Set((s?.events.titles ?? []).map((t) => t.toLowerCase()));
  const cards = MOMENTS.filter((m) => m.images.length > 0).slice(0, 5);
  const lines: Line[] = [{ text: "Some nights you had to be there." }];
  for (const m of cards) {
    const here = [...attended].some((t) => t.includes(m.id.replace("-", " ")) || m.title.toLowerCase().includes(t));
    lines.push({ kicker: here ? "YOU WERE HERE" : undefined, text: m.title, sub: m.caption });
  }
  const c = s?.events.checkins ?? 0;
  const r = s?.events.registrations ?? 0;
  lines.push(
    c === 0
      ? { text: "You missed all of them.", sub: "We'll allow it. Once." }
      : c >= r && r > 0
        ? { text: `You made every single one you signed up for.`, sub: "Suspicious." }
        : { text: `You made ${c} of these.`, sub: `Out of ${r} you signed up for.` }
  );
  return lines;
}

export function groupChat(s: Snapshot | null): Line[] {
  const lines: Line[] = [
    { text: "We need to talk about the group chat." },
    { stat: n(GROUP_CHAT.messages), text: "MESSAGES SENT" },
    {
      stat: GROUP_CHAT.peakHourLabel,
      text: "PEAK HOUR",
      sub: `${n(GROUP_CHAT.afterMidnight)} after midnight. Sleep is a suggestion.`,
    },
    { kicker: "THE LOUDEST AMONG US", text: GROUP_CHAT.topYappers.map((y) => y.name).join(" · ") },
  ];
  const sent = s?.messages.matched ? s.messages.count : 0;
  lines.push(
    sent > 0
      ? { text: `You sent ${n(sent)}.` }
      : { text: "You kept your thoughts to yourself.", sub: "Also a strategy." }
  );
  return lines;
}

export function loudestDay(s: Snapshot | null): Line[] | null {
  if (!s?.messages.matched || s.messages.count === 0) return null;
  // TODO(pipeline): per-member daily max joined to the events table. Until
  // that lands this uses the chapter's own loudest day, which is honest about
  // being the chapter's rather than claiming to be theirs.
  return [
    { text: "Everyone has one day the chat remembers." },
    { text: GROUP_CHAT.busiestDay.label },
    { text: GROUP_CHAT.busiestDay.line },
    { stat: n(GROUP_CHAT.busiestDay.count), text: "MESSAGES IN ONE DAY" },
    { text: "Nobody was okay that night." },
  ];
}

export function rooms(s: Snapshot | null): Line[] | null {
  if (!s || s.events.checkins === 0) return null;
  // TODO(pipeline): the co-attendance graph. The check-in rows carry
  // user_id and event, so this is derivable; it is not yet derived.
  return [
    { text: "You didn't do this alone." },
    { stat: String(s.events.checkins), text: "ROOMS YOU WERE IN" },
    { text: s.events.firstEventTitle ? `It started at ${s.events.firstEventTitle}.` : "It started somewhere." },
  ];
}

export function club(s: Snapshot | null) {
  const CLUBS = {
    builder: { name: "BUILDER", definition: "You were here to make things. Everything else was secondary." },
    connector: { name: "CONNECTOR", definition: "The chapter ran on you talking to people." },
    observer: { name: "ANCHOR", definition: "You were in the room. Every time. That's rarer than it sounds." },
    sprinter: { name: "CATALYST", definition: "You arrive and things happen. Then you go quiet and it happens again." },
  } as const;
  if (!s) return null;
  const c = CLUBS[s.club.id];
  return {
    setup: "We sorted the whole chapter four ways.",
    setupSub: "By how you split your time between showing up, speaking up, and building.",
    options: Object.values(CLUBS).map((x) => x.name),
    answer: c.name,
    definition: c.definition,
    rarity: `${s.club.rarityPct}% of the chapter.`,
  };
}

export const CREDITS: { section: string; line: string }[] = [
  { section: "CORE", line: "They held the thing together." },
  { section: "SOFTWARE", line: "Built the foundation." },
  { section: "DATA", line: "Found the patterns." },
  { section: "INFRASTRUCTURE", line: "Kept the lights on." },
  { section: "DESIGN", line: "Made it beautiful." },
  { section: "DEV", line: "Shipped the products." },
  { section: "PHOTO", line: "Caught every moment." },
  { section: "CONTENT", line: "Made the feed worth scrolling." },
  { section: "FLYERS", line: "Every flyer you saved. Them." },
  { section: "VIDEO", line: "Cut the year into highlights." },
  { section: "RADAR", line: "The newsroom that never slept." },
  { section: "EVENTS", line: "And the hands that made it happen." },
  { section: "SPONSORS", line: "The ones who put money behind a student club." },
  { section: "ADVISORS", line: "Two people said yes before there was anything to say yes to." },
  { section: "MVPS", line: "Did the work nobody assigned them." },
  { section: "DESIGN FORCE", line: "Every screen you just scrolled through. Them." },
  { section: "", line: "…and everyone who showed up." },
];

export function handover(s: Snapshot | null): Line[] {
  if (!s) {
    return [
      { text: "Four hundred people have a card. You don't." , sub: "Yet."},
      { text: "Next year this screen is about you." },
    ];
  }
  // TODO(data): nothing in the pipeline knows who is graduating, so everybody
  // gets the returning branch. Guessing from tenure would put the wrong line
  // in front of the people this beat exists for.
  return [
    { text: "New leadership starts now." },
    { text: "Same chat. Same seat." },
    { text: "See you in September." },
  ];
}

export { fmt };
