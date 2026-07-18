import { describe, it, expect } from "vitest";
import { buildUniverse } from "./universe";
import type { FetchedDb } from "./fetch-db";
import type { ExternalData } from "./sources";

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");

function emptyDb(overrides: Partial<FetchedDb> = {}): FetchedDb {
  return {
    users: [],
    checkins: [],
    registrations: [],
    radarReads: [],
    radarPlays: [],
    eventTitlesRun: [],
    ...overrides,
  };
}

function emptyExternal(overrides: Partial<ExternalData> = {}): ExternalData {
  return { roster: [], attendance: [], ...overrides };
}

const ADA = {
  id: "uuid-ada",
  email: "Ada@Example.com",
  full_name: "Ada Lovelace",
  whatsapp_number: "+2348031234567",
  created_at: new Date("2024-09-01T00:00:00Z"),
};

describe("buildUniverse — membership", () => {
  it("unions auth users, roster members, and attendance-only emails", () => {
    const universe = buildUniverse(
      emptyDb({ users: [ADA] }),
      emptyExternal({
        roster: [
          { email: "grace@example.com", fullName: "Grace Hopper", joinedAt: new Date("2025-01-01"), whatsapp: null, source: "community/members.csv" },
        ],
        attendance: [
          { email: "walk@example.com", fullName: "Walk In", eventTitle: "orbit kickoff", eventDate: new Date("2025-09-12"), registeredAt: null, checkedIn: true, checkedInAt: null, source: "orbit.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    expect(universe.members).toHaveLength(3);
    const emails = universe.members.map((m) => m.email).sort();
    expect(emails).toEqual(["ada@example.com", "grace@example.com", "walk@example.com"]);
  });

  it("keeps the auth UUID and WhatsApp number when a member appears in multiple sources", () => {
    const universe = buildUniverse(
      emptyDb({ users: [ADA] }),
      emptyExternal({
        roster: [
          { email: "ada@example.com", fullName: "Ada Lovelace", joinedAt: new Date("2023-05-01"), whatsapp: null, source: "community/members.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    expect(universe.members).toHaveLength(1);
    const ada = universe.members[0]!;
    expect(ada.userId).toBe("uuid-ada");
    expect(ada.whatsappNumber).toBe("+2348031234567");
    // Earliest join date across sources wins.
    expect(ada.joinDate.toISOString().slice(0, 10)).toBe("2023-05-01");
  });

  it("marks community-only members with a null userId", () => {
    const universe = buildUniverse(
      emptyDb(),
      emptyExternal({
        roster: [{ email: "grace@example.com", fullName: "Grace Hopper", joinedAt: null, whatsapp: null, source: "m.csv" }],
      }),
      YEAR_START,
      YEAR_END
    );
    expect(universe.members[0]!.userId).toBeNull();
  });

  it("takes a WhatsApp number from the roster when auth has none, but auth wins", () => {
    const noPhoneAda = { ...ADA, whatsapp_number: null };
    const universe = buildUniverse(
      emptyDb({ users: [noPhoneAda] }),
      emptyExternal({
        roster: [
          { email: "ada@example.com", fullName: "Ada Lovelace", joinedAt: null, whatsapp: "+2348122229581", source: "forms/membership.csv" },
          { email: "grace@example.com", fullName: "Grace Hopper", joinedAt: null, whatsapp: "07044251887", source: "forms/membership.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    const byEmail = new Map(universe.members.map((m) => [m.email, m]));
    expect(byEmail.get("ada@example.com")!.whatsappNumber).toBe("+2348122229581");
    expect(byEmail.get("grace@example.com")!.whatsappNumber).toBe("07044251887");
  });
});

describe("buildUniverse — event dedupe", () => {
  it("counts an event ONCE when tracked in both the auth platform and Luma", () => {
    const universe = buildUniverse(
      emptyDb({
        users: [ADA],
        checkins: [
          { user_id: "uuid-ada", checked_in_at: new Date("2025-11-08T09:00:00Z"), title: "DevFest Babcock", starts_at: new Date("2025-11-08T09:00:00Z") },
        ],
      }),
      emptyExternal({
        attendance: [
          { email: "ada@example.com", fullName: "Ada Lovelace", eventTitle: "devfest-babcock", eventDate: new Date("2025-11-08"), registeredAt: new Date("2025-11-01"), checkedIn: true, checkedInAt: new Date("2025-11-08T09:12:00Z"), source: "luma.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    const activity = universe.activity.get("ada@example.com")!;
    expect(activity.checkins).toBe(1);
    expect(activity.registrations).toBe(1);
  });

  it("registration in one source + check-in in another still yields one registered, checked-in event", () => {
    const universe = buildUniverse(
      emptyDb({
        users: [ADA],
        registrations: [
          { user_id: "uuid-ada", registered_at: new Date("2025-10-01"), title: "Game Night Vol. 1" },
        ],
      }),
      emptyExternal({
        attendance: [
          { email: "ada@example.com", fullName: null, eventTitle: "game night vol 1", eventDate: new Date("2025-10-03"), registeredAt: null, checkedIn: true, checkedInAt: new Date("2025-10-03T18:00:00Z"), source: "sheet.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    const activity = universe.activity.get("ada@example.com")!;
    expect(activity.checkins).toBe(1);
    expect(activity.registrations).toBe(1);
    expect(activity.titles).toContain("Game Night Vol. 1");
  });

  it("counts distinct events run across auth and external sources", () => {
    const universe = buildUniverse(
      emptyDb({ users: [ADA], eventTitlesRun: ["DevFest Babcock", "ORBIT Kickoff"] }),
      emptyExternal({
        attendance: [
          { email: "ada@example.com", fullName: null, eventTitle: "devfest babcock", eventDate: null, registeredAt: new Date("2025-11-01"), checkedIn: false, checkedInAt: null, source: "luma.csv" },
          { email: "ada@example.com", fullName: null, eventTitle: "Study Jam", eventDate: null, registeredAt: new Date("2025-11-02"), checkedIn: false, checkedInAt: null, source: "luma.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    expect(universe.eventsRun).toBe(3); // devfest (deduped), orbit, study jam
  });
});

describe("buildUniverse — signals", () => {
  it("maps radar activity back to email and keeps it for event-less members", () => {
    const universe = buildUniverse(
      emptyDb({ users: [ADA], radarReads: [{ user_id: "uuid-ada", count: 7 }], radarPlays: [{ user_id: "uuid-ada", count: 3 }] }),
      emptyExternal(),
      YEAR_START,
      YEAR_END
    );
    expect(universe.activity.get("ada@example.com")!.radarSignal).toBe(10);
  });

  it("gives checked-in events without timestamps totals but no timing signal", () => {
    const universe = buildUniverse(
      emptyDb(),
      emptyExternal({
        attendance: [
          { email: "walk@example.com", fullName: "Walk In", eventTitle: "orbit kickoff", eventDate: null, registeredAt: null, checkedIn: true, checkedInAt: null, source: "orbit.csv" },
        ],
      }),
      YEAR_START,
      YEAR_END
    );
    const activity = universe.activity.get("walk@example.com")!;
    expect(activity.checkins).toBe(1);
    expect(Object.keys(activity.checkinDailyCounts)).toHaveLength(0);
  });
});
