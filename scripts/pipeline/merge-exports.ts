import { detectDateOrder, parseLine, normalizeSenderKey } from "./parse-whatsapp";

/**
 * Merges the queued WhatsApp exports before analysis (build6 §6.1).
 * WhatsApp truncates exports at ~40k messages, so a single chat's full
 * history can arrive as multiple overlapping .txt files across upload
 * batches. Files are grouped by chat, overlapping lines are deduped, and
 * each chat's kept RAW lines are re-concatenated — group-stats.ts and
 * topics.ts both already know how to parse a raw export, so merging at the
 * line level (not re-serializing parsed messages) means neither downstream
 * consumer needs to change shape.
 */

export interface MergeReport {
  chatId: string;
  files: number;
  raw: number;
  deduped: number;
  kept: number;
}

export interface MergeResult {
  /** One merged `{name, text}` pair per chat — `name` is the resolved chat
      id, ready to feed straight into computeGroupChatStats / topics.ts the
      same way a single raw file would. */
  exports: { name: string; text: string }[];
  reports: MergeReport[];
}

const WHATSAPP_DEFAULT_RE = /^WhatsApp Chat with (.+)$/i;

/** Resolves a filename to a chat id: the manifest escape hatch first (exact
    filename, with or without .txt), then the prefix before the first `__`,
    then WhatsApp's own default export name, then the filename itself. */
export function chatIdForFile(filename: string, manifest: Record<string, string> = {}): string {
  const base = filename.replace(/\.txt$/i, "");
  if (manifest[filename]) return manifest[filename]!;
  if (manifest[base]) return manifest[base]!;

  const dunder = base.indexOf("__");
  if (dunder > 0) return base.slice(0, dunder).toLowerCase();

  const wa = base.match(WHATSAPP_DEFAULT_RE);
  if (wa) return wa[1]!.trim().toLowerCase().replace(/\s+/g, "-");

  return base.toLowerCase();
}

/** (minute-resolution timestamp, senderKey, first 40 chars of body) —
    exports of overlapping windows produce byte-identical lines; minute
    resolution absorbs the second-precision difference between the iOS and
    Android dialects. */
export function dedupeKey(date: Date, senderKey: string, body: string): string {
  return `${date.toISOString().slice(0, 16)}|${senderKey}|${body.slice(0, 40)}`;
}

export function mergeExports(
  files: { name: string; text: string }[],
  manifest: Record<string, string> = {}
): MergeResult {
  const byChat = new Map<string, { name: string; text: string }[]>();
  for (const f of files) {
    const chatId = chatIdForFile(f.name, manifest);
    const arr = byChat.get(chatId) ?? [];
    arr.push(f);
    byChat.set(chatId, arr);
  }

  const exports: { name: string; text: string }[] = [];
  const reports: MergeReport[] = [];

  for (const [chatId, chatFiles] of byChat) {
    const seen = new Set<string>();
    const keptLines: string[] = [];
    let raw = 0;

    for (const file of chatFiles) {
      const order = detectDateOrder(file.text);
      for (const rawLine of file.text.split(/\r?\n/)) {
        if (rawLine.trim() === "") continue;
        const parsed = parseLine(rawLine, order);
        if (parsed === "system" || parsed === null) {
          // System/continuation lines have no independent identity to
          // dedupe on — always kept, unchanged.
          keptLines.push(rawLine);
          continue;
        }
        raw += 1;
        const { key } = normalizeSenderKey(parsed.senderRaw);
        const dk = dedupeKey(parsed.date, key, parsed.body);
        if (seen.has(dk)) continue;
        seen.add(dk);
        keptLines.push(rawLine);
      }
    }

    exports.push({ name: chatId, text: keptLines.join("\n") });
    reports.push({ chatId, files: chatFiles.length, raw, deduped: raw - seen.size, kept: seen.size });
  }

  return { exports, reports };
}
