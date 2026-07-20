import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parseSourceCsv, combineExternal, parseCsv, type ExternalData } from "./sources";
import { parseWhatsAppExports } from "./parse-whatsapp";
import { nameSimilarity } from "./match-members";

/**
 * build-mapping — turns the wall of ~680 unmatched WhatsApp senders into a
 * curated data/mapping.json AUTOMATICALLY where it's safe, and a short human
 * review list where it isn't.
 *
 * THE CONSTRAINT (why this is hard): a WhatsApp export only writes the
 * exporting phone's address-book DISPLAY NAME for each saved contact — the
 * number never appears. So ~98% of message volume is keyed by names like
 * "Emma", "Hack13", "~ ÆSÏR" that must be linked to a member (email) before
 * their personal message stats can exist. Phone auto-matching in the pipeline
 * only works for auth-platform members (the one source of WhatsApp numbers);
 * everyone else needs mapping.json.
 *
 * THE SOLUTION (tiers, safest first — a WRONG mapping corrupts a real
 * person's stats, which is worse than a miss, so auto-accept is conservative):
 *
 *   1. PHONE EVIDENCE — data/contacts.csv (Google Contacts export from the
 *      phone that exported the chats) gives name→number; the roster gives
 *      number→email. name→number→email is a hard link. Auto-accepted.
 *
 *   2. SINGLE DOMINANT CANDIDATE — token-scored against the whole people pool
 *      (roster + attendance names + email locals). Accepted only when ONE
 *      candidate clears ACCEPT_MIN and beats the runner-up by MARGIN. "Emma"
 *      (three people tie at 1.00) and "Neku" (two tie) fall through to review,
 *      exactly as they should; "Audrey"→"Audrey Okafor" and "Hack13"→
 *      "addisonhackss14@…" auto-accept.
 *
 *   3. REVIEW — everything else, written biggest-volume-first to
 *      data/mapping-review.csv with its top candidates. A human copies the
 *      confirmed ones into mapping.json.
 *
 * Existing manual mapping.json entries ALWAYS win and are never overwritten.
 *
 * Usage:
 *   npx tsx scripts/pipeline/build-mapping.ts            # dry run — writes review CSV, prints plan
 *   npx tsx scripts/pipeline/build-mapping.ts --write    # also merges auto-accepts into mapping.json
 */

export interface Person {
  name: string;
  email: string;
}

export interface Candidate {
  name: string;
  email: string;
  score: number;
}

export type Decision =
  | { kind: "phone"; email: string }
  | { kind: "auto"; email: string; score: number }
  | { kind: "review"; candidates: Candidate[] };

export const ACCEPT_MIN = 0.75;
export const MARGIN = 0.35;

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

function personTokens(p: Person): string[] {
  return [...tokens(p.name), ...tokens(p.email.split("@")[0]!.replace(/[._\-\d]+/g, " "))];
}

export function scoreSender(senderToks: string[], p: Person): number {
  if (senderToks.length === 0) return 0;
  const pt = personTokens(p);
  if (pt.length === 0) return 0;
  let hit = 0;
  for (const st of senderToks) {
    if (pt.some((x) => tokenMatch(st, x))) hit++;
  }
  return hit / senderToks.length;
}

/**
 * Decide one NAME sender. Pure and deterministic — the whole classifier is
 * unit-tested (build-mapping.test.ts). `phoneEvidenceEmail` is the email a
 * contacts.csv link resolved for this sender, if any.
 */
