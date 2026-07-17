import { describe, it, expect } from "vitest";
import { matchMembers, nameSimilarity } from "./match-members";
import type { SenderStats } from "./parse-whatsapp";
import type { DbUser } from "./fetch-db";

function sender(overrides: Partial<SenderStats>): SenderStats {
  return {
    senderKey: "unknown",
    isPhone: false,
    messageCount: 1,
    firstAt: new Date("2025-10-01"),
    lastAt: new Date("2025-10-01"),
    dailyCounts: { "2025-10-01": 1 },
    monthlyCounts: { "2025-10": 1 },
    ...overrides,
  };
}

function user(overrides: Partial<DbUser>): DbUser {
  return {
    id: "user-1",
    email: "ada@example.com",
    full_name: "Ada Lovelace",
    whatsapp_number: "+2348031234567",
    created_at: new Date("2024-09-01"),
    ...overrides,
  };
}

describe("matchMembers", () => {
  it("matches phone numbers on last-10-digits regardless of country-code formatting", () => {
    const senders = new Map<string, SenderStats>([
      ["2348031234567", sender({ senderKey: "2348031234567", isPhone: true, messageCount: 5 })],
    ]);
    const users = [user({ whatsapp_number: "08031234567" })];
    const result = matchMembers(senders, users, {});
    expect(result.matched.get("user-1")?.messageCount).toBe(5);
    expect(result.matchedMessageVolume).toBe(5);
    expect(result.unmatchedSenders).toHaveLength(0);
  });

  it("applies a mapping.json override even when a phone match would fail", () => {
    const senders = new Map<string, SenderStats>([
      ["Ada L.", sender({ senderKey: "Ada L.", isPhone: false, messageCount: 3 })],
    ]);
    const users = [user({})];
    const result = matchMembers(senders, users, { "Ada L.": "user-1" });
    expect(result.matched.get("user-1")?.messageCount).toBe(3);
  });

  it("merges multiple senders mapped to the same member (device change)", () => {
    const senders = new Map<string, SenderStats>([
      ["old-number", sender({ senderKey: "old-number", messageCount: 2 })],
      ["new-number", sender({ senderKey: "new-number", messageCount: 4 })],
    ]);
    const users = [user({})];
    const result = matchMembers(senders, users, {
      "old-number": "user-1",
      "new-number": "user-1",
    });
    expect(result.matched.get("user-1")?.messageCount).toBe(6);
  });

  it("reports unmatched senders with a name-similarity suggestion", () => {
    const senders = new Map<string, SenderStats>([
      ["Ada Lovelac", sender({ senderKey: "Ada Lovelac", messageCount: 2 })],
    ]);
    const users = [user({ whatsapp_number: null })];
    const result = matchMembers(senders, users, {});
    expect(result.unmatchedSenders).toHaveLength(1);
    expect(result.unmatchedSenders[0]!.suggestion).toBe("Ada Lovelace");
  });
});

describe("nameSimilarity", () => {
  it("scores identical names as 1", () => {
    expect(nameSimilarity("Ada Lovelace", "Ada Lovelace")).toBe(1);
  });

  it("scores a one-character typo above the 0.85 threshold", () => {
    expect(nameSimilarity("Ada Lovelac", "Ada Lovelace")).toBeGreaterThanOrEqual(0.85);
  });

  it("scores unrelated names low", () => {
    expect(nameSimilarity("Ada Lovelace", "Zzz Qqq")).toBeLessThan(0.5);
  });
});
