import { describe, it, expect } from "vitest";
import {
  popLettersStaggerMs,
  popLettersEntranceMs,
  minBeatHoldMs,
  READ_FLOOR_MS,
} from "./text-timing";

describe("popLettersStaggerMs — long strings can't outrun their beat", () => {
  it("keeps the full stagger for short strings", () => {
    expect(popLettersStaggerMs("What a year.", "default")).toBe(45);
    expect(popLettersStaggerMs("Talk is cheap.", "fast")).toBe(24);
  });

  it("scales the stagger down for long strings so entrance stays ~<=900ms", () => {
    const long = "Some people wait years to find their people.";
    const stagger = popLettersStaggerMs(long, "default");
    expect(stagger).toBeLessThan(45);
    // full entrance stays inside a sane window (draw + spring settle)
    expect(popLettersEntranceMs(long, "default")).toBeLessThan(1400);
  });

  it("never drops below the floor stagger", () => {
    const veryLong = "x".repeat(200);
    expect(popLettersStaggerMs(veryLong)).toBeGreaterThanOrEqual(12);
  });
});

describe("minBeatHoldMs", () => {
  it("is entrance + the read floor, so a beat outlives its own draw", () => {
    const text = "So what was it about?";
    expect(minBeatHoldMs(text)).toBe(popLettersEntranceMs(text) + READ_FLOOR_MS);
    expect(minBeatHoldMs(text)).toBeGreaterThan(READ_FLOOR_MS);
  });
});
