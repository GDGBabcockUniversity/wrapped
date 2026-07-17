import { describe, it, expect } from "vitest";
import {
  parseCsv,
  parseSourceCsv,
  parseSourceDate,
  titleFromFilename,
  normalizeTitleKey,
} from "./sources";

describe("parseCsv", () => {
  it("handles quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('name,role\n"Doe, Jane","says ""hi"""\n');
    expect(rows).toEqual([
      ["name", "role"],
      ["Doe, Jane", 'says "hi"'],
    ]);
  });

  it("tolerates CRLF and skips blank lines", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n\r\n3,4");
    expect(rows).toHaveLength(3);
  });
});

describe("parseSourceDate", () => {
  it("parses ISO timestamps", () => {
    expect(parseSourceDate("2025-11-08T09:30:00Z")?.toISOString()).toBe("2025-11-08T09:30:00.000Z");
  });

  it("parses slash dates DAY-FIRST", () => {
    expect(parseSourceDate("08/11/2025")?.toISOString().slice(0, 10)).toBe("2025-11-08");
  });

  it("parses 'Month D, YYYY'", () => {
    expect(parseSourceDate("November 8, 2025")?.getUTCFullYear()).toBe(2025);
  });

  it("returns null for garbage", () => {
    expect(parseSourceDate("not a date")).toBeNull();
    expect(parseSourceDate("")).toBeNull();
  });
});

describe("titleFromFilename", () => {
  it("extracts a date prefix and cleans the title", () => {
    const { title, date } = titleFromFilename("luma/2025-11-08-devfest-babcock.csv");
    expect(title).toBe("devfest babcock");
    expect(date?.toISOString().slice(0, 10)).toBe("2025-11-08");
  });

  it("works without a date prefix", () => {
    const { title, date } = titleFromFilename("orbit_kickoff.csv");
    expect(title).toBe("orbit kickoff");
    expect(date).toBeNull();
  });
});

describe("parseSourceCsv — roster (community.dev / Bevy style)", () => {
  const csv = [
    "First Name,Last Name,Email,Join Date",
    "Ada,Lovelace,ADA@Example.com,2024-03-10",
    "Grace,Hopper,grace@example.com,June 2, 2025",
    ",,no-name@example.com,2025-01-01",
    "Bad,Row,not-an-email,2025-01-01",
  ].join("\n");

  it("classifies as roster and lowercases emails", () => {
    const { roster, attendance } = parseSourceCsv("community/members.csv", csv);
    expect(attendance).toHaveLength(0);
    expect(roster).toHaveLength(3); // not-an-email dropped
    expect(roster[0]).toMatchObject({ email: "ada@example.com", fullName: "Ada Lovelace" });
    expect(roster[0]!.joinedAt?.toISOString().slice(0, 10)).toBe("2024-03-10");
  });

  it("derives a name from the email when none is given", () => {
    const { roster } = parseSourceCsv("community/members.csv", csv);
    expect(roster[2]!.fullName).toBe("No Name");
  });
});

describe("parseSourceCsv — attendance (Luma guest export)", () => {
  const csv = [
    "name,email,approval_status,registered_at,checked_in_at",
    "Ada Lovelace,ada@example.com,approved,2025-11-01T08:00:00Z,2025-11-08T09:12:00Z",
    "Grace Hopper,grace@example.com,approved,2025-11-01T08:00:00Z,",
    "Ghost Guest,ghost@example.com,declined,2025-11-01T08:00:00Z,",
  ].join("\n");

  it("classifies as attendance with the event title from the filename", () => {
    const { attendance } = parseSourceCsv("luma/2025-11-08-devfest-babcock.csv", csv);
    expect(attendance).toHaveLength(2); // declined RSVP dropped entirely
    expect(attendance[0]).toMatchObject({
      email: "ada@example.com",
      eventTitle: "devfest babcock",
      checkedIn: true,
    });
    expect(attendance[1]).toMatchObject({ email: "grace@example.com", checkedIn: false });
  });

  it("takes check-in from the checked_in_at timestamp", () => {
    const { attendance } = parseSourceCsv("luma/2025-11-08-devfest-babcock.csv", csv);
    expect(attendance[0]!.checkedInAt?.toISOString().slice(0, 10)).toBe("2025-11-08");
  });
});

describe("parseSourceCsv — attendance (generic Yes/No sheet)", () => {
  const csv = ["Name,Email,Checked In", "Walk In,walk@example.com,Yes", "No Show,noshow@example.com,No"].join(
    "\n"
  );

  it("reads boolean-ish check-in columns", () => {
    const { attendance } = parseSourceCsv("orbit/2025-09-12-orbit-kickoff.csv", csv);
    expect(attendance).toHaveLength(2);
    expect(attendance[0]!.checkedIn).toBe(true);
    expect(attendance[1]!.checkedIn).toBe(false);
    expect(attendance[0]!.eventDate?.toISOString().slice(0, 10)).toBe("2025-09-12");
  });
});

describe("parseSourceCsv — guards", () => {
  it("skips files without an email column", () => {
    const { roster, attendance } = parseSourceCsv("junk.csv", "a,b\n1,2");
    expect(roster).toHaveLength(0);
    expect(attendance).toHaveLength(0);
  });
});

describe("normalizeTitleKey", () => {
  it("collapses formatting differences between platforms", () => {
    expect(normalizeTitleKey("DevFest Babcock")).toBe(normalizeTitleKey("devfest-babcock"));
    expect(normalizeTitleKey("DevFest Babcock!")).toBe(normalizeTitleKey("devfest babcock"));
  });
});
