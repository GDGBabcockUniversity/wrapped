import { describe, it, expect } from "vitest";
import { assignClubs, pickClub, rarityPercentages } from "./clubs";
import type { PipelineMember } from "./types";

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");

function member(id: string, overrides: Partial<PipelineMember>): PipelineMember {
  return {
    userId: id,
    email: `${id}@example.com`,
    fullName: id,
    joinDate: new Date("2025-09-05"),
    checkins: 0,
    registrations: 0,
    eventTitles: [],
    checkinMonthlyCounts: {},
    checkinDailyCounts: {},
    radarSignal: 0,
    messagesMatched: false,
    messageCount: 0,
    messageMonthlyCounts: {},
    messageDailyCounts: {},
    messageActiveDays: 0,
    ...overrides,
  };
}

/** Deterministic pseudo-random in [0,1) so fillers vary without a real RNG dependency. */
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Spreads `count` events one-per-day starting at `startDay` days after 2025-09-01 (no key collisions). */
function spreadDaily(count: number, startDayOffset: number): Record<string, number> {
  const out: Record<string, number> = {};
  const base = new Date("2025-09-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const d = new Date(base + (startDayOffset + i) * 86400000);
    out[d.toISOString().slice(0, 10)] = 1;
  }
  return out;
}

/** Spreads `count` events one every `spacingDays` days — for sustained, non-bursty activity. */
function spreadEvery(count: number, spacingDays: number, startDayOffset = 0): Record<string, number> {
  const out: Record<string, number> = {};
  const base = new Date("2025-09-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const d = new Date(base + (startDayOffset + i * spacingDays) * 86400000);
    out[d.toISOString().slice(0, 10)] = 1;
  }
  return out;
}

function monthlyFromDaily(daily: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [day, c] of Object.entries(daily)) {
    const mo = day.slice(0, 7);
    out[mo] = (out[mo] ?? 0) + c;
  }
  return out;
}

function filler(id: string, index: number): PipelineMember {
  // Real, varied-but-modest activity so the population has genuine diversity
  // for rebalance to draw from — a monoculture of identical fillers is an
  // unrealistic population that starves the rebalance step of real
  // candidates (see the isZeroActivity pin added to clubs.ts for why that
  // matters).
  const checkins = 1 + Math.floor(pseudoRand(index) * 6); // 1..6
  const registrations = checkins + Math.floor(pseudoRand(index + 50) * 3);
  const messageCount = 10 + Math.floor(pseudoRand(index + 100) * 80); // 10..90
  const checkinDaily = spreadDaily(checkins, index * 7);
  const messageDaily = spreadDaily(Math.min(messageCount, 40), index * 5 + 200);
  return member(`filler-${id}`, {
    checkins,
    registrations,
    checkinMonthlyCounts: monthlyFromDaily(checkinDaily),
    checkinDailyCounts: checkinDaily,
    messagesMatched: true,
    messageCount,
    messageMonthlyCounts: monthlyFromDaily(messageDaily),
    messageDailyCounts: messageDaily,
    messageActiveDays: Object.keys(messageDaily).length,
  });
}

describe("pickClub (tie-break)", () => {
  it("breaks exact ties in priority order: sprinter > builder > connector > observer", () => {
    expect(pickClub({ sprinter: 0.5, builder: 0.5, connector: 0.5, observer: 0.5 })).toBe("sprinter");
    expect(pickClub({ sprinter: 0.1, builder: 0.5, connector: 0.5, observer: 0.5 })).toBe("builder");
    expect(pickClub({ sprinter: 0.1, builder: 0.1, connector: 0.5, observer: 0.5 })).toBe("connector");
    expect(pickClub({ sprinter: 0.1, builder: 0.1, connector: 0.1, observer: 0.5 })).toBe("observer");
  });

  it("picks the strict maximum when scores differ", () => {
    expect(pickClub({ sprinter: 0.2, builder: 0.9, connector: 0.3, observer: 0.1 })).toBe("builder");
  });
});

