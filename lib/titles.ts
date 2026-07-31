/**
 * Superlative titles (build spec §6.1). Every member gets one, not just the
 * loud ones.
 *
 * The whole design rests on one decision: a member is compared against people
 * LIKE THEM, not against the chapter. Ranking 500 members by extremity on a
 * shared scale collapses — perhaps 80 are genuinely active and 400 joined and
 * lurked, so all 400 tie on the same title. Stratifying first means a quiet
 * member with forty messages, a third of them after midnight, is THE NIGHT
 * SHIFT *of the quiet tier*: true, specific, and earned. Measured against the
 * core they would be invisible and would get nothing.
 *
 * Pure and data-free on purpose, the same as lib/magic-send.ts and
 * lib/send-list.ts: this decides what 500 people get called in front of their
 * chapter, so it should be provable at a desk without a database.
 */

// ---------------------------------------------------------------- primitives

/**
 * What a word talks about. A compound whose halves sit on one axis says the
 * same thing twice (THE UNDEFEATED COMPLETIONIST), so the pairing is rejected
 * before anyone has to notice it by eye.
 */
export type Axis = "time" | "voice" | "presence" | "output" | "consumption";

/**
 * Whether a word describes doing something or having something happen to you.
 * The axis rule alone does NOT catch THE RETURNING READER — presence and
 * consumption are different axes, so it passes — yet the spec names it as a
 * failure, and correctly: both halves are passive, so there is no tension and
 * the two words just sit next to each other. `neutral` covers words that only
 * say WHEN, which contradict nothing and pair with anything.
 */
export type Register = "active" | "passive" | "neutral";

export interface Primitive {
  axis: Axis;
  register: Register;
}

export const MODIFIERS = {
  QUIET: { axis: "voice", register: "passive" },
  RELENTLESS: { axis: "voice", register: "active" },
  LATE: { axis: "time", register: "neutral" },
  EARLY: { axis: "time", register: "neutral" },
  WEEKEND: { axis: "time", register: "neutral" },
  PATIENT: { axis: "time", register: "passive" },
  SUDDEN: { axis: "time", register: "neutral" },
  OCCASIONAL: { axis: "presence", register: "passive" },
  UNDEFEATED: { axis: "presence", register: "active" },
  RETURNING: { axis: "presence", register: "passive" },
} as const satisfies Record<string, Primitive>;

export const NOUNS = {
  ARCHIVIST: { axis: "output", register: "active" },
  BUILDER: { axis: "output", register: "active" },
  RECRUITER: { axis: "output", register: "active" },
  ESSAYIST: { axis: "voice", register: "active" },
  OPENER: { axis: "voice", register: "active" },
  CLOSER: { axis: "voice", register: "active" },
  REACTOR: { axis: "voice", register: "active" },
  COMPLETIONIST: { axis: "presence", register: "active" },
  ANCHOR: { axis: "presence", register: "active" },
  SPARK: { axis: "presence", register: "active" },
  REGULAR: { axis: "presence", register: "passive" },
  READER: { axis: "consumption", register: "passive" },
  PLAYER: { axis: "consumption", register: "passive" },
  WITNESS: { axis: "consumption", register: "passive" },
} as const satisfies Record<string, Primitive>;

export type Modifier = keyof typeof MODIFIERS;
export type Noun = keyof typeof NOUNS;

/**
 * Whether a compound is even allowed to be considered. Two rules, both
 * mechanical:
 *
 *  1. Different axes — or the compound says one thing twice.
 *  2. Not both passive — or there is nothing for the two halves to argue
 *     about, which is what makes THE QUIET ARCHIVIST work and THE RETURNING
 *     READER fall flat.
 *
 * This is a gate, not a shipping decision. Passing it only means a human is
 * allowed to look at the pairing; ALLOWED below is what actually ships.
 */
export function isLegal(modifier: Modifier, noun: Noun): boolean {
  const m = MODIFIERS[modifier];
  const n = NOUNS[noun];
  if (m.axis === n.axis) return false;
  if (m.register === "passive" && n.register === "passive") return false;
  return true;
}

/** Every pairing the rules permit. Useful for auditing the curated list. */
export function legalCompounds(): string[] {
  const out: string[] = [];
  for (const m of Object.keys(MODIFIERS) as Modifier[]) {
    for (const n of Object.keys(NOUNS) as Noun[]) {
      if (isLegal(m, n)) out.push(`${m} ${n}`);
    }
  }
  return out;
}