export function classifyNameSender(
  senderKey: string,
  people: Person[],
  phoneEvidenceEmail: string | undefined
): Decision {
  if (phoneEvidenceEmail) return { kind: "phone", email: phoneEvidenceEmail };

  const st = tokens(senderKey);
  const scored = people
    .map((p) => ({ name: p.name, email: p.email, score: scoreSender(st, p) }))
    .filter((c) => c.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  if (top && top.score >= ACCEPT_MIN && (!second || top.score - second.score >= MARGIN)) {
    return { kind: "auto", email: top.email, score: top.score };
  }
  return { kind: "review", candidates: scored.slice(0, 3) };
}

// ---- runner (I/O) ----

const YEAR_START = new Date(process.env.WRAPPED_YEAR_START ?? "2025-09-01T00:00:00Z");
const YEAR_END = new Date(process.env.WRAPPED_YEAR_END ?? "2026-08-01T00:00:00Z");
const DATA_DIR = path.join(process.cwd(), "data");
const last10 = (s: string) => s.replace(/[^\d]/g, "").slice(-10);
const normName = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

function readSources(): ExternalData {
  const sourcesDir = path.join(DATA_DIR, "sources");
  const parts: ExternalData[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".csv"))
        parts.push(parseSourceCsv(path.relative(sourcesDir, full), fs.readFileSync(full, "utf-8")));
    }
  };
  walk(sourcesDir);
  return combineExternal(parts);
}

/** contacts.csv (name→number) × roster (number→email) → normName → email. */
function buildPhoneEvidence(external: ExternalData): Map<string, string> {
  const emailByPhone = new Map<string, string>();
  for (const r of external.roster) if (r.whatsapp) emailByPhone.set(last10(r.whatsapp), r.email);

  const out = new Map<string, string>();
  const contactsPath = path.join(DATA_DIR, "contacts.csv");
  if (!fs.existsSync(contactsPath)) {
    console.log(
      "No data/contacts.csv — phone evidence skipped. Export Google Contacts as CSV from the phone that exported the chats to unlock the strongest match path."
    );
    return out;
  }
  const rows = parseCsv(fs.readFileSync(contactsPath, "utf-8"));
  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name");
  const firstIdx = headers.findIndex((h) => h === "first name" || h === "given name");
  const middleIdx = headers.findIndex((h) => h === "middle name" || h === "additional name");
  const lastIdx = headers.findIndex((h) => h === "last name" || h === "family name");
  const phoneIdxs = headers.map((h, i) => (/^phone \d+ - value$/.test(h) ? i : -1)).filter((i) => i !== -1);
  for (const row of rows.slice(1)) {
    const display =
      nameIdx !== -1 && row[nameIdx]?.trim()
        ? row[nameIdx]!.trim()
        : [firstIdx, middleIdx, lastIdx].filter((i) => i !== -1).map((i) => (row[i] ?? "").trim()).filter(Boolean).join(" ");
    if (!display) continue;
    for (const idx of phoneIdxs) {
      for (const raw of (row[idx] ?? "").split(":::")) {
        const key = last10(raw);
        if (key.length < 10) continue;
        const email = emailByPhone.get(key);
        if (email) out.set(normName(display), email);
      }
    }
  }
  console.log(`contacts.csv: ${out.size} display names linked to a roster number.`);
  return out;
}

