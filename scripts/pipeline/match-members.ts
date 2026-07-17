import type { SenderStats } from "./parse-whatsapp";
import type { DbUser } from "./fetch-db";

export interface MatchedMember {
  userId: string;
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
  matched: Map<string, MatchedMember>; // userId -> aggregated
  matchedMessageVolume: number;
  totalMessageVolume: number;
  unmatchedSenders: UnmatchedSender[];
}

/**
 * @param mapping senderKey -> user UUID or email, from data/mapping.json.
 *   Always takes precedence over automatic phone matching, so a lead's
 *   manual resolution can correct a bad auto-match on a re-run.
 */
export function matchMembers(
  senderStats: Map<string, SenderStats>,
  users: DbUser[],
  mapping: Record<string, string>
): MatchResult {
  const byPhone = new Map<string, DbUser>();
  for (const u of users) {
    if (u.whatsapp_number) byPhone.set(last10(u.whatsapp_number), u);
  }
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const byId = new Map(users.map((u) => [u.id, u]));

  const matched = new Map<string, MatchedMember>();
  const unmatchedSenders: UnmatchedSender[] = [];
  let matchedMessageVolume = 0;
  let totalMessageVolume = 0;

  function addToMatched(userId: string, s: SenderStats) {
    const existing = matched.get(userId);
    if (existing) {
      existing.messageCount += s.messageCount;
      for (const [d, c] of Object.entries(s.dailyCounts)) {
        existing.dailyCounts[d] = (existing.dailyCounts[d] ?? 0) + c;
      }
      for (const [m, c] of Object.entries(s.monthlyCounts)) {
        existing.monthlyCounts[m] = (existing.monthlyCounts[m] ?? 0) + c;
      }
    } else {
      matched.set(userId, {
        userId,
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
      const user = byId.get(mappedTo) ?? byEmail.get(mappedTo.toLowerCase());
      if (user) {
        addToMatched(user.id, s);
        matchedMessageVolume += s.messageCount;
        continue;
      }
    }

    if (s.isPhone) {
      const user = byPhone.get(last10(s.senderKey));
      if (user) {
        addToMatched(user.id, s);
        matchedMessageVolume += s.messageCount;
        continue;
      }
    }

    let bestSuggestion = "";
    let bestScore = 0;
    for (const u of users) {
      const score = nameSimilarity(s.senderKey, u.full_name);
      if (score > bestScore) {
        bestScore = score;
        bestSuggestion = u.full_name;
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