/**
 * The compounds that actually ship. Deliberately a fraction of what the rules
 * permit, because a legality gate cannot tell you whether you would say a
 * thing to someone's face in front of the chapter, and that is the only test
 * that matters here. Anything not on this list degrades to its bare noun,
 * which keeps compounds rare enough to be worth having.
 */
export const ALLOWED: ReadonlySet<string> = new Set([
  "QUIET ARCHIVIST",
  "LATE OPENER",
  "WEEKEND REACTOR",
  "PATIENT RECRUITER",
  "SUDDEN BUILDER",
  "QUIET BUILDER",
  "LATE ESSAYIST",
  "EARLY OPENER",
  "RELENTLESS ARCHIVIST",
  "UNDEFEATED WITNESS",
  "WEEKEND BUILDER",
  "OCCASIONAL BUILDER",
  "SUDDEN SPARK",
  "QUIET ANCHOR",
  "PATIENT ANCHOR",
  "RETURNING BUILDER",
  "LATE REACTOR",
  "EARLY ANCHOR",
  "RELENTLESS RECRUITER",
]);

// --------------------------------------------------------------- dimensions

/**
 * A thing we can measure, and the word it argues for. The noun is what the
 * dimension is called when it is a member's strongest trait; the modifier is
 * how it colours someone else's strongest trait.
 *
 * `evidence` is not decoration. A title whose because-line does not state the
 * metric that produced it is a claim the data has not earned, and that is the
 * only real failure mode this system has.
 */
export interface Dimension {
  id: string;
  noun: Noun;
  modifier?: Modifier;
  /** Plain-language statement of what was measured, for the because-line. */
  evidence: (rank: string) => string;
}

export const DIMENSIONS: Dimension[] = [
  { id: "messages", noun: "ESSAYIST", modifier: "RELENTLESS", evidence: (r) => `Messages sent: ${r}.` },
  { id: "afterMidnight", noun: "WITNESS", modifier: "LATE", evidence: (r) => `Messages after midnight: ${r}.` },
  { id: "beforeNine", noun: "OPENER", modifier: "EARLY", evidence: (r) => `Messages before 9am: ${r}.` },
  { id: "weekend", noun: "REACTOR", modifier: "WEEKEND", evidence: (r) => `Weekend messages: ${r}.` },
  { id: "conversationStarts", noun: "SPARK", evidence: (r) => `Conversations restarted after silence: ${r}.` },
  { id: "replies", noun: "REACTOR", evidence: (r) => `Replies within a minute: ${r}.` },
  { id: "checkins", noun: "REGULAR", modifier: "UNDEFEATED", evidence: (r) => `Events attended: ${r}.` },
  { id: "attendanceRate", noun: "COMPLETIONIST", modifier: "UNDEFEATED", evidence: (r) => `Turned up to ${r} of what you signed up for.` },
  { id: "spread", noun: "ANCHOR", modifier: "PATIENT", evidence: (r) => `Months with activity: ${r}.` },
  { id: "gaps", noun: "REGULAR", modifier: "RETURNING", evidence: (r) => `Came back after the longest quiet stretch in the chapter: ${r}.` },
  { id: "burst", noun: "SPARK", modifier: "SUDDEN", evidence: (r) => `Busiest single day: ${r}.` },
  { id: "reads", noun: "READER", modifier: "QUIET", evidence: (r) => `RADAR issues read: ${r}.` },
  { id: "plays", noun: "PLAYER", modifier: "OCCASIONAL", evidence: (r) => `Games played: ${r}.` },
  { id: "crew", noun: "BUILDER", evidence: (r) => `Products you have your name on: ${r}.` },
  { id: "referrals", noun: "RECRUITER", modifier: "PATIENT", evidence: (r) => `Members who joined after you brought them: ${r}.` },
  { id: "archive", noun: "ARCHIVIST", modifier: "QUIET", evidence: (r) => `Links and files shared: ${r}.` },
];

const BY_ID = new Map(DIMENSIONS.map((d) => [d.id, d]));

// ------------------------------------------------------------------ tiering

export type Tier = "A" | "B" | "C";