function csvCell(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function main() {
  const write = process.argv.includes("--write");
  const external = readSources();

  const people = new Map<string, Person>();
  for (const a of external.attendance) if (a.fullName) people.set(a.email, { name: a.fullName, email: a.email });
  for (const r of external.roster) people.set(r.email, { name: r.fullName, email: r.email });
  const pool = [...people.values()];
  const rosterPhones = new Set(external.roster.filter((r) => r.whatsapp).map((r) => last10(r.whatsapp!)));
  console.log(`people pool: ${pool.length}, roster phones: ${rosterPhones.size}`);

  const phoneEvidence = buildPhoneEvidence(external);

  const exportsDir = path.join(DATA_DIR, "exports");
  const texts = fs.existsSync(exportsDir)
    ? fs.readdirSync(exportsDir).filter((f) => f.endsWith(".txt")).map((f) => fs.readFileSync(path.join(exportsDir, f), "utf-8"))
    : [];
  const senders = [...parseWhatsAppExports(texts, YEAR_START, YEAR_END).values()];
  const totalVolume = senders.reduce((s, x) => s + x.messageCount, 0);

  const existing: Record<string, string> = fs.existsSync(path.join(DATA_DIR, "mapping.json"))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, "mapping.json"), "utf-8"))
    : {};

  const additions: Record<string, string> = {};
  const review: { key: string; msgs: number; cands: Candidate[] }[] = [];
  let phoneVol = 0;
  let autoVol = 0;
  let existingVol = 0;
  let rosterPhoneVol = 0; // isPhone senders the pipeline will auto-match

  for (const s of senders) {
    if (s.senderKey in existing) {
      existingVol += s.messageCount;
      continue;
    }
    if (s.isPhone) {
      if (rosterPhones.has(last10(s.senderKey))) rosterPhoneVol += s.messageCount;
      continue; // pipeline resolves phone senders directly; nothing to map
    }
    const decision = classifyNameSender(s.senderKey, pool, phoneEvidence.get(normName(s.senderKey)));
    if (decision.kind === "phone") {
      additions[s.senderKey] = decision.email;
      phoneVol += s.messageCount;
    } else if (decision.kind === "auto") {
      additions[s.senderKey] = decision.email;
      autoVol += s.messageCount;
    } else {
      review.push({ key: s.senderKey, msgs: s.messageCount, cands: decision.candidates });
    }
  }

  review.sort((a, b) => b.msgs - a.msgs);
  const reviewPath = path.join(DATA_DIR, "mapping-review.csv");
  const reviewCsv = [
    "senderKey,messageCount,candidate1,candidate2,candidate3",
    ...review.map((r) =>
      [
        r.key,
        String(r.msgs),
        ...[0, 1, 2].map((i) => {
          const c = r.cands[i];
          return c ? `${c.name} <${c.email}> [${c.score.toFixed(2)}]` : "";
        }),
      ].map(csvCell).join(",")
    ),
  ].join("\n");
  fs.writeFileSync(reviewPath, reviewCsv, "utf-8");

  const matchedVol = existingVol + phoneVol + autoVol + rosterPhoneVol;
  const reviewVol = review.reduce((s, r) => s + r.msgs, 0);
  const pct = (v: number) => ((v / totalVolume) * 100).toFixed(1);

  console.log("\n— coverage —");
  console.log(`already in mapping.json:  ${existingVol.toLocaleString()} msgs (${pct(existingVol)}%)`);
  console.log(`phone-evidence auto:      ${phoneVol.toLocaleString()} msgs (${pct(phoneVol)}%)`);
  console.log(`single-dominant auto:     ${autoVol.toLocaleString()} msgs (${pct(autoVol)}%)`);
  console.log(`roster-phone (pipeline):  ${rosterPhoneVol.toLocaleString()} msgs (${pct(rosterPhoneVol)}%)`);
  console.log(`PROJECTED MATCH RATE:     ${pct(matchedVol)}%  ${Number(pct(matchedVol)) >= 80 ? "✓ clears the 80% gate" : "✗ below the 80% gate"}`);
  console.log(`\nleft to review:           ${review.length} senders, ${reviewVol.toLocaleString()} msgs (${pct(reviewVol)}%)`);
  console.log(`  → wrote ${reviewPath} (biggest volume first)`);
  console.log(`  the top 15 unresolved senders account for ${pct(review.slice(0, 15).reduce((s, r) => s + r.msgs, 0))}% of all volume.`);

  const autoCount = Object.keys(additions).length;
  if (!write) {
    console.log(`\nDry run — would add ${autoCount} auto-accepted mappings. Re-run with --write to merge them into data/mapping.json.`);
    return;
  }
  const merged = { ...additions, ...existing }; // existing (manual) wins
  fs.writeFileSync(path.join(DATA_DIR, "mapping.json"), JSON.stringify(merged, null, 2) + "\n", "utf-8");
  console.log(`\nWrote data/mapping.json — ${Object.keys(merged).length} total mappings (+${autoCount} auto this run). Now curate the review CSV for the rest.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
