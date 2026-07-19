import fs from "node:fs";
import path from "node:path";
import { computeGroupChatStats, suggestTopSubgroup } from "./group-stats";
import { detectDateOrder, parseLine } from "./parse-whatsapp";
import { mergeExports } from "./merge-exports";
import { computeGroupTopics } from "./topics";

/**
 * Standalone group-stats + topics runner (build6 §6.4 operator flow) —
 * recomputes the Group Chat story's stats AND the topics engine from
 * data/exports/groups/*.txt, no DB connection needed (the full `run.ts`
 * pipeline requires Postgres; the chat stats never did). WhatsApp truncates
 * exports at ~40k messages, so multiple files can cover the same chat
 * across upload batches — merge-exports.ts (build6 §6.1) groups and dedupes
 * them before either analysis runs. Prints paste-ready GROUP_CHAT and
 * GROUP_TOPICS literals plus per-group tallies, merge reports, and month
 * coverage so the monthsMissing disclaimer can be recomputed honestly.
 *
 * Usage: npx tsx scripts/pipeline/run-group-stats.ts
 */

const YEAR_START = new Date(process.env.WRAPPED_YEAR_START ?? "2025-09-01T00:00:00");
const YEAR_END = new Date(process.env.WRAPPED_YEAR_END ?? "2026-08-01T00:00:00");

const groupsDir = path.join(process.cwd(), "data", "exports", "groups");
const rawFiles = fs
  .readdirSync(groupsDir)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => ({
    name: f,
    text: fs.readFileSync(path.join(groupsDir, f), "utf-8"),
  }));

if (rawFiles.length === 0) {
  console.error("No .txt files in data/exports/groups/ — nothing to compute.");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "data", "exports", "manifest.json");
const manifest: Record<string, string> = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
  : {};

for (const f of rawFiles) {
  console.log(`${f.name}: date order detected as ${detectDateOrder(f.text)}`);
}

const { exports: files, reports: mergeReports } = mergeExports(rawFiles, manifest);

console.log("\n=== export merge (build6 §6.1) ===");
for (const r of mergeReports) {
  console.log(`  ${r.chatId}: ${r.files} file(s), ${r.raw} raw, ${r.deduped} deduped, ${r.kept} kept`);
}

const result = computeGroupChatStats(files, YEAR_START, YEAR_END);
const m = result.main;

// Month coverage for the main chat — drives the monthsMissing disclaimer.
// Recomputed from raw lines here (group-stats aggregates don't expose it).
const mainFile = files.find((f) => /^main/i.test(f.name));
const monthCounts = new Map<string, number>();
if (mainFile) {
  const order = detectDateOrder(mainFile.text);
  for (const line of mainFile.text.split(/\r?\n/)) {
    const parsed = parseLine(line, order);
    if (parsed === "system" || parsed === null) continue;
    if (parsed.date < YEAR_START || parsed.date >= YEAR_END) continue;
    const key = parsed.date.toISOString().slice(0, 7);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
}

console.log("\n=== main chat month coverage ===");
for (const key of [...monthCounts.keys()].sort()) {
  console.log(`  ${key}: ${monthCounts.get(key)}`);
}

console.log("\n=== per-group message counts ===");
for (const g of result.perGroup) console.log(`  ${g.name}: ${g.messages}`);
const top = suggestTopSubgroup(result.perGroup);
console.log(`\nSuggested topSubgroup: ${top ? JSON.stringify(top) : "null"}`);

console.log("\n=== paste into lib/content/chapter.ts as GROUP_CHAT ===\n");
console.log(JSON.stringify(m, null, 2));

if (mainFile) {
  const topics = computeGroupTopics(
    mainFile.text,
    YEAR_START,
    YEAR_END,
    m.topYappers.map((y) => y.name)
  );
  console.log("\n=== paste into lib/content/chapter.ts as GROUP_TOPICS (build6 §6.2) ===\n");
  console.log(JSON.stringify(topics, null, 2));
} else {
  console.log("\nNo main chat export found — skipping the topics engine.");
}
