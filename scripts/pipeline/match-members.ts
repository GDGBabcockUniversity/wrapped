import type { SenderStats } from "./parse-whatsapp";
import type { UniverseMember } from "./universe";

export interface MatchedMember {
  email: string; // universe member key
  messageCount: number;
  dailyCounts: Record<string, number>;
  monthlyCounts: Record<string, number>;
}

function last10(s: string): string {
  return s.replace(/[^\d]/g, "").slice(-10);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

export function nameSimilarity(a: string, b: string): number {
  const an = a.toLowerCase().trim();
  const bn = b.toLowerCase().trim();
  const maxLen = Math.max(an.length, bn.length) || 1;
  return 1 - levenshtein(an, bn) / maxLen;
}

export interface UnmatchedSender {
  senderKey: string;
  messageCount: number;
  suggestion: string;
}

export interface MatchResult {
  matched: Map<string, MatchedMember>; // email -> aggregated
  matchedMessageVolume: number;
  totalMessageVolume: number;
  unmatchedSenders: UnmatchedSender[];
}

/**
 * @param members the full cross-platform universe. Phone auto-match only
 *   works for auth-platform members (the only source of WhatsApp numbers);
 *   everyone else is reachable via mapping.json.
 * @param mapping senderKey -> auth UUID or email, from data/mapping.json.
 *   Always takes precedence over automatic phone matching, so a lead's
 *   manual resolution can correct a bad auto-match on a re-run.
 */
export function matchMembers(
  senderStats: Map<string, SenderStats>,
  members: UniverseMember[],
  mapping: Record<string, string>
): MatchResult {
  const byPhone = new Map<string, UniverseMember>();
  for (const m of members) {
    if (m.whatsappNumber) byPhone.set(last10(m.whatsappNumber), m);
  }
  const byEmail = new Map(members.map((m) => [m.email, m]));
  const byId = new Map(
    members.filter((m) => m.userId !== null).map((m) => [m.userId!, m])
  );

  const matched = new Map<string, MatchedMember>();
  const unmatchedSenders: UnmatchedSender[] = [];
  let matchedMessageVolume = 0;
  let totalMessageVolume = 0;

  function addToMatched(email: string, s: SenderStats) {
    const existing = matched.get(email);
    if (existing) {
      existing.messageCount += s.messageCount;
      for (const [d, c] of Object.entries(s.dailyCounts)) {
        existing.dailyCounts[d] = (existing.dailyCounts[d] ?? 0) + c;
      }
      for (const [m, c] of Object.entries(s.monthlyCounts)) {
        existing.monthlyCounts[m] = (existing.monthlyCounts[m] ?? 0) + c;
      }
    } else {
      matched.set(email, {
        email,
        messageCount: s.messageCount,
        dailyCounts: { ...s.dailyCounts },
        monthlyCounts: { ...s.monthlyCounts },
      });
    }
  }

  for (const s of senderStats.values()) {
    totalMessageVolume += s.messageCount;

    const mappedTo = mapping[s.senderKey];
    if (mappedTo) {
      const member = byId.get(mappedTo) ?? byEmail.get(mappedTo.toLowerCase());
      if (member) {
        addToMatched(member.email, s);
        matchedMessageVolume += s.messageCount;
        continue;
      }
    }

    if (s.isPhone) {
      const member = byPhone.get(last10(s.senderKey));
      if (member) {
        addToMatched(member.email, s);
        matchedMessageVolume += s.messageCount;
        continue;
      }
    }

    let bestSuggestion = "";
    let bestScore = 0;
    for (const m of members) {
      const score = nameSimilarity(s.senderKey, m.fullName);
      if (score > bestScore) {
        bestScore = score;
        bestSuggestion = m.fullName;
      }
    }
    unmatchedSenders.push({
      senderKey: s.senderKey,
      messageCount: s.messageCount,
      suggestion: bestScore >= 0.85 ? bestSuggestion : "",
    });
  }

  return { matched, matchedMessageVolume, totalMessageVolume, unmatchedSenders };
}
