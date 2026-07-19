import { describe, it, expect } from "vitest";
import { chatIdForFile, dedupeKey, mergeExports } from "./merge-exports";

describe("chatIdForFile", () => {
  it("resolves the prefix before the first __", () => {
    expect(chatIdForFile("main__part1.txt")).toBe("main");
    expect(chatIdForFile("Software__batch2.txt")).toBe("software");
  });

  it("resolves WhatsApp's own default export name", () => {
    expect(chatIdForFile("WhatsApp Chat with Software Track.txt")).toBe("software-track");
  });

  it("prefers an explicit manifest entry over the heuristic", () => {
    const manifest = { "weird_export.txt": "data" };
    expect(chatIdForFile("weird_export.txt", manifest)).toBe("data");
  });

  it("matches a manifest entry given without the .txt extension", () => {
    const manifest = { weird_export: "data" };
    expect(chatIdForFile("weird_export.txt", manifest)).toBe("data");
  });

  it("falls back to the lowercased filename when nothing else matches", () => {
    expect(chatIdForFile("Random.txt")).toBe("random");
  });
});

describe("dedupeKey", () => {
  it("is stable at minute resolution regardless of seconds", () => {
    const a = dedupeKey(new Date("2025-10-01T09:00:12Z"), "Ada", "hello there");
    const b = dedupeKey(new Date("2025-10-01T09:00:47Z"), "Ada", "hello there");
    expect(a).toBe(b);
  });

  it("differs across different minutes, senders, or bodies", () => {
    const base = dedupeKey(new Date("2025-10-01T09:00:00Z"), "Ada", "hello there");
    expect(dedupeKey(new Date("2025-10-01T09:01:00Z"), "Ada", "hello there")).not.toBe(base);
    expect(dedupeKey(new Date("2025-10-01T09:00:00Z"), "Chido", "hello there")).not.toBe(base);
    expect(dedupeKey(new Date("2025-10-01T09:00:00Z"), "Ada", "something else")).not.toBe(base);
  });
});

describe("mergeExports", () => {
  // Two truncated exports of the SAME chat with a two-line overlap (the
  // real-world shape build6 §6.1 describes) plus one line unique to each.
  const partA = [
    "01/10/2025, 09:00 - Ada Lovelace: hello",
    "01/10/2025, 09:05 - Ada Lovelace: second message",
    "01/10/2025, 09:10 - Ada Lovelace: only in A",
  ].join("\n");
  const partB = [
    "01/10/2025, 09:00 - Ada Lovelace: hello",
    "01/10/2025, 09:05 - Ada Lovelace: second message",
    "01/10/2025, 09:15 - Ada Lovelace: only in B",
  ].join("\n");

  it("dedupes overlapping lines across files grouped into the same chat", () => {
    const { exports, reports } = mergeExports([
      { name: "main__part1.txt", text: partA },
      { name: "main__part2.txt", text: partB },
    ]);
    expect(exports).toHaveLength(1);
    expect(exports[0]!.name).toBe("main");
    const lines = exports[0]!.text.split("\n");
    expect(lines).toHaveLength(4); // 2 shared + 1 unique from each file

    const report = reports.find((r) => r.chatId === "main")!;
    expect(report.files).toBe(2);
    expect(report.raw).toBe(6); // 3 lines per file
    expect(report.kept).toBe(4);
    expect(report.deduped).toBe(2);
  });

  it("keeps different chats separate", () => {
    const { exports } = mergeExports([
      { name: "main__part1.txt", text: partA },
      { name: "software-track.txt", text: partA },
    ]);
    const names = exports.map((e) => e.name).sort();
    expect(names).toEqual(["main", "software-track"]);
  });

  it("passes system and continuation lines through unchanged, undeduped", () => {
    const withSystem = [
      "01/10/2025, 09:00 - Messages and calls are end-to-end encrypted.",
      "01/10/2025, 09:05 - Ada Lovelace: a message that",
      "continues on the next line",
    ].join("\n");
    const { exports } = mergeExports([{ name: "main.txt", text: withSystem }]);
    expect(exports[0]!.text.split("\n")).toHaveLength(3);
  });
});
