export interface SenderStats {
  senderKey: string;
  isPhone: boolean;
  messageCount: number;
  firstAt: Date;
  lastAt: Date;
  dailyCounts: Record<string, number>; // "yyyy-mm-dd" -> count (drives burst + activeDays)
  monthlyCounts: Record<string, number>; // "yyyy-mm" -> count (drives peakMonthLabel)
}

// Android dialect (with sender): "24/08/2023, 09:43 - Ada Lovelace: hello"
const RE_ANDROID_MESSAGE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})\s?([ap]m)? - ([^:]+): ([\s\S]*)$/i;
// Android system line (no colon-separated sender): "24/08/2023, 09:43 - Messages are encrypted."
const RE_ANDROID_SYSTEM =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})\s?([ap]m)? - ([\s\S]*)$/i;
// iOS dialect (with sender): "[24/08/2023, 09:43:12 AM] Ada Lovelace: hello"
const RE_IOS_MESSAGE =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AP]M)?\] ([^:]+): ([\s\S]*)$/;
// iOS system line (bracketed timestamp, no colon-separated sender).
const RE_IOS_SYSTEM =
  /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AP]M)?\] ([\s\S]*)$/;

const BIDI_MARKS = /[‎‏‪-‮]/g;

/**
 * WhatsApp writes dates in the PHONE's locale — the 2026-07-19 full data
 * drop mixed day-first files (`27/10/2025, 21:39 -`, `[09/09/2025,
 * 01:03:22]`) with US month-first files (`[7/13/26, 10:50:57 PM]`) in the
 * same batch. Day-first parsing of a month-first file silently smears
 * messages into wrong months (10/3 → March 10) and even wrong YEARS
 * (slot2 > 12 rolls the JS Date over), so the order must be detected per
 * file, never assumed.
 */
export type DateOrder = "dmy" | "mdy";

const RE_ANY_TIMESTAMP = /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}), \d{1,2}:\d{2}/;

/** Scans a whole export and votes: a first slot > 12 is day-first
    evidence, a second slot > 12 is month-first evidence. Real exports span
    weeks, so decisive lines always exist; undecided files (possible only
    for tiny fixtures whose dates all sit ≤ 12/12) fall back to day-first,
    the community's norm. */
export function detectDateOrder(content: string): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const rawLine of content.split(/\r?\n/)) {
    const m = stripBidi(rawLine).match(RE_ANY_TIMESTAMP);
    if (!m) continue;
    const slot1 = +m[1]!;
    const slot2 = +m[2]!;
    if (slot1 > 12) dmy += 1;
    if (slot2 > 12) mdy += 1;
  }
  if (mdy > dmy) return "mdy";
  return "dmy";
}

// Prefix match, not exact — the real WhatsApp export format (verified
// against the 2026-07-19 main-chat export, build5 §5.1) has a trailing
// period ("This message was deleted.") and an admin-deletion variant
// ("This message was deleted by admin ~Name.") that an exact-string Set
// silently missed entirely, letting every deleted message count as real
// content. \b lets anything trail the phrase.
const DELETED_BODY_RE = /^(this message was deleted|you deleted this message)\b/i;

function stripBidi(line: string): string {
  return line.replace(BIDI_MARKS, "");
}

function to4DigitYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function to24Hour(hour: number, meridiem: string | undefined): number {
  if (!meridiem) return hour;
  const m = meridiem.toLowerCase();
  if (m === "am") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

/** Day-first date parsing, per the community's real export format. */
function buildDate(
  day: number,
  month: number,
  year: number,
  hour: number,
  minute: number,
  second: number,
  meridiem: string | undefined
): Date {
  return new Date(
    to4DigitYear(year),
    month - 1,
    day,
    to24Hour(hour, meridiem),
    minute,
    second
  );
}

export function normalizeSenderKey(raw: string): { key: string; isPhone: boolean } {
  const trimmed = raw.trim();
  const isPhoneLike = /^[+\d][\d\s-]+$/.test(trimmed);
  if (isPhoneLike) {
    return { key: trimmed.replace(/[^\d]/g, ""), isPhone: true };
  }
  return { key: trimmed, isPhone: false };
}

export function cleanBody(body: string): { text: string; counts: boolean } {
  const stripped = body.replace(/<This message was edited>\s*$/, "").trim();
  if (DELETED_BODY_RE.test(stripped)) {
    return { text: stripped, counts: false };
  }
  return { text: stripped, counts: true };
}

export interface ParsedLine {
  date: Date;
  senderRaw: string;
  body: string;
}

/** Exported for group-stats.ts (build5 §5.1) to reuse the dialect-parsing
    logic instead of duplicating the Android/iOS regexes. `order` comes from
    detectDateOrder() run once over the whole file — slot meaning flips per
    export, never per line. */
export function parseLine(rawLine: string, order: DateOrder = "dmy"): ParsedLine | "system" | null {
  const line = stripBidi(rawLine);

  const android = line.match(RE_ANDROID_MESSAGE);
  if (android) {
    const [, s1, s2, y, h, mi, ampm, sender, body] = android;
    const [d, mo] = order === "mdy" ? [s2, s1] : [s1, s2];
    return {
      date: buildDate(+d!, +mo!, +y!, +h!, +mi!, 0, ampm),
      senderRaw: sender!,
      body: body!,
    };
  }

  const ios = line.match(RE_IOS_MESSAGE);
  if (ios) {
    const [, s1, s2, y, h, mi, s, ampm, sender, body] = ios;
    const [d, mo] = order === "mdy" ? [s2, s1] : [s1, s2];
    return {
      date: buildDate(+d!, +mo!, +y!, +h!, +mi!, s ? +s : 0, ampm),
      senderRaw: sender!,
      body: body!,
    };
  }

  if (RE_ANDROID_SYSTEM.test(line) || RE_IOS_SYSTEM.test(line)) {
    return "system";
  }

  return null; // continuation of the previous message
}

/**
 * Parses one or more raw WhatsApp export texts into per-sender aggregate
 * stats. Message content is discarded immediately after determining whether
 * it counts — it is never returned, stored, or logged.
 */
export function parseWhatsAppExports(
  fileContents: string[],
  yearStart: Date,
  yearEnd: Date
): Map<string, SenderStats> {
  const stats = new Map<string, SenderStats>();

  for (const content of fileContents) {
    const order = detectDateOrder(content);
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      if (rawLine.trim() === "") continue;
      const parsed = parseLine(rawLine, order);

      // System lines and continuation lines never increment any count.
      if (parsed === "system" || parsed === null) continue;

      const { date, senderRaw, body } = parsed;
      if (date < yearStart || date >= yearEnd) continue;

      const { counts } = cleanBody(body);
      if (!counts) continue;

      const { key, isPhone } = normalizeSenderKey(senderRaw);
      const dayKey = date.toISOString().slice(0, 10);
      const monthKey = date.toISOString().slice(0, 7);

      const existing = stats.get(key);
      if (existing) {
        existing.messageCount += 1;
        existing.dailyCounts[dayKey] = (existing.dailyCounts[dayKey] ?? 0) + 1;
        existing.monthlyCounts[monthKey] = (existing.monthlyCounts[monthKey] ?? 0) + 1;
        if (date < existing.firstAt) existing.firstAt = date;
        if (date > existing.lastAt) existing.lastAt = date;
      } else {
        stats.set(key, {
          senderKey: key,
          isPhone,
          messageCount: 1,
          firstAt: date,
          lastAt: date,
          dailyCounts: { [dayKey]: 1 },
          monthlyCounts: { [monthKey]: 1 },
        });
      }
    }
  }

  return stats;
}