export const TIER_LABEL: Record<Tier, string> = {
  A: "the core",
  B: "the regulars",
  C: "the quiet",
};

/**
 * Tier from a member's overall engagement percentile, where 1 is the most
 * engaged. Top 15% is the core, the next 35% the regulars, the rest the quiet.
 */
export function tierFor(engagementPercentile: number): Tier {
  if (engagementPercentile <= 15) return "A";
  if (engagementPercentile <= 50) return "B";
  return "C";
}

/** Population mean and standard deviation, for scoring within a tier. */
export function meanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Standard score of one value against its own tier. A tier where everybody
 * scored the same has no spread to speak of, so nobody stands out in it and
 * every z is zero — which is correct, and is what sends those members to the
 * floor title rather than to a superlative the data cannot support.
 */
export function zScore(value: number, population: number[]): number {
  const { mean, std } = meanStd(population);
  if (std === 0) return 0;
  return (value - mean) / std;
}

// ---------------------------------------------------------------- assignment

/** Below this, a member is not exceptional at anything and gets the floor. */
export const Z_FLOOR = 1.0;

export interface TitleResult {
  /** The full display string, e.g. "THE QUIET ARCHIVIST". */
  title: string;
  /** Why they got it, stating the metric. Never empty. */
  because: string;
  /** How it was reached — for the audit sheet, not for members. */
  kind: "compound" | "noun" | "floor";
  dimensions: string[];
}

export const FLOOR_TITLE = "THE CONSTANT";
export const FLOOR_BECAUSE =
  "Dead centre of the chapter on every measure. Someone has to hold the middle.";

export interface AssignOptions {
  /** z-score per dimension id, already computed against the member's tier. */
  z: Record<string, number>;
  /** Human-readable rank per dimension id, e.g. "top 4% of the regulars". */
  ranks?: Record<string, string>;
  tier?: Tier;
}

/**
 * Pick a member's title.
 *
 * Highest |z| names them — that is the trait they are most unusual for. The
 * second-highest colours it, and only if the resulting compound is one we have
 * agreed to say out loud. Everything else falls back to the bare noun, which
 * was always shippable on its own, so the degradation is invisible to the
 * member rather than obviously a fallback.
 */
export function assignTitle({ z, ranks = {}, tier }: AssignOptions): TitleResult {
  const scored = Object.entries(z)
    .filter(([id]) => BY_ID.has(id))
    .map(([id, value]) => ({ dim: BY_ID.get(id)!, z: value, abs: Math.abs(value) }))
    // Ties break on dimension order, so the same input always gives the same
    // title. A member whose title changed between two runs of the pipeline
    // would have no way to read that as anything but the system guessing.
    .sort((a, b) => b.abs - a.abs || DIMENSIONS.indexOf(a.dim) - DIMENSIONS.indexOf(b.dim));

  const top = scored[0];
  if (!top || top.abs < Z_FLOOR) {
    return {
      title: FLOOR_TITLE,
      because: FLOOR_BECAUSE,
      kind: "floor",
      dimensions: [],
    };
  }

  const rankOf = (id: string) => ranks[id] ?? "above your tier's average";
  const noun = top.dim.noun;
  const parts = [top.dim.evidence(rankOf(top.dim.id))];

  // The colouring dimension must be a genuinely separate trait: a dimension
  // that shares the headline noun would produce a because-line arguing the
  // same point twice.
  const second = scored
    .slice(1)
    .find((s) => s.abs >= Z_FLOOR && s.dim.modifier && s.dim.noun !== noun);

  if (second?.dim.modifier) {
    const modifier = second.dim.modifier;
    const compound = `${modifier} ${noun}`;
    if (isLegal(modifier, noun) && ALLOWED.has(compound)) {
      parts.push(second.dim.evidence(rankOf(second.dim.id)));
      if (tier) parts.push(`Measured against ${TIER_LABEL[tier]}.`);
      return {
        title: `THE ${compound}`,
        because: parts.join(" "),
        kind: "compound",
        dimensions: [top.dim.id, second.dim.id],
      };
    }
  }

  if (tier) parts.push(`Measured against ${TIER_LABEL[tier]}.`);
  return {
    title: `THE ${noun}`,
    because: parts.join(" "),
    kind: "noun",
    dimensions: [top.dim.id],
  };
}
