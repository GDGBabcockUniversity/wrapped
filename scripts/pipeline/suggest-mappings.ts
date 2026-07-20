import fs from "node:fs";
import path from "node:path";
import { parseSourceCsv, combineExternal, type ExternalData } from "./sources";
import { parseWhatsAppExports } from "./parse-whatsapp";
import { nameSimilarity } from "./match-members";

/**
 * Token-based mapping candidates for data/mapping.json curation. Phone
 * senders auto-match against roster WhatsApp numbers already; the 98% of
 * message volume keyed by address-book display names ("Sharon Operations
 * Lead", "Hack13") needs a human-curated mapping.json — this script makes
 * that curation fast. For every name-keyed sender it scores the whole
 * cross-source people pool (community roster + attendance names) by token
 * overlap — exact token, close token (levenshtein sim >= 0.8), or long
 * substring (>= 4 chars, catches "Neku" in "Chukwuneku") — against full
 * name AND email local part, then writes data/mapping-candidates.csv with
 * the top 3 candidates per sender, biggest senders first. Suggestions only:
 * a human copies the confirmed ones into data/mapping.json as
 * {"<senderKey>": "<email>"}.
 *
 * Usage: npx tsx scripts/pipeline/suggest-mappings.ts
 */

const YEAR_START = new Date(process.env.WRAPPED_YEAR_START ?? "2025-09-01T00:00:00Z");
const YEAR_END = new Date(process.env.WRAPPED_YEAR_END ?? "2026-08-01T00:00:00Z");
const DATA_DIR = path.join(process.cwd(), "data");

const sourcesDir = path.join(DATA_DIR, "sources");
const parts: ExternalData[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".csv"))
      parts.push(parseSourceCsv(path.relative(sourcesDir, full), fs.readFileSync(full, "utf-8")));
  }
};
walk(sourcesDir);
const external = combineExternal(parts);

// One candidate per unique email; roster names win over attendance names.
const people = new Map<string, { name: string; email: string }>();
for (const a of external.attendance) {
  if (a.fullName) people.set(a.email, { name: a.fullName, email: a.email });
}
for (const r of external.roster) {
  people.set(r.email, { name: r.fullName, email: r.email });
}
console.log(`candidate pool: ${people.size} people`);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return nameSimilarity(a, b) >= 0.8;
}

function score(senderToks: string[], person: { name: string; email: string }): number {
  if (senderToks.length === 0) return 0;
  const personToks = [
    ...tokens(person.name),
    ...tokens(person.email.split("@")[0]!.replace(/[._\-\d]+/g, " ")),
  ];
  if (personToks.length === 0) return 0;
  let hit = 0;
  for (const st of senderToks) {
    if (personToks.some((pt) => tokenMatch(st, pt))) hit++;
  }
  return hit / senderToks.length;
}

const exportsDir = path.join(DATA_DIR, "exports");
const texts = fs
  .readdirSync(exportsDir)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => fs.readFileSync(path.join(exportsDir, f), "utf-8"));
const senders = parseWhatsAppExports(texts, YEAR_START, YEAR_END);

const rows: { key: string; msgs: number; cands: string[] }[] = [];
for (const s of senders.values()) {
  if (s.isPhone) continue;
  const senderToks = tokens(s.senderKey);
  const scored = [...people.values()]
    .map((p) => ({ p, sc: score(senderToks, p) }))
    .filter((x) => x.sc >= 0.5)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 3);
  rows.push({
    key: s.senderKey,
    msgs: s.messageCount,
    cands: scored.map((x) => `${x.p.name} <${x.p.email}> [${x.sc.toFixed(2)}]`),
  });
}
rows.sort((a, b) => b.msgs - a.msgs);

const outPath = path.join(DATA_DIR, "mapping-candidates.csv");
const csv = [
  "senderKey,messageCount,candidate1,candidate2,candidate3",
  ...rows.map((r) =>
    [r.key, String(r.msgs), r.cands[0] ?? "", r.cands[1] ?? "", r.cands[2] ?? ""]
      .map((f) => `"${f.replace(/"/g, '""')}"`)
      .join(",")
  ),
].join("\n");
fs.writeFileSync(outPath, csv, "utf-8");

const withCand = rows.filter((r) => r.cands.length > 0);
const msgsCovered = withCand.reduce((s, r) => s + r.msgs, 0);
const msgsTotal = rows.reduce((s, r) => s + r.msgs, 0);
console.log(`Wrote ${outPath}`);
console.log(`name senders: ${rows.length}, with >=1 candidate: ${withCand.length}`);
console.log(
  `message volume with a candidate: ${msgsCovered} of ${msgsTotal} (${((msgsCovered / msgsTotal) * 100).toFixed(1)}%)`
);
