import { PEOPLE } from "@/lib/content/chapter";
import { classifyExport, type ClassifiedMessage } from "./group-stats";

/**
 * The topics engine (build6 §6.2) — audits WHAT the group chat talked
 * about, not just who/when/how much. Same privacy discipline as
 * group-stats.ts: message content is read only to classify and count; what
 * this module returns is aggregate numbers and short curated strings, never
 * raw message bodies (the one exception, `longestMessage`, ships a char
 * count and a sender, never the content).
 */

export interface WordCount {
  word: string;
  count: number;
}
export interface EmojiCount {
  emoji: string;
  count: number;
}
export interface TopicBucket {
  name: string;
  count: number;
}
export interface NameDrop {
  name: string;
  count: number;
}
export interface LinkDomain {
  domain: string;
  count: number;
}
export interface Starter {
  name: string;
  count: number;
}

export interface GroupTopicsResult {
  wordsOfYear: WordCount[]; // top 15
  emojiLeaderboard: EmojiCount[]; // top 8
  topicBuckets: TopicBucket[]; // every bucket, sorted desc
  nameDrops: NameDrop[]; // top 5
  linksTotal: number;
  linkDomains: LinkDomain[]; // sorted desc
  questionsCount: number;
  shouter: { name: string; count: number } | null;
  longestMessage: { chars: number; sender: string } | null; // content never shipped
  starters: Starter[]; // top 3
}

// Standard English noise + chat-specific noise (build6 §6.2.1). Owner may
// re-curate before freeze — plain data, not logic.
export const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "this",
  "that", "have", "has", "had", "was", "were", "from", "they", "them",
  "their", "what", "when", "where", "who", "why", "how", "can", "could",
  "would", "should", "about", "into", "over", "under", "than", "there",
  "here", "its", "im", "the", "of", "to", "in", "on", "at", "is", "be",
  "or", "if", "so", "we", "us", "our", "my", "me", "get", "got", "one",
  "all", "too", "let", "did", "more", "now", "see",
  "dont", "thats", "like", "just", "good", "know", "want", "need", "time",
  "going", "still", "make", "then", "well", "also", "really", "right",
  "guys", "please", "okay", "yeah", "will", "thanks", "media", "omitted",
]);

// build7 §3.2: pidgin/slang worth keeping even though it's short — without
// this, the <4-char and no-vowel junk filters below would eat real chapter
// vocabulary. Owner can extend before freeze.
export const SLANG_WHITELIST = new Set([
  "sha", "dey", "omo", "una", "abeg", "abi", "sef", "wey", "gan", "nau",
  "haba", "ehn", "oya", "fam", "wahala",
]);

const RE_HAS_VOWEL = /[aeiou]/;

/** True for tokens that are noise, not vocabulary — the owner's "tf is pts?"
    A word of the year should be a word a human recognises: at least 4 chars
    (unless it's known slang) and not a consonant-only fragment like `pts`,
    `pvt`, `gdg`. */
export function isJunkWord(word: string): boolean {
  if (SLANG_WHITELIST.has(word)) return false;
  if (word.length < 4) return true;
  if (!RE_HAS_VOWEL.test(word)) return true;
  return false;
}

// Curated topic buckets (build6 §6.2.3) — whole-word/whole-phrase,
// case-insensitive. Plain data, exported so the owner can re-curate any
// list before freeze without touching the engine.
export const TOPIC_BUCKETS: Record<string, string[]> = {
  "EXAMS & SCHOOL": [
    "exam", "exams", "test", "cbt", "gst", "course", "carryover", "lecture",
    "assignment", "project", "defense", "result", "gpa", "cgpa",
  ],
  MONEY: [
    "money", "broke", "pay", "paid", "transfer", "account", "urgent 2k",
    "funds", "naira", "dollar", "price",
  ],
  FOOD: ["food", "rice", "chicken", "shawarma", "cafeteria", "cafe", "hungry", "eat", "chow"],
  FOOTBALL: ["match", "goal", "arsenal", "chelsea", "barca", "madrid", "united", "city", "ucl", "penalty"],
  "LOVE & VAL": ["valentine", "val", "crush", "date", "relationship", "single", "talking stage"],
  TECH: ["code", "coding", "bug", "deploy", "figma", "react", "python", "api", "laptop", "backend", "frontend", "ai", "gpt"],
  EVENTS: ["orbit", "devfest", "meetup", "allstars", "hackathon", "game night"],
  SPIRITUAL: ["church", "chapel", "pastor", "prayer", "fast", "vespers"],
};

