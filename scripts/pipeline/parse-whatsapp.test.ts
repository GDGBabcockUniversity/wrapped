import { describe, it, expect } from "vitest";
import { parseWhatsAppExports, detectDateOrder } from "./parse-whatsapp";

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");

describe("parseWhatsAppExports", () => {
  it("parses Android dialect with 2-digit year", () => {
    const content = `01/10/25, 09:43 - Ada Lovelace: hello everyone`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("parses Android dialect with 4-digit year", () => {
    const content = `01/10/2025, 09:43 - Ada Lovelace: hello everyone`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("parses iOS dialect with seconds and am/pm", () => {
    const content = `[01/10/2025, 09:43:12 AM] Ada Lovelace: hello everyone`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("treats non-matching lines as continuations that do not increment count", () => {
    const content = [
      "01/10/2025, 09:43 - Ada Lovelace: hello",
      "this is a continuation line",
      "so is this one",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("drops Android system lines", () => {
    const content = [
      "01/10/2025, 09:43 - Messages and calls are end-to-end encrypted.",
      "02/10/2025, 09:00 - Ada Lovelace: real message",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.size).toBe(1);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("drops iOS system lines", () => {
    const content = [
      "[01/10/2025, 09:43:00 AM] Messages and calls are end-to-end encrypted.",
      "[02/10/2025, 09:00:00 AM] Ada Lovelace: real message",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.size).toBe(1);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("counts <Media omitted> as a message", () => {
    const content = `01/10/2025, 09:43 - Ada Lovelace: <Media omitted>`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("does not count a deleted-message body", () => {
    const content = [
      "01/10/2025, 09:43 - Ada Lovelace: This message was deleted",
      "01/10/2025, 09:44 - Ada Lovelace: You deleted this message",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.has("Ada Lovelace")).toBe(false);
  });

  // The real WhatsApp export format (verified against the 2026-07-19
  // main-chat export) trails the deleted marker with a period, and has an
  // admin-deletion variant — an exact-string match missed both, silently
  // counting every deleted message as real content (build5 §5.1 fix).
  it("does not count a deleted-message body with a trailing period", () => {
    const content = `01/10/2025, 09:43 - Ada Lovelace: This message was deleted.`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.has("Ada Lovelace")).toBe(false);
  });

  it("does not count an admin-deleted message body", () => {
    const content = `01/10/2025, 09:43 - Ada Lovelace: This message was deleted by admin ~Bolanle.`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.has("Ada Lovelace")).toBe(false);
  });

  it("strips a trailing edited marker but still counts the message", () => {
    const content = `01/10/2025, 09:43 - Ada Lovelace: hello <This message was edited>`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("strips LRM/RLM bidi marks before matching", () => {
    const content = `‎01/10/2025, 09:43 - Ada Lovelace: hello`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("discards messages outside the year window", () => {
    const content = [
      "01/01/2020, 09:43 - Ada Lovelace: too early",
      "01/10/2025, 09:43 - Ada Lovelace: in window",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(1);
  });

  it("normalizes phone-like senders to digits only and flags isPhone", () => {
    const content = `01/10/2025, 09:43 - +234 803 123 4567: hello`;
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    const entry = stats.get("2348031234567");
    expect(entry?.isPhone).toBe(true);
    expect(entry?.messageCount).toBe(1);
  });

  it("aggregates message counts across multiple export files", () => {
    const file1 = `01/10/2025, 09:43 - Ada Lovelace: hello`;
    const file2 = `02/10/2025, 09:43 - Ada Lovelace: hello again`;
    const stats = parseWhatsAppExports([file1, file2], YEAR_START, YEAR_END);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(2);
  });
});

describe("detectDateOrder — the US month-first dialect (2026-07-19 data drop)", () => {
  it("detects month-first from a second slot > 12", () => {
    const content = [
      "[7/13/26, 10:50:57 PM] Ada Lovelace: month-first, 13 can't be a month",
      "[9/9/25, 1:00:54 AM] Ada Lovelace: ambiguous alone",
    ].join("\n");
    expect(detectDateOrder(content)).toBe("mdy");
  });

  it("detects day-first from a first slot > 12", () => {
    const content = "27/10/2025, 21:39 - Ada Lovelace: day-first";
    expect(detectDateOrder(content)).toBe("dmy");
  });

  it("defaults to day-first when no line is decisive", () => {
    expect(detectDateOrder("[9/9/25, 1:00:54 AM] Ada Lovelace: hi")).toBe("dmy");
  });

  it("parses a month-first file into the correct months", () => {
    // 10/3/25 is OCTOBER 3 in a month-first file — the old day-first
    // assumption read it as March 10 and smeared whole months around.
    const content = [
      "[10/3/25, 9:00:00 AM] Ada Lovelace: october message",
      "[10/19/25, 10:25:30 PM] Ada Lovelace: decisive line (19 can't be a month)",
    ].join("\n");
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    const entry = stats.get("Ada Lovelace");
    expect(entry?.messageCount).toBe(2);
    expect(Object.keys(entry!.monthlyCounts)).toEqual(["2025-10"]);
  });

  it("keeps month-first slot2 > 12 dates inside the right year (no Date rollover)", () => {
    const content = "[7/13/26, 10:50:57 PM] Ada Lovelace: july 13 2026";
    const stats = parseWhatsAppExports([content], YEAR_START, YEAR_END);
    expect(Object.keys(stats.get("Ada Lovelace")!.monthlyCounts)).toEqual(["2026-07"]);
  });

  it("detects order per file, not per batch", () => {
    const dayFirst = "27/10/2025, 21:39 - Ada Lovelace: dmy file";
    const monthFirst = "[10/19/25, 10:25:30 PM] Ada Lovelace: mdy file";
    const stats = parseWhatsAppExports([dayFirst, monthFirst], YEAR_START, YEAR_END);
    expect(Object.keys(stats.get("Ada Lovelace")!.monthlyCounts).sort()).toEqual(["2025-10"]);
    expect(stats.get("Ada Lovelace")?.messageCount).toBe(2);
  });
});
