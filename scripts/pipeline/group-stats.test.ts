import { describe, it, expect } from "vitest";
import { computeGroupChatStats, suggestTopSubgroup } from "./group-stats";

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");

// Exercises every rule in build5 §5.1: an unsaved-contact ("~...") sender,
// a phone-number sender, a sticker, a deleted message, an after-midnight
// message, a laugh emoji, every dialect word, and a two-day streak (with a
// later isolated day that must NOT extend it).
const MAIN_CHAT = [
  "01/10/2025, 09:00 - Ada Lovelace: hello sha",
  "01/10/2025, 09:05 - Ada Lovelace: dey with it sha",
  "01/10/2025, 09:10 - ~ Stranger: hi",
  "01/10/2025, 00:30 - Ada Lovelace: after midnight message",
  "01/10/2025, 21:00 - Ada Lovelace: sticker omitted",
  "01/10/2025, 21:05 - Ada Lovelace: This message was deleted",
  "02/10/2025, 10:00 - Chido: omo see this 😂😂",
  "02/10/2025, 10:05 - +234 803 123 4567: hello",
  "05/10/2025, 08:00 - Ada Lovelace: una too much",
].join("\n");

describe("computeGroupChatStats", () => {
  it("counts messages, excluding a deleted body", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.messages).toBe(8);
    expect(main.deleted).toBe(1);
  });

  it("counts unique senders including unsaved contacts and phone senders", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.senders).toBe(4);
  });

  it("excludes unsaved-contact and phone-number senders from top yappers", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.topYappers).toEqual([
      { name: "Ada Lovelace", count: 5 },
      { name: "Chido", count: 1 },
    ]);
  });

  it("finds the busiest day", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.busiestDay).toEqual({ label: "OCT 1", count: 5 });
  });

  it("finds the peak hour", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.peakHourLabel).toBe("9AM");
  });

  it("counts after-midnight messages (hours 0-4)", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.afterMidnight).toBe(1);
  });

  it("counts stickers", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.stickers).toBe(1);
  });

  it("counts laugh emoji occurrences", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.laughs).toBe(2);
  });

  it("counts every dialect word, whole-word case-insensitive", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.dialect).toEqual([
      { word: "sha", count: 2 },
      { word: "dey", count: 1 },
      { word: "abeg", count: 0 },
      { word: "una", count: 1 },
      { word: "omo", count: 1 },
    ]);
  });

  it("finds the longest streak of consecutive days without extending across a gap", () => {
    const { main } = computeGroupChatStats([{ name: "main", text: MAIN_CHAT }], YEAR_START, YEAR_END);
    expect(main.streakDays).toBe(2);
  });

  it("counts a deleted body with a trailing period or the admin-deletion variant", () => {
    const content = [
      "01/10/2025, 09:00 - Ada Lovelace: hi",
      "01/10/2025, 09:01 - Ada Lovelace: This message was deleted.",
      "01/10/2025, 09:02 - Ada Lovelace: This message was deleted by admin ~Bolanle.",
    ].join("\n");
    const { main } = computeGroupChatStats([{ name: "main", text: content }], YEAR_START, YEAR_END);
    expect(main.messages).toBe(1);
    expect(main.deleted).toBe(2);
  });

  it("discards messages outside the year window", () => {
    const content = [
      "01/01/2020, 09:00 - Ada Lovelace: too early",
      "01/10/2025, 09:00 - Ada Lovelace: in window",
    ].join("\n");
    const { main } = computeGroupChatStats([{ name: "main", text: content }], YEAR_START, YEAR_END);
    expect(main.messages).toBe(1);
  });

  it("matches the main file case-insensitively by name prefix", () => {
    const { main } = computeGroupChatStats(
      [{ name: "Main-Chat", text: "01/10/2025, 09:00 - Ada Lovelace: hi" }],
      YEAR_START,
      YEAR_END
    );
    expect(main.messages).toBe(1);
  });

  it("returns zeroed main stats when no main file is present", () => {
    const { main } = computeGroupChatStats(
      [{ name: "data-and-ai", text: "01/10/2025, 09:00 - Ada Lovelace: hi" }],
      YEAR_START,
      YEAR_END
    );
    expect(main.messages).toBe(0);
    expect(main.topYappers).toEqual([]);
  });

  it("tallies perGroup message counts across every file, including main", () => {
    const { perGroup } = computeGroupChatStats(
      [
        { name: "main", text: MAIN_CHAT },
        { name: "data-and-ai", text: "01/10/2025, 09:00 - Ada Lovelace: hi\n01/10/2025, 09:01 - Ada Lovelace: hi again" },
      ],
      YEAR_START,
      YEAR_END
    );
    expect(perGroup).toEqual([
      { name: "main", messages: 8 },
      { name: "data-and-ai", messages: 2 },
    ]);
  });
});

describe("suggestTopSubgroup", () => {
  it("picks the top non-main group by message volume", () => {
    const result = suggestTopSubgroup([
      { name: "main", messages: 100 },
      { name: "data-and-ai", messages: 40 },
      { name: "media-team", messages: 55 },
    ]);
    expect(result).toEqual({ name: "media-team", messages: 55 });
  });

  it("returns null when there are no subgroup exports yet", () => {
    expect(suggestTopSubgroup([{ name: "main", messages: 100 }])).toBeNull();
    expect(suggestTopSubgroup([])).toBeNull();
  });
});
