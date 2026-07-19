import { parseLine, cleanBody, normalizeSenderKey, detectDateOrder } from "./parse-whatsapp";

/**
 * Computes the Group Chat story's fun stats (build5 §4-§5) from raw
 * WhatsApp exports. Message content is inspected only to classify a line
 * (sticker? deleted? a dialect word? a laugh emoji?) and is never returned,
 * stored, or logged — same discipline as parse-whatsapp.ts.
 */

export interface TopYapper {
  name: string;
  count: number;
}

export interface DialectCount {
  word: string;
  count: number;
}

export interface GroupChatStats {
  messages: number;
  senders: number;
  topYappers: TopYapper[];
  busiestDay: { label: string; count: number };
  peakHourLabel: string;
  afterMidnight: number;
  stickers: number;
  deleted: number;
  laughs: number;
  dialect: DialectCount[];
  streakDays: number;
}

export interface GroupStatsResult {
  main: GroupChatStats;
  perGroup: { name: string; messages: number }[];
}

// Fixed word list (build5 §4.1/§5.1) — whole-word, case-insensitive,
// media lines excluded (they never reach the counted set with real text).
const DIALECT_WORDS = ["sha", "dey", "abeg", "una", "omo"];
const LAUGH_CHARS = ["😂", "💀", "🤣"];
const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function dayLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${hour < 12 ? "AM" : "PM"}`;
}

interface ClassifiedMessage {
  date: Date;
  senderKey: string;
  counts: boolean; // false only for a deleted-message body
  cleanedText: string;
}

/** Parses one export's raw text into classified messages — reuses
    parse-whatsapp.ts's line matching so both pipelines agree on what a
    "message" is. Unlike parseWhatsAppExports, deleted-message lines are
    KEPT (with counts=false) rather than dropped, because this module needs
    to count them (build5 §5.1's `deleted` stat). */
function classifyExport(content: string, yearStart: Date, yearEnd: Date): ClassifiedMessage[] {
  const out: ClassifiedMessage[] = [];
  const order = detectDateOrder(content);
  for (const rawLine of content.split(/\r?\n/)) {
    if (rawLine.trim() === "") continue;
    const parsed = parseLine(rawLine, order);
    if (parsed === "system" || parsed === null) continue;

    const { date, senderRaw, body } = parsed;
    if (date < yearStart || date >= yearEnd) continue;

    const { text, counts } = cleanBody(body);
    const { key } = normalizeSenderKey(senderRaw);
    out.push({ date, senderKey: key, counts, cleanedText: text });
  }
  return out;
}

/** Longest run of consecutive calendar days with at least one message. */
function longestStreak(dayKeys: Set<string>): number {
  const sorted = [...dayKeys].sort();
  let best = 0;
  let current = 0;
  let prevDate: Date | null = null;
  for (const key of sorted) {
    const date = new Date(`${key}T00:00:00Z`);
    if (prevDate && date.getTime() - prevDate.getTime() === 86_400_000) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
    prevDate = date;
  }
  return best;
}

function computeStats(messages: ClassifiedMessage[]): GroupChatStats {
  const counted = messages.filter((m) => m.counts);
  const deleted = messages.length - counted.length;

  const senderCounts = new Map<string, number>();
  const dailyCounts = new Map<string, number>();
  const hourlyCounts = new Map<number, number>();
  const dialectCounts = new Map<string, number>(DIALECT_WORDS.map((w) => [w, 0]));
  let stickers = 0;
  let laughs = 0;
  let afterMidnight = 0;

  for (const m of counted) {
    senderCounts.set(m.senderKey, (senderCounts.get(m.senderKey) ?? 0) + 1);

    const dayKey = m.date.toISOString().slice(0, 10);
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);

    const hour = m.date.getHours();
    hourlyCounts.set(hour, (hourlyCounts.get(hour) ?? 0) + 1);
    if (hour < 5) afterMidnight += 1;

    const lower = m.cleanedText.toLowerCase();
    if (lower.includes("sticker omitted")) stickers += 1;

    for (const ch of LAUGH_CHARS) {
      const matches = m.cleanedText.match(new RegExp(ch, "gu"));
      if (matches) laughs += matches.length;
    }
    for (const word of DIALECT_WORDS) {
      const matches = lower.match(new RegExp(`\\b${word}\\b`, "gi"));
      if (matches) dialectCounts.set(word, (dialectCounts.get(word) ?? 0) + matches.length);
    }
  }

  // Top yappers: excludes unsaved contacts ("~..." display names) and
  // phone-number senders (build5 §5.1).
  const topYappers = [...senderCounts.entries()]
    .filter(([key]) => !key.startsWith("~") && !/^\d+$/.test(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  let busiestDayKey = "";
  let busiestCount = 0;
  for (const [key, count] of dailyCounts) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestDayKey = key;
    }
  }
  const busiestDay = busiestDayKey
    ? { label: dayLabel(new Date(`${busiestDayKey}T00:00:00Z`)), count: busiestCount }
    : { label: "", count: 0 };

  let peakHour = 0;
  let peakHourCount = -1;
  for (const [hour, count] of hourlyCounts) {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = hour;
    }
  }

  return {
    messages: counted.length,
    senders: senderCounts.size,
    topYappers,
    busiestDay,
    peakHourLabel: hourLabel(peakHour),
    afterMidnight,
    stickers,
    deleted,
    laughs,
    dialect: DIALECT_WORDS.map((word) => ({ word, count: dialectCounts.get(word) ?? 0 })),
    streakDays: longestStreak(new Set(dailyCounts.keys())),
  };
}

const ZERO_STATS: GroupChatStats = {
  messages: 0,
  senders: 0,
  topYappers: [],
  busiestDay: { label: "", count: 0 },
  peakHourLabel: "",
  afterMidnight: 0,
  stickers: 0,
  deleted: 0,
  laughs: 0,
  dialect: DIALECT_WORDS.map((word) => ({ word, count: 0 })),
  streakDays: 0,
};

/**
 * Computes the main group's fun stats plus a per-group message tally
 * (build5 §5.1). `exports` are `{ name, text }` pairs from
 * `data/exports/groups/*.txt` (build5 §5.2) — `name` is the filename sans
 * extension. The file named `main` (case-insensitive) supplies `main`;
 * every file (including `main`) contributes to `perGroup`.
 */
export function computeGroupChatStats(
  exports: { name: string; text: string }[],
  yearStart: Date,
  yearEnd: Date
): GroupStatsResult {
  let main = ZERO_STATS;
  const perGroup: { name: string; messages: number }[] = [];

  for (const { name, text } of exports) {
    const classified = classifyExport(text, yearStart, yearEnd);
    const messageCount = classified.filter((m) => m.counts).length;
    perGroup.push({ name, messages: messageCount });
    if (/^main/i.test(name)) {
      main = computeStats(classified);
    }
  }

  return { main, perGroup };
}

/** The top non-main group by message volume — the `topSubgroup` suggestion
    printed by the pipeline report (build5 §5.3), null until a subgroup
    export exists. */
export function suggestTopSubgroup(
  perGroup: { name: string; messages: number }[]
): { name: string; messages: number } | null {
  const candidates = perGroup.filter((g) => !/^main/i.test(g.name));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, g) => (g.messages > best.messages ? g : best));
}
