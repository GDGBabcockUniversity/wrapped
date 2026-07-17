import { describe, it, expect } from "vitest";
import { parseWhatsAppExports } from "./parse-whatsapp";

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
