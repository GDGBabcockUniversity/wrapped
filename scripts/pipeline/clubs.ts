import type { ClubId } from "@/lib/snapshot";
import { pct } from "./percentiles";
import type { PipelineMember } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const BURST_WINDOW_DAYS = 30;
const REBALANCE_FLOOR = 0.08;
const CLUB_PRIORITY: ClubId[] = ["sprinter", "builder", "connector", "observer"];

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function eligibleMonths(joinDate: Date, yearStart: Date, yearEnd: Date): number {
  const start = joinDate > yearStart ? joinDate : yearStart;
  const months =
    (yearEnd.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (yearEnd.getUTCMonth() - start.getUTCMonth());
  return Math.max(1, months);
}

function activeMonthsFor(m: PipelineMember): number {
  const months = new Set<string>();
  for (const [mo, c] of Object.entries(m.checkinMonthlyCounts)) if (c >= 1) months.add(mo);
  for (const [mo, c] of Object.entries(m.messageMonthlyCounts)) if (c >= 5) months.add(mo);
  return months.size;
}

/** Max 30-day-window share of a member's total activity (10*checkins + messages). */
function burstFor(m: PipelineMember, yearStart: Date, yearEnd: Date): number {
  const totalDays = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / DAY_MS);
  const daily = new Array<number>(totalDays).fill(0);

  for (const [dayKey, count] of Object.entries(m.checkinDailyCounts)) {
    const idx = Math.floor((new Date(dayKey).getTime() - yearStart.getTime()) / DAY_MS);
    if (idx >= 0 && idx < totalDays) daily[idx]! += 10 * count;
  }
  for (const [dayKey, count] of Object.entries(m.messageDailyCounts)) {
    const idx = Math.floor((new Date(dayKey).getTime() - yearStart.getTime()) / DAY_MS);
    if (idx >= 0 && idx < totalDays) daily[idx]! += count;
  }

  const total = daily.reduce((a, b) => a + b, 0);
  if (total < 20) return 0;

  let windowSum = 0;
  for (let i = 0; i < Math.min(BURST_WINDOW_DAYS, totalDays); i++) windowSum += daily[i]!;
  let maxWindow = windowSum;
  for (let i = BURST_WINDOW_DAYS; i < totalDays; i++) {
    windowSum += daily[i]! - daily[i - BURST_WINDOW_DAYS]!;
    if (windowSum > maxWindow) maxWindow = windowSum;
  }
  return maxWindow / total;
}

export interface ClubAssignment {
  userId: string;
  club: ClubId;
  scores: Record<ClubId, number>;
  /** True iff the member has zero raw checkins and zero raw messages. Pinned
   * against rebalance — the "never shame" rule (§7/§15) outranks the club
   * population floor, so a genuinely inactive member can never be forced
   * out of Observer into a club whose stats they don't have. */
  isZeroActivity: boolean;
}

export function assignClubs(
  members: PipelineMember[],
  yearStart: Date,
  yearEnd: Date
): Map<string, ClubAssignment> {
  const checkinsArr = members.map((m) => m.checkins);
  const registrationsArr = members.map((m) => m.registrations);
  const radarArr = members.map((m) => m.radarSignal);
  const logMessagesArr = members
    .filter((m) => m.messagesMatched)
    .map((m) => Math.log1p(m.messageCount));

  const derived = members.map((m) => {
    const Pc = pct(checkinsArr, m.checkins);
    const Pr = pct(registrationsArr, m.registrations);
    const Prad = pct(radarArr, m.radarSignal);
    const Pm = m.messagesMatched ? pct(logMessagesArr, Math.log1p(m.messageCount)) : null;
    const attendance = m.checkins / Math.max(m.registrations, m.checkins, 1);
    const consistency = activeMonthsFor(m) / eligibleMonths(m.joinDate, yearStart, yearEnd);
    const totalActivity = 10 * m.checkins + m.messageCount;
    const burst = burstFor(m, yearStart, yearEnd);

    const scores: Record<ClubId, number> = {
      builder: 0.45 * Pc + 0.2 * attendance + 0.2 * Prad + 0.15 * consistency,
      connector: Pm === null ? 0 : 0.55 * Pm + 0.25 * consistency + 0.2 * Pc,
      sprinter: totalActivity < 20 ? 0 : 0.65 * burst + 0.35 * Math.max(Pc, Pm ?? 0),
      observer: 0.4 * (1 - (Pm ?? 0.5)) + 0.35 * Pr + 0.25 * (1 - burst),
    };

    return { userId: m.userId, scores, isZeroActivity: m.checkins === 0 && m.messageCount === 0 };
  });

  const assignments = new Map<string, ClubAssignment>();
  for (const d of derived) {
    assignments.set(d.userId, {
      userId: d.userId,
      club: pickClub(d.scores),
      scores: d.scores,
      isZeroActivity: d.isZeroActivity,
    });
  }

  rebalance(assignments, members.length);
  return assignments;
}

/**
 * Argmax over CLUB_PRIORITY order (sprinter > builder > connector > observer)
 * — ties keep whichever club was reached first, since we only replace the
 * running best on a STRICT improvement.
 */
export function pickClub(scores: Record<ClubId, number>): ClubId {
  let best: ClubId = "observer";
  let bestScore = -Infinity;
  for (const club of CLUB_PRIORITY) {
    const score = scores[club];
    if (score > bestScore) {
      bestScore = score;
      best = club;
    }
  }
  return best;
}

function rebalance(assignments: Map<string, ClubAssignment>, total: number) {
  const floor = Math.ceil(REBALANCE_FLOOR * total);
  let guard = 0;

  while (guard++ < 100) {
    const counts: Record<ClubId, number> = { builder: 0, connector: 0, observer: 0, sprinter: 0 };
    for (const a of assignments.values()) counts[a.club]++;

    const starved = (Object.keys(counts) as ClubId[]).find((c) => counts[c] < floor);
    if (!starved) return;

    // Move the member (from a non-starved club) whose winning margin over the
    // starved club is smallest — the one who "almost" belonged there anyway.
    let candidate: ClubAssignment | null = null;
    let smallestMargin = Infinity;
    for (const a of assignments.values()) {
      if (a.club === starved) continue;
      if (a.isZeroActivity) continue; // never rebalance a zero-activity member out of Observer
      if (counts[a.club] <= floor) continue; // don't starve another club to fix this one
      const margin = a.scores[a.club] - a.scores[starved];
      if (margin < smallestMargin) {
        smallestMargin = margin;
        candidate = a;
      }
    }
    if (!candidate) return; // no safe move available — accept the shortfall
    candidate.club = starved;
  }
}

export function rarityPercentages(assignments: Map<string, ClubAssignment>): Record<ClubId, number> {
  const counts: Record<ClubId, number> = { builder: 0, connector: 0, observer: 0, sprinter: 0 };
  for (const a of assignments.values()) counts[a.club]++;
  const total = assignments.size || 1;
  const result = {} as Record<ClubId, number>;
  for (const club of Object.keys(counts) as ClubId[]) {
    result[club] = Math.max(1, Math.round((100 * counts[club]) / total));
  }
  return result;
}

export { monthKey };
