/**
 * Multi-source ingestion: community.dev (Bevy), Luma, and ORBIT CSV exports.
 *
 * Files live under data/sources/ (gitignored), any nesting:
 *   data/sources/community/members.csv          -> roster (has a join-date column)
 *   data/sources/community/2025-11-08-devfest.csv -> attendance (title from filename)
 *   data/sources/luma/orbit-kickoff.csv          -> attendance (Luma guest export)
 *   data/sources/orbit/sessions.csv              -> attendance
 *
 * Classification is by content, not directory: a CSV with a join-date-ish
 * column and no per-event columns is a roster; everything else is attendance
 * for ONE event, whose title comes from an event column when present or from
 * the filename (an optional YYYY-MM-DD prefix becomes the event date).
 *
 * Only emails, names, and timestamps are read. Rows without an email are
 * skipped — email is the cross-platform identity key.
 */

export interface ExternalMember {
  email: string; // lowercased
  fullName: string;
  joinedAt: Date | null;
  source: string; // filename
}

export interface ExternalAttendance {
  email: string; // lowercased
  fullName: string | null;
  eventTitle: string;
  eventDate: Date | null;
  registeredAt: Date | null;
  checkedIn: boolean;
  checkedInAt: Date | null;
  source: string; // filename
}

export interface ExternalData {
  roster: ExternalMember[];
  attendance: ExternalAttendance[];
}

/** RFC-4180-ish CSV: quoted fields, escaped quotes, CRLF tolerant. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Dates in exports arrive as ISO, "Month D, YYYY", or D/M/YYYY. Slash dates
 * are read DAY-FIRST — this chapter's locale, and consistent with the
 * WhatsApp parser. Returns null rather than an Invalid Date.
 */
export function parseSourceDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;

  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/);
  if (slash) {
    const day = parseInt(slash[1]!, 10);
    const month = parseInt(slash[2]!, 10);
    let year = parseInt(slash[3]!, 10);
    if (year < 100) year += 2000;
    if (month > 12 || day > 31) return null;
    const hours = slash[4] ? parseInt(slash[4], 10) : 0;
    const minutes = slash[5] ? parseInt(slash[5], 10) : 0;
    return new Date(Date.UTC(year, month - 1, day, hours, minutes));
  }

  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const NEGATIVE_STATUS = new Set([
  "no",
  "false",
  "0",
  "n",
  "not checked in",
  "did not attend",
  "no show",
  "absent",
]);
const NEGATIVE_RSVP = new Set([
  "declined",
  "not going",
  "cancelled",
  "canceled",
  "waitlist",
  "waitlisted",
  "invited",
  "rejected",
  "pending",
]);

function truthyCheckin(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (NEGATIVE_STATUS.has(v)) return false;
  return true; // "yes", "true", "checked in", or a timestamp all count
}

/** "2025-11-08-devfest-babcock.csv" -> { title: "devfest babcock", date: 2025-11-08 } */
export function titleFromFilename(filename: string): { title: string; date: Date | null } {
  const base = filename.replace(/\.[^.]+$/, "").split("/").pop() ?? filename;
  const dateMatch = base.match(/^(\d{4})-(\d{2})-(\d{2})[-_ ]*/);
  let date: Date | null = null;
  let rest = base;
  if (dateMatch) {
    date = new Date(Date.UTC(+dateMatch[1]!, +dateMatch[2]! - 1, +dateMatch[3]!));
    rest = base.slice(dateMatch[0].length);
  }
  const title = rest.replace(/[-_]+/g, " ").trim() || base;
  return { title, date };
}

export function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

interface ColumnMap {
  email: number;
  name: number;
  firstName: number;
  lastName: number;
  joinDate: number;
  checkedIn: number;
  checkedInAt: number;
  rsvpStatus: number;
  registeredAt: number;
  eventTitle: number;
  eventDate: number;
}

function mapColumns(headers: string[]): ColumnMap {
  const h = headers.map((x) => x.trim().toLowerCase().replace(/[_-]+/g, " "));
  return {
    email: findColumn(h, [/^e?mail$/, /e-?mail/]),
    name: findColumn(h, [/^(full )?name$/, /^attendee name$/, /^guest name$/]),
    firstName: findColumn(h, [/^first name$/]),
    lastName: findColumn(h, [/^last name$/]),
    joinDate: findColumn(h, [/join(ed)?( date| at)?/, /member since/, /^date joined$/]),
    checkedIn: findColumn(h, [/^checked? in$/, /^attended$/, /check in status/]),
    checkedInAt: findColumn(h, [/checked? in (at|time|date)/]),
    rsvpStatus: findColumn(h, [/approval status/, /rsvp status/, /^status$/, /^rsvp$/]),
    registeredAt: findColumn(h, [/regist(ered|ration)( at| date| time)?/, /rsvp (date|at)/, /created at/, /^added$/]),
    eventTitle: findColumn(h, [/^event( name| title)?$/]),
    eventDate: findColumn(h, [/event (date|start)/, /^start(s at| time| date)?$/]),
  };
}