const RE_WORD = /[a-z']{3,}/gi;
// A "cluster" groups a base emoji with a trailing skin-tone modifier,
// variation selector (U+FE0F), or a zero-width-joined (U+200D) follow-up
// emoji (flags, families, etc.) so a compound emoji counts as one, not
// several. Built with `new RegExp` + explicit \u escapes rather than a
// literal, since a couple of these code points render invisibly in source.
const RE_EMOJI_CLUSTER = new RegExp(
  "\\p{Extended_Pictographic}(?:\\p{Emoji_Modifier}|\u{FE0F}|\u{200D}\\p{Extended_Pictographic})*",
  "gu"
);
// Captures ONE word after "@" — a greedy multi-word capture has no way to
// tell a two/three-word display name apart from a mention that's simply
// followed by more sentence ("@Chido check this" must not swallow "check").
// A single word undercounts multi-word names sometimes, but never over-
// counts, and the whole engine is explicitly curatable data (build6 §6.2).
const RE_MENTION = /@([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*)/g;
const RE_URL = /https?:\/\/[^\s]+/gi;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isDisplaySender(key: string): boolean {
  // Same exclusion as group-stats.ts's topYappers — unsaved contacts and
  // bare phone numbers aren't a "who", so they never lead a leaderboard.
  return !key.startsWith("~") && !/^\d+$/.test(key);
}

// WhatsApp writes member-action and admin-action notices ("X joined using
// a group link", "X changed this group's settings to allow...") in the
// SAME sender:body shape as a real message, with no colon-free system
// line to catch — parse-whatsapp.ts's system-line detection can't see
// them. They're unmistakable content-wise, though: the body repeats the
// message's own sender name verbatim as its opening words, which a real
// chat message essentially never does. A short list of WhatsApp's own
// fixed banner text (not tied to any actor) catches the rest. This filter
// only shapes topics.ts's own word/starter analysis — it does not touch
// group-stats.ts's message counts, which stay exactly as already shipped.
const KNOWN_SYSTEM_PHRASES = ["messages and calls are end-to-end encrypted"];
// A sent sticker/photo/video is a real conversational contribution — it
// counts toward GROUP_CHAT.messages same as ever — but its placeholder
// text ("sticker omitted") isn't a word anyone typed, so it doesn't belong
// in a word-frequency count.
const MEDIA_PLACEHOLDER_RE = /^(sticker|image|video|gif|audio|document) omitted$/i;

function isSystemNoise(senderKey: string, text: string): boolean {
  const lower = text.toLowerCase();
  if (MEDIA_PLACEHOLDER_RE.test(text)) return true;
  if (KNOWN_SYSTEM_PHRASES.some((p) => lower.startsWith(p))) return true;
  return text === senderKey || text.startsWith(`${senderKey} `);
}

function nameStopwords(extraDisplayNames: string[]): Set<string> {
  const set = new Set<string>();
  for (const name of [...PEOPLE.map((p) => p.name), ...extraDisplayNames]) {
    for (const tok of name.toLowerCase().split(/\s+/)) {
      if (tok.length >= 2) set.add(tok);
    }
  }
  return set;
}

function wordsOfYear(messages: ClassifiedMessage[], nameStops: Set<string>): WordCount[] {
  const counts = new Map<string, number>();
  for (const m of messages) {
    // Strip URLs first — "https"/"com"/"www" are link fragments, not words.
    const withoutLinks = m.cleanedText.replace(RE_URL, " ");
    const matches = withoutLinks.toLowerCase().match(RE_WORD);
    if (!matches) continue;
    for (const w of matches) {
      if (STOPWORDS.has(w) || nameStops.has(w) || isJunkWord(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([word, count]) => ({ word, count }));
}

function emojiLeaderboard(messages: ClassifiedMessage[]): EmojiCount[] {
  const counts = new Map<string, number>();
  for (const m of messages) {
    const matches = m.cleanedText.match(RE_EMOJI_CLUSTER);
    if (!matches) continue;
    for (const e of matches) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([emoji, count]) => ({ emoji, count }));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function topicBuckets(messages: ClassifiedMessage[]): TopicBucket[] {
  const counts = new Map<string, number>(Object.keys(TOPIC_BUCKETS).map((k) => [k, 0]));
  const bucketRegexes = Object.entries(TOPIC_BUCKETS).map(([bucket, phrases]) => ({
    bucket,
    re: new RegExp(`\\b(?:${phrases.map(escapeRegExp).join("|")})\\b`, "gi"),
  }));
  for (const m of messages) {
    for (const { bucket, re } of bucketRegexes) {
      re.lastIndex = 0;
      const matches = m.cleanedText.match(re);
      if (matches) counts.set(bucket, (counts.get(bucket) ?? 0) + matches.length);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

function nameDrops(messages: ClassifiedMessage[]): NameDrop[] {
  const counts = new Map<string, number>();
  for (const m of messages) {
    RE_MENTION.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = RE_MENTION.exec(m.cleanedText))) {
      const name = match[1]!.trim();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
}

function domainBucket(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("youtube") || host === "youtu.be") return "youtube";
    if (host.includes("tiktok")) return "tiktok";
    if (host === "x.com" || host.includes("twitter")) return "x/twitter";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("chat.whatsapp.com") || host === "wa.me") return "whatsapp invite";
    return "other";
  } catch {
    return "other";
  }
}

function linkStats(messages: ClassifiedMessage[]): { total: number; domains: LinkDomain[] } {
  let total = 0;
  const domainCounts = new Map<string, number>();
  for (const m of messages) {
    const matches = m.cleanedText.match(RE_URL);
    if (!matches) continue;
    for (const url of matches) {
      total += 1;
      const bucket = domainBucket(url);
      domainCounts.set(bucket, (domainCounts.get(bucket) ?? 0) + 1);
    }
  }
  const domains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, count }));
  return { total, domains };
}

function questionsCount(messages: ClassifiedMessage[]): number {
  return messages.filter((m) => m.cleanedText.trim().endsWith("?")).length;
}

function isShout(text: string): boolean {
  if (text.length < 8) return false;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length >= 0.9;
}

function shouter(messages: ClassifiedMessage[]): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (!isDisplaySender(m.senderKey) || !isShout(m.cleanedText)) continue;
    counts.set(m.senderKey, (counts.get(m.senderKey) ?? 0) + 1);
  }
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) if (!best || count > best.count) best = { name, count };
  return best;
}

