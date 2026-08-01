import type { ClubId } from "@/lib/snapshot";

/**
 * The four clubs, renamed and defined (build spec §09).
 *
 * OBSERVER and SPRINTER are gone. The spec is blunt about why this matters
 * more than the sorting behind it: "The names matter more than the sorting
 * logic — the algorithm is a weekend's work, the names are the product." A
 * club name a member will not screenshot is a failed club name however
 * accurate the assignment.
 *
 * OBSERVER told someone they watched. ANCHOR tells them they held. Same
 * members, same maths, opposite feeling — and only one of them gets posted.
 */
export interface DeckClub {
  name: string;
  definition: string;
  /** Four roles per club, picked by the member's second-strongest axis. */
  roles: [string, string, string, string];
  hex: string;
}

export const DECK_CLUBS: Record<ClubId, DeckClub> = {
  builder: {
    name: "BUILDER",
    definition: "You were here to make things. Everything else was secondary.",
    roles: ["Founder", "Shipper", "Finisher", "Fixer"],
    hex: "#34a853",
  },
  connector: {
    name: "CONNECTOR",
    definition: "The chapter ran on you talking to people.",
    roles: ["Host", "Recruiter", "Glue", "Signal"],
    hex: "#4285f4",
  },
  observer: {
    name: "ANCHOR",
    definition: "You were in the room. Every time. That's rarer than it sounds.",
    roles: ["Front Row", "Ever-Present", "Mainstay", "Keel"],
    hex: "#faab00",
  },
  sprinter: {
    name: "CATALYST",
    definition:
      "You arrive and things happen. Then you go quiet and it happens again.",
    roles: ["Big Week", "Comeback", "Event Season", "All-Nighter"],
    hex: "#ea4335",
  },
};

export const CLUB_ORDER: ClubId[] = ["builder", "connector", "observer", "sprinter"];

/**
 * The because-line, stating the formula in plain terms (§09).
 *
 * Mandatory, and the same principle governs every percentile in the deck: an
 * unexplained number reads as a dice roll, an explained one reads as a
 * diagnosis. "TOP 12%" means nothing until someone says what was measured.
 */
export function clubBecause(
  club: ClubId,
  checkinPct: number,
  messagePct: number
): string {
  const band = (p: number) =>
    p <= 15 ? "top 15%" : p <= 40 ? "upper half" : p <= 70 ? "mid-chapter" : "quietly present";
  const attendance = `Check-ins ${band(checkinPct)}.`;
  const voice = `Messages ${band(messagePct)}.`;
  const verdict: Record<ClubId, string> = {
    builder: "You shipped more than you showed up for. That's a Builder.",
    connector: "You talked more than you built. That's a Connector.",
    observer: "You showed up to everything and shipped nothing. That's an Anchor.",
    sprinter: "You did a year's worth in a fortnight, twice. That's a Catalyst.",
  };
  return `${attendance} ${voice} ${verdict[club]}`;
}

/** Role within the club, from the member's second axis. */
export function roleFor(club: ClubId, secondAxis: number): string {
  const roles = DECK_CLUBS[club].roles;
  return roles[Math.abs(secondAxis) % roles.length]!;
}

/** How the standing percentile is arrived at (§09). */
export const STANDING_METHOD =
  "Check-ins, messages and reads. Weighted, in that order.";
