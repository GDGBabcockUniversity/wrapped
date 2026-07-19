import { describe, it, expect } from "vitest";
import { computeGroupTopics, TOPIC_BUCKETS, STOPWORDS, isJunkWord } from "./topics";

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");

describe("isJunkWord — 'tf is pts?'", () => {
  it("drops consonant-only fragments", () => {
    expect(isJunkWord("pts")).toBe(true);
    expect(isJunkWord("pvt")).toBe(true);
    expect(isJunkWord("gdg")).toBe(true);
  });
  it("drops sub-4-char tokens that aren't known slang", () => {
    expect(isJunkWord("don")).toBe(true);
    expect(isJunkWord("ohh")).toBe(true);
  });
  it("keeps real words and whitelisted slang", () => {
    expect(isJunkWord("babcock")).toBe(false);
    expect(isJunkWord("people")).toBe(false);
    expect(isJunkWord("sha")).toBe(false);
    expect(isJunkWord("abeg")).toBe(false);
  });
});

describe("computeGroupTopics — words of the year", () => {
  it("excludes junk tokens like 'pts' from the vocabulary", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: pts pts pts wonderful",
      "01/10/2025, 09:05 - Chido: wonderful wonderful",
    ].join("\n");
    const { wordsOfYear } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(wordsOfYear.find((w) => w.word === "pts")).toBeUndefined();
    expect(wordsOfYear[0]).toEqual({ word: "wonderful", count: 3 });
  });


  it("counts tokens >=3 chars, excluding stopwords and roster names", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: zephyr zephyr wobble",
      "01/10/2025, 09:05 - Chido: zephyr wobble wobble wobble",
      "01/10/2025, 09:10 - Chido: just really well then also",
    ].join("\n");
    const { wordsOfYear } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(wordsOfYear[0]).toEqual({ word: "wobble", count: 4 });
    expect(wordsOfYear[1]).toEqual({ word: "zephyr", count: 3 });
    expect(wordsOfYear.some((w) => STOPWORDS.has(w.word))).toBe(false);
  });

  it("excludes extra name stopwords passed by the caller (top yappers)", () => {
    const text = "01/10/2025, 09:00 - Ada Lovelace: banana banana orange";
    const withExtra = computeGroupTopics(text, YEAR_START, YEAR_END, ["Banana Smith"]);
    expect(withExtra.wordsOfYear.find((w) => w.word === "banana")).toBeUndefined();
    expect(withExtra.wordsOfYear.find((w) => w.word === "orange")).toBeDefined();
  });
});

describe("computeGroupTopics — emoji leaderboard", () => {
  it("counts extended-pictographic clusters, most frequent first", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: 😂😂😂",
      "01/10/2025, 09:05 - Chido: 💀💀",
    ].join("\n");
    const { emojiLeaderboard } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(emojiLeaderboard[0]).toEqual({ emoji: "😂", count: 3 });
    expect(emojiLeaderboard[1]).toEqual({ emoji: "💀", count: 2 });
  });
});

describe("computeGroupTopics — topic buckets", () => {
  it("counts whole-word/whole-phrase hits per bucket", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: exam exam gpa",
      "01/10/2025, 09:05 - Chido: urgent 2k please transfer",
    ].join("\n");
    const { topicBuckets } = computeGroupTopics(text, YEAR_START, YEAR_END);
    const exams = topicBuckets.find((b) => b.name === "EXAMS & SCHOOL")!;
    const money = topicBuckets.find((b) => b.name === "MONEY")!;
    expect(exams.count).toBe(3); // exam, exam, gpa
    expect(money.count).toBe(2); // "urgent 2k", transfer
  });

  it("reports every bucket, even at zero", () => {
    const text = "01/10/2025, 09:00 - Ada Lovelace: hello";
    const { topicBuckets } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(topicBuckets).toHaveLength(Object.keys(TOPIC_BUCKETS).length);
  });
});

describe("computeGroupTopics — name-drops", () => {
  it("counts @-mentions by the single word right after @, never swallowing the rest of the sentence", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: @Chido check this out",
      "01/10/2025, 09:05 - Ada Lovelace: @Chido again",
    ].join("\n");
    const { nameDrops } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(nameDrops[0]).toEqual({ name: "Chido", count: 2 });
  });
});

describe("computeGroupTopics — links", () => {
  it("counts total links and buckets by known domains", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: https://youtube.com/watch?v=abc",
      "01/10/2025, 09:05 - Chido: https://example.com/page",
    ].join("\n");
    const { linksTotal, linkDomains } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(linksTotal).toBe(2);
    expect(linkDomains).toContainEqual({ domain: "youtube", count: 1 });
    expect(linkDomains).toContainEqual({ domain: "other", count: 1 });
  });
});

describe("computeGroupTopics — questions, the shouter, longest message", () => {
  it("counts messages ending in a question mark", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: is this real?",
      "01/10/2025, 09:05 - Chido: yes it is",
    ].join("\n");
    expect(computeGroupTopics(text, YEAR_START, YEAR_END).questionsCount).toBe(1);
  });

  it("finds the shouter — >=8 chars, >=90% caps letters", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: THIS IS SO LOUD RIGHT NOW",
      "01/10/2025, 09:05 - Chido: quiet message here",
    ].join("\n");
    expect(computeGroupTopics(text, YEAR_START, YEAR_END).shouter).toEqual({
      name: "Ada Lovelace",
      count: 1,
    });
  });

  it("does not count a short or mixed-case message as a shout", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: OK",
      "01/10/2025, 09:05 - Chido: This Is Mixed Case Text",
    ].join("\n");
    expect(computeGroupTopics(text, YEAR_START, YEAR_END).shouter).toBeNull();
  });

  it("finds the longest message by character count, never its content", () => {
    const longBody = "a much longer message than the other one";
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: short",
      `01/10/2025, 09:05 - Chido: ${longBody}`,
    ].join("\n");
    const { longestMessage } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(longestMessage).toEqual({ chars: longBody.length, sender: "Chido" });
  });
});

describe("computeGroupTopics — conversation starters", () => {
  it("credits whoever speaks first after >=6h of silence", () => {
    const text = [
      "01/10/2025, 09:00 - Ada Lovelace: morning",
      "01/10/2025, 09:05 - Chido: hey",
      "01/10/2025, 20:00 - Chido: evening restart", // ~11h gap -> starter
      "01/10/2025, 20:05 - Ada Lovelace: reply",
    ].join("\n");
    const { starters } = computeGroupTopics(text, YEAR_START, YEAR_END);
    // Ada also gets credit for the export's very first message; Chido's
    // post-silence restart is the behavior under test.
    expect(starters).toContainEqual({ name: "Chido", count: 1 });
  });

  it("the very first message of the export counts as a starter", () => {
    const text = "01/10/2025, 09:00 - Ada Lovelace: first ever";
    const { starters } = computeGroupTopics(text, YEAR_START, YEAR_END);
    expect(starters[0]).toEqual({ name: "Ada Lovelace", count: 1 });
  });
});