function longestMessage(messages: ClassifiedMessage[]): { chars: number; sender: string } | null {
  let best: { chars: number; sender: string } | null = null;
  for (const m of messages) {
    if (!isDisplaySender(m.senderKey)) continue;
    const chars = m.cleanedText.length;
    if (!best || chars > best.chars) best = { chars, sender: m.senderKey };
  }
  return best;
}

function starters(messages: ClassifiedMessage[]): Starter[] {
  const sorted = [...messages].sort((a, b) => a.date.getTime() - b.date.getTime());
  const counts = new Map<string, number>();
  let prev: Date | null = null;
  for (const m of sorted) {
    const isFirstOrAfterSilence = !prev || m.date.getTime() - prev.getTime() >= SIX_HOURS_MS;
    if (isFirstOrAfterSilence && isDisplaySender(m.senderKey)) {
      counts.set(m.senderKey, (counts.get(m.senderKey) ?? 0) + 1);
    }
    prev = m.date;
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
}

/**
 * Computes every topics metric from one chat's merged export text. `text`
 * should already be through mergeExports (build6 §6.1) when multiple
 * truncated files cover the same chat. `extraNameStopwords` lets the
 * caller pass the chat's own top-yapper display names (computed by
 * group-stats.ts) so words-of-the-year excludes them too, alongside the
 * static PEOPLE roster.
 */
export function computeGroupTopics(
  text: string,
  yearStart: Date,
  yearEnd: Date,
  extraNameStopwords: string[] = []
): GroupTopicsResult {
  const messages = classifyExport(text, yearStart, yearEnd).filter(
    (m) => m.counts && !isSystemNoise(m.senderKey, m.cleanedText)
  );
  const nameStops = nameStopwords(extraNameStopwords);
  const links = linkStats(messages);
  return {
    wordsOfYear: wordsOfYear(messages, nameStops),
    emojiLeaderboard: emojiLeaderboard(messages),
    topicBuckets: topicBuckets(messages),
    nameDrops: nameDrops(messages),
    linksTotal: links.total,
    linkDomains: links.domains,
    questionsCount: questionsCount(messages),
    shouter: shouter(messages),
    longestMessage: longestMessage(messages),
    starters: starters(messages),
  };
}
