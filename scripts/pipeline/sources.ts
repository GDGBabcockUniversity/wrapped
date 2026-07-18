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
  whatsapp: string | null; // roster forms carry numbers — feeds phone matching
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
 * Dates in exports arrive as ISO, "Month D, YYYY", or slash dates. Slash
 * dates default to DAY-FIRST — this chapter's locale, and consistent with
 * the WhatsApp parser — but Google Forms exports are month-first, so
 * callers that hold a whole column can pass the order detected from it
 * (detectSlashOrder). Returns null rather than an Invalid Date.
 */
export type SlashOrder = "dmy" | "mdy";

export function parseSourceDate(value: string, order: SlashOrder = "dmy"): Date | null {
  const v = value.trim();
  if (!v) return null;

  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/);
  if (slash) {
    const a = parseInt(slash[1]!, 10);
    const b = parseInt(slash[2]!, 10);
    const day = order === "dmy" ? a : b;
    const month = order === "dmy" ? b : a;
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

/**
 * Given every slash-date in one column, decide its order from the data: a
 * first component >12 proves day-first, a second component >12 proves
 * month-first (313 of the real membership form's 507 timestamps do).
 * Ambiguous columns keep the locale default (day-first).
 */
export function detectSlashOrder(values: string[]): SlashOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}/);
    if (!m) continue;
    if (parseInt(m[1]!, 10) > 12) return "dmy";
    if (parseInt(m[2]!, 10) > 12) return "mdy";
  }
  return "dmy";
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
  whatsapp: number;
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
    // "Full name (First name first)" — membership form; prefix match, not anchored both ends.
    name: findColumn(h, [/^(full )?name$/, /^full name/, /^attendee name$/, /^guest name$/]),
    firstName: findColumn(h, [/^first name$/]),
    lastName: findColumn(h, [/^last name$/]),
    // "created date" (Bevy members export) and "Timestamp" (Google Forms)
    // come last: both are when-the-row-appeared stand-ins for a join date,
    // so an explicit join-date column always wins. Only the roster branch
    // ever reads this, so attendance files with created_at are unaffected.
    joinDate: findColumn(h, [/join(ed)?( date| at)?/, /member since/, /^date joined$/, /^created (date|at)$/, /^timestamp$/]),
    whatsapp: findColumn(h, [/whats ?app/, /^phone( number)?$/]),
    checkedIn: findColumn(h, [/^checked? in$/, /^attended$/, /check in status/]),
    // "Checkin Date (UTC)" — Bevy writes it without the space.
    checkedInAt: findColumn(h, [/check(ed)? ?in (at|time|date)/]),
    rsvpStatus: findColumn(h, [/approval status/, /rsvp status/, /^status$/, /^rsvp$/]),
    // "Paid date (UTC)" — Bevy's registration timestamp (all tickets are free).
    registeredAt: findColumn(h, [/regist(ered|ration)( at| date| time)?/, /rsvp (date|at)/, /created at/, /paid date/, /^added$/]),
    eventTitle: findColumn(h, [/^event( name| title)?$/]),
    eventDate: findColumn(h, [/event (date|start)/, /^start(s at| time| date)?$/]),
  };
}

/**
 * Identity-key hygiene for real-world form typos: strip embedded whitespace
 * and trailing dots ("ada@gmail.com....." is a real row), then validate.
 * Returns null when the value can't be an email.
 */
function sanitizeEmail(raw: string): string | null {
  const email = raw.replace(/\s+/g, "").replace(/\.+$/, "").toLowerCase();
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return null;
  return email;
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
    const joinOrder =
      cols.joinDate !== -1
        ? detectSlashOrder(rows.slice(1).map((r) => r[cols.joinDate] ?? ""))
        : "dmy";
    const roster: ExternalMember[] = [];
    for (const row of rows.slice(1)) {
      const email = sanitizeEmail(row[cols.email] ?? "");
      if (!email) continue;
      const whatsapp = cols.whatsapp !== -1 ? (row[cols.whatsapp] ?? "").trim() : "";
      roster.push({
        email,
        fullName: nameFrom(cols, row) ?? nameFromEmail(email),
        joinedAt: cols.joinDate !== -1 ? parseSourceDate(row[cols.joinDate] ?? "", joinOrder) : null,
        whatsapp: whatsapp || null,
        source: filename,
      });
    }
    return { roster, attendance: [] };
  }

  const fromFile = titleFromFilename(filename);
  const attendance: ExternalAttendance[] = [];
  for (const row of rows.slice(1)) {
    const email = sanitizeEmail(row[cols.email] ?? "");
    if (!email) continue;

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
