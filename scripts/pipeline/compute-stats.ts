import type { MatchResult } from "./match-members";
import type { Universe } from "./universe";
import type { PipelineMember } from "./types";
import { activityScore, computePercentiles, tierFromPercentile } from "./percentiles";
import { assignClubs, rarityPercentages } from "./clubs";
import { SnapshotSchema, type Snapshot, type ChapterMeta } from "@/lib/snapshot";

const NEW_MEMBER_CUTOFF = new Date("2026-03-01T00:00:00Z");

export function buildPipelineMembers(universe: Universe, matchResult: MatchResult): PipelineMember[] {
  return universe.members.map((m): PipelineMember => {
    const activity = universe.activity.get(m.email);
    const match = matchResult.matched.get(m.email);
    return {
      userId: m.userId,
      email: m.email,
      fullName: m.fullName,
      joinDate: m.joinDate,
      checkins: activity?.checkins ?? 0,
      registrations: activity?.registrations ?? 0,
      eventTitles: activity?.titles ?? [],
      checkinMonthlyCounts: activity?.checkinMonthlyCounts ?? {},
      checkinDailyCounts: activity?.checkinDailyCounts ?? {},
      radarSignal: activity?.radarSignal ?? 0,
      messagesMatched: !!match,
      messageCount: match?.messageCount ?? 0,
      messageMonthlyCounts: match?.monthlyCounts ?? {},
      messageDailyCounts: match?.dailyCounts ?? {},
      messageActiveDays: match ? Object.keys(match.dailyCounts).length : 0,
    };
  });
}

function peakMonthLabel(monthlyCounts: Record<string, number>): string | null {
  const entries = Object.entries(monthlyCounts);
  if (entries.length === 0) return null;
  const totalMessages = entries.reduce((sum, [, c]) => sum + c, 0);
  if (totalMessages < 10) return null;
  const [bestMonth] = entries.sort((a, b) => b[1] - a[1])[0]!;
  const [y, m] = bestMonth.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

export interface ComputeResult {
  snapshots: Map<string, Snapshot>; // email -> Snapshot
  chapterMeta: ChapterMeta;
}

export function computeSnapshots(
  members: PipelineMember[],
  eventsRun: number,
  yearStart: Date,
  yearEnd: Date,
  optedOutEmails: Set<string>
): ComputeResult {
  const eligible = members.filter((m) => !optedOutEmails.has(m.email.toLowerCase()));

  const checkinsArr = eligible.map((m) => m.checkins);
  const logMessagesArr = eligible.filter((m) => m.messagesMatched).map((m) => Math.log1p(m.messageCount));

  const scores = eligible.map((m) =>
    activityScore(
      { messagesMatched: m.messagesMatched, messages: m.messageCount, checkins: m.checkins },
      logMessagesArr,
      checkinsArr
    )
  );
  const percentiles = computePercentiles(scores);

  const clubAssignments = assignClubs(eligible, yearStart, yearEnd);
  const rarity = rarityPercentages(clubAssignments);

  const snapshots = new Map<string, Snapshot>();
  const clubDistribution: Record<string, number> = {
    builder: 0,
    connector: 0,
    observer: 0,
    sprinter: 0,
  };

  eligible.forEach((m, i) => {
    const percentile = percentiles[i]!;
    const tier = tierFromPercentile(percentile);
    const assignment = clubAssignments.get(m.email)!;
    clubDistribution[assignment.club] += 1;

    const tenureMonths = Math.max(
      0,
      (yearEnd.getUTCFullYear() - m.joinDate.getUTCFullYear()) * 12 +
        (yearEnd.getUTCMonth() - m.joinDate.getUTCMonth())
    );

    const snapshot: Snapshot = {
      version: 1,
      name: m.fullName,
      firstName: m.fullName.trim().split(/\s+/)[0] ?? m.fullName,
      joinDate: m.joinDate.toISOString().slice(0, 10),
      joinMonthLabel: m.joinDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      tenureMonths,
      isNewMember: m.joinDate > NEW_MEMBER_CUTOFF,
      events: {
        checkins: m.checkins,
        registrations: m.registrations,
        titles: m.eventTitles,
        firstEventTitle: m.eventTitles.at(-1) ?? null,
      },
      messages: m.messagesMatched
        ? {
            matched: true,
            count: m.messageCount,
            activeDays: m.messageActiveDays,
            peakMonthLabel: peakMonthLabel(m.messageMonthlyCounts),
          }
        : { matched: false },
      standing: { percentile, tier },
      club: { id: assignment.club, rarityPct: rarity[assignment.club] },
      flags: {
        zeroCheckins: m.checkins === 0,
        lowActivity: m.checkins <= 1 && (!m.messagesMatched || m.messageCount < 20),
      },
    };

    const parsed = SnapshotSchema.parse(snapshot);
    snapshots.set(m.email, parsed);
  });

  const chapterMeta: ChapterMeta = {
    version: 1,
    members: eligible.length,
    eventsRun,
    totalCheckins: eligible.reduce((sum, m) => sum + m.checkins, 0),
    messagesParsed: eligible.reduce((sum, m) => sum + m.messageCount, 0),
    productsShipped: 5,
    clubDistribution,
    computedAt: new Date().toISOString(),
  };

  return { snapshots, chapterMeta };
}