describe("assignClubs — archetypes", () => {
  // 30 check-ins, one every ~10 days across the whole year — high attendance,
  // high radar engagement, spread thin (not bursty).
  const builderCheckinDaily = spreadEvery(30, 10);
  const builderArchetype = member("builder-archetype", {
    checkins: 30,
    registrations: 32,
    checkinMonthlyCounts: monthlyFromDaily(builderCheckinDaily),
    checkinDailyCounts: builderCheckinDaily,
    radarSignal: 20,
  });

  // 1800 messages spread one-per-day across ~300 distinct days (high volume,
  // high consistency, low burst) — the connector shape.
  const connectorMessageDaily = spreadDaily(300, 0);
  for (const day of Object.keys(connectorMessageDaily)) connectorMessageDaily[day] = 6;
  const connectorArchetype = member("connector-archetype", {
    checkins: 3,
    registrations: 4,
    checkinMonthlyCounts: { "2025-10": 3 },
    messagesMatched: true,
    messageCount: 1800,
    messageMonthlyCounts: monthlyFromDaily(connectorMessageDaily),
    messageDailyCounts: connectorMessageDaily,
    messageActiveDays: Object.keys(connectorMessageDaily).length,
  });

  // All activity concentrated into a single 15-day window — the sprinter shape.
  const sprinterCheckinDaily = spreadDaily(15, 270);
  const sprinterMessageDaily = spreadDaily(15, 270);
  for (const day of Object.keys(sprinterMessageDaily)) sprinterMessageDaily[day] = 13;
  const sprinterArchetype = member("sprinter-archetype", {
    joinDate: new Date("2026-06-01"),
    checkins: 15,
    registrations: 15,
    checkinDailyCounts: sprinterCheckinDaily,
    checkinMonthlyCounts: monthlyFromDaily(sprinterCheckinDaily),
    messagesMatched: true,
    messageCount: 195,
    messageDailyCounts: sprinterMessageDaily,
    messageMonthlyCounts: monthlyFromDaily(sprinterMessageDaily),
    messageActiveDays: Object.keys(sprinterMessageDaily).length,
  });

  const zeroArchetype = member("zero-archetype", {});

  const fillers = Array.from({ length: 16 }, (_, i) => filler(String(i), i));
  const population = [builderArchetype, connectorArchetype, sprinterArchetype, zeroArchetype, ...fillers];

  it("assigns the high-attendance, high-radar member to Builder", () => {
    const assignments = assignClubs(population, YEAR_START, YEAR_END);
    expect(assignments.get("builder-archetype@example.com")?.club).toBe("builder");
  });

  it("assigns the high-message-volume, high-consistency member to Connector", () => {
    const assignments = assignClubs(population, YEAR_START, YEAR_END);
    expect(assignments.get("connector-archetype@example.com")?.club).toBe("connector");
  });

  it("assigns the concentrated-burst member to Sprinter", () => {
    const assignments = assignClubs(population, YEAR_START, YEAR_END);
    expect(assignments.get("sprinter-archetype@example.com")?.club).toBe("sprinter");
  });

  it("assigns a zero-activity member to Observer (never shamed into an empty club)", () => {
    const assignments = assignClubs(population, YEAR_START, YEAR_END);
    expect(assignments.get("zero-archetype@example.com")?.club).toBe("observer");
  });

  it("keeps every club at or above the 8% rebalance floor", () => {
    const assignments = assignClubs(population, YEAR_START, YEAR_END);
    const rarity = rarityPercentages(assignments);
    for (const share of Object.values(rarity)) {
      expect(share).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("assignClubs — rebalance floor on a skewed population", () => {
  it("still guarantees every club >= 8% even when almost everyone looks like a Builder", () => {
    const skewed = Array.from({ length: 50 }, (_, i) =>
      member(`m-${i}`, {
        checkins: 10 + (i % 5),
        registrations: 12 + (i % 5),
        checkinMonthlyCounts: { "2025-10": 5, "2025-11": 5 },
      })
    );
    const assignments = assignClubs(skewed, YEAR_START, YEAR_END);
    const rarity = rarityPercentages(assignments);
    for (const share of Object.values(rarity)) {
      expect(share).toBeGreaterThanOrEqual(8);
    }
  });
});
