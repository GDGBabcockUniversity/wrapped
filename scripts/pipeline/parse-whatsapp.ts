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

const NOISY_BODIES = new Set([
  "this message was deleted",
  "you deleted this message",
]);

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

function normalizeSenderKey(raw: string): { key: string; isPhone: boolean } {
  const trimmed = raw.trim();
  const isPhoneLike = /^[+\d][\d\s-]+$/.test(trimmed);
  if (isPhoneLike) {
    return { key: trimmed.replace(/[^\d]/g, ""), isPhone: true };
  }
  return { key: trimmed, isPhone: false };
}

function cleanBody(body: string): { text: string; counts: boolean } {
  const stripped = body.replace(/<This message was edited>\s*$/, "").trim();
  if (NOISY_BODIES.has(stripped.toLowerCase())) {
    return { text: stripped, counts: false };
  }
  return { text: stripped, counts: true };
}

interface ParsedLine {
  date: Date;
  senderRaw: string;
  body: string;
}

function parseLine(rawLine: string): ParsedLine | "system" | null {
  const line = stripBidi(rawLine);

  const android = line.match(RE_ANDROID_MESSAGE);
  if (android) {
    const [, d, mo, y, h, mi, ampm, sender, body] = android;
    return {
      date: buildDate(+d!, +mo!, +y!, +h!, +mi!, 0, ampm),
      senderRaw: sender!,
      body: body!,
    };
  }

  const ios = line.match(RE_IOS_MESSAGE);
  if (ios) {
    const [, d, mo, y, h, mi, s, ampm, sender, body] = ios;
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
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      if (rawLine.trim() === "") continue;
      const parsed = parseLine(rawLine);

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