/** "no-name@x.com" -> "No Name" — last-resort display name. */
function nameFromEmail(email: string): string {
  return email
    .split("@")[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function nameFrom(cols: ColumnMap, row: string[]): string | null {
  if (cols.name !== -1 && row[cols.name]?.trim()) return row[cols.name]!.trim();
  const first = cols.firstName !== -1 ? (row[cols.firstName] ?? "").trim() : "";
  const last = cols.lastName !== -1 ? (row[cols.lastName] ?? "").trim() : "";
  const combined = `${first} ${last}`.trim();
  return combined || null;
}

/**
 * Parse one export file into roster or attendance records. Pure — takes the
 * filename (for classification + event title) and raw text.
 */
export function parseSourceCsv(filename: string, text: string): ExternalData {
  const rows = parseCsv(text);
  if (rows.length < 2) return { roster: [], attendance: [] };

  const headers = rows[0]!;
  const cols = mapColumns(headers);
  if (cols.email === -1) {
    console.warn(`sources: ${filename} has no email column — skipped.`);
    return { roster: [], attendance: [] };
  }

  const hasEventSignal =
    cols.checkedIn !== -1 || cols.checkedInAt !== -1 || cols.rsvpStatus !== -1 || cols.eventTitle !== -1;
  const isRoster = !hasEventSignal && (cols.joinDate !== -1 || /member|roster|audience/i.test(filename));

  if (isRoster) {
    const roster: ExternalMember[] = [];
    for (const row of rows.slice(1)) {
      const email = (row[cols.email] ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) continue;
      roster.push({
        email,
        fullName: nameFrom(cols, row) ?? nameFromEmail(email),
        joinedAt: cols.joinDate !== -1 ? parseSourceDate(row[cols.joinDate] ?? "") : null,
        source: filename,
      });
    }
    return { roster, attendance: [] };
  }

  const fromFile = titleFromFilename(filename);
  const attendance: ExternalAttendance[] = [];
  for (const row of rows.slice(1)) {
    const email = (row[cols.email] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;

    const rsvp = cols.rsvpStatus !== -1 ? (row[cols.rsvpStatus] ?? "").trim().toLowerCase() : "";
    if (rsvp && NEGATIVE_RSVP.has(rsvp)) continue; // never actually registered

    const checkedInAt =
      cols.checkedInAt !== -1 ? parseSourceDate(row[cols.checkedInAt] ?? "") : null;
    const checkedIn =
      checkedInAt !== null ||
      (cols.checkedIn !== -1 && truthyCheckin(row[cols.checkedIn] ?? "")) ||
      // Luma exports often signal check-in ONLY via a non-empty checked_in_at;
      // a raw timestamp string that failed date-parse still means "was there".
      (cols.checkedInAt !== -1 && (row[cols.checkedInAt] ?? "").trim() !== "" &&
        !NEGATIVE_STATUS.has((row[cols.checkedInAt] ?? "").trim().toLowerCase()));

    const rowTitle =
      cols.eventTitle !== -1 && row[cols.eventTitle]?.trim()
        ? row[cols.eventTitle]!.trim()
        : fromFile.title;
    const rowEventDate =
      cols.eventDate !== -1 ? parseSourceDate(row[cols.eventDate] ?? "") ?? fromFile.date : fromFile.date;

    attendance.push({
      email,
      fullName: nameFrom(cols, row),
      eventTitle: rowTitle,
      eventDate: rowEventDate,
      registeredAt: cols.registeredAt !== -1 ? parseSourceDate(row[cols.registeredAt] ?? "") : null,
      checkedIn,
      checkedInAt,
      source: filename,
    });
  }
  return { roster: [], attendance };
}

/** Merge many parsed files into one ExternalData. */
export function combineExternal(parts: ExternalData[]): ExternalData {
  return {
    roster: parts.flatMap((p) => p.roster),
    attendance: parts.flatMap((p) => p.attendance),
  };
}
