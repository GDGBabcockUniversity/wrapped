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

describe("parseSourceCsv — attendance (real Bevy ticket export)", () => {
  // Header shape from an actual community.dev export: check-in lives in
  // "Checkin Date (UTC)" (no space in "Checkin"), registration in
  // "Paid date (UTC)".
  const csv = [
    "Order number,Ticket number,First Name,Last Name,Email,Ticket title,Paid date (UTC),Checkin Date (UTC),Ticket Price Paid",
    "GOOGE1,GOOGA1,Ada,Lovelace,ada@example.com,General Admission,2025-11-08 21:00:22+00:00,2025-11-09 13:54:09+00:00,0.00",
    "GOOGE2,GOOGA2,Grace,Hopper,grace@example.com,General Admission,2025-11-07 10:46:11+00:00,,0.00",
  ].join("\n");

  it("reads Checkin Date and Paid date columns", () => {
    const { attendance } = parseSourceCsv("community/2025-11-09-design-insights.csv", csv);
    expect(attendance).toHaveLength(2);
    expect(attendance[0]).toMatchObject({ email: "ada@example.com", checkedIn: true });
    expect(attendance[0]!.checkedInAt?.toISOString().slice(0, 10)).toBe("2025-11-09");
    expect(attendance[0]!.registeredAt?.toISOString().slice(0, 10)).toBe("2025-11-08");
    expect(attendance[1]!.checkedIn).toBe(false);
  });
});

describe("parseSourceCsv — roster (real membership-form export)", () => {
  const csv = [
    'Timestamp,Email Address,Full name (First name first),Gender ,Whatsapp number ,"Birthday\n(day and month only)",What Team(s) are you part of ?,Email Sent',
    "10/5/2025 15:34:06,ada@example.com....................,Ada Lovelace ,Female,+2348122229581,November 11,Data & AI,Yes",
    "10/5/2025 16:26:09,grace@example.com,Grace Hopper,Female,07044251887,August 26,Software Development,Yes",
    "10/5/2025 16:27:00,  not an email 0.,Broken Row,Male,08000000000,1 Jan,Design,Yes",
    "7/13/2026 16:35:14,late@example.com,Late Joiner,Female,08011111111,2 Feb,Design,Yes", // 13 in the SECOND slot proves month-first
  ].join("\n");

  it("classifies by filename, reads Timestamp as join date and Full name prefix", () => {
    const { roster, attendance } = parseSourceCsv("forms/membership-form-responses.csv", csv);
    expect(attendance).toHaveLength(0);
    expect(roster).toHaveLength(3); // whitespace-garbage email dropped
    expect(roster[1]).toMatchObject({ email: "grace@example.com", fullName: "Grace Hopper" });
  });

  it("detects month-first slash dates from the column itself (Google Forms exports)", () => {
    const { roster } = parseSourceCsv("forms/membership-form-responses.csv", csv);
    // 7/13/2026 proves month-first for this column, so 10/5/2025 = October 5.
    expect(roster[1]!.joinedAt?.toISOString().slice(0, 10)).toBe("2025-10-05");
    expect(roster[2]!.joinedAt?.toISOString().slice(0, 10)).toBe("2026-07-13");
  });

  it("sanitizes trailing-dot email typos to a usable identity key", () => {
    const { roster } = parseSourceCsv("forms/membership-form-responses.csv", csv);
    expect(roster[0]!.email).toBe("ada@example.com");
  });

  it("captures WhatsApp numbers for the matching pass", () => {
    const { roster } = parseSourceCsv("forms/membership-form-responses.csv", csv);
    expect(roster[0]!.whatsapp).toBe("+2348122229581");
    expect(roster[1]!.whatsapp).toBe("07044251887");
  });
});

describe("parseSourceCsv — roster (real Bevy members export)", () => {
  // The since-inception community.dev export: join date lives in
  // "created_date"; events_registered_count is deliberately NOT ingested
  // (it can't be windowed to the chapter year).
  const csv = [
    "first_name,last_name,email,company,title,created_date,events_registered_count",
    "Ada,Lovelace,ada@example.com,,,2024-09-13T15:04:20Z,12",
    "Grace,Hopper,grace@example.com,,,2026-05-01T10:00:00Z,0",
  ].join("\n");

  it("classifies by the members filename and reads created_date as the join date", () => {
    const { roster, attendance } = parseSourceCsv("community/members.csv", csv);
    expect(attendance).toHaveLength(0);
    expect(roster).toHaveLength(2);
    expect(roster[0]).toMatchObject({ email: "ada@example.com", fullName: "Ada Lovelace" });
    expect(roster[0]!.joinedAt?.toISOString().slice(0, 10)).toBe("2024-09-13");
    expect(roster[1]!.joinedAt?.toISOString().slice(0, 10)).toBe("2026-05-01");
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
