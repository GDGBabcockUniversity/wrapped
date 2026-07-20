import fs from "node:fs";
import path from "node:path";
import { parseSourceCsv, combineExternal, parseCsv, type ExternalData } from "./sources";
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
 * PHONE EVIDENCE (the strong path): the chat export writes only the
 * exporting phone's address-book display name for saved contacts — the
 * number never appears — but a contacts export from THAT phone restores the
 * link. Drop a Google Contacts CSV at data/contacts.csv (Google Contacts ->
 * Export -> CSV) and any sender whose display name equals a contact name
 * with a number matching a roster WhatsApp number resolves sender -> number
 * -> email; those land as candidate1 tagged [phone] and are safe to accept
 * nearly verbatim.
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

// --- phone evidence: contacts CSV (name -> number) x roster (number -> email) ---
const last10 = (s: string) => s.replace(/[^\d]/g, "").slice(-10);
const emailByPhone = new Map<string, { name: string; email: string }>();
for (const r of external.roster) {
  if (r.whatsapp) emailByPhone.set(last10(r.whatsapp), { name: r.fullName, email: r.email });
}

/** senderKey (normalized) -> resolved person, via the contacts export. */
const byContactName = new Map<string, { name: string; email: string; number: string }>();
const normName = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const contactsPath = path.join(DATA_DIR, "contacts.csv");
if (fs.existsSync(contactsPath)) {
  const rows = parseCsv(fs.readFileSync(contactsPath, "utf-8"));
  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name");
  const firstIdx = headers.findIndex((h) => h === "first name" || h === "given name");
  const middleIdx = headers.findIndex((h) => h === "middle name" || h === "additional name");
  const lastIdx = headers.findIndex((h) => h === "last name" || h === "family name");
  const phoneIdxs = headers
    .map((h, i) => (/^phone \d+ - value$/.test(h) ? i : -1))
    .filter((i) => i !== -1);
  let linked = 0;
  for (const row of rows.slice(1)) {
    const display =
      nameIdx !== -1 && row[nameIdx]?.trim()
        ? row[nameIdx]!.trim()
        : [firstIdx, middleIdx, lastIdx]
            .filter((i) => i !== -1)
            .map((i) => (row[i] ?? "").trim())
            .filter(Boolean)
            .join(" ");
    if (!display) continue;
    // "Phone 1 - Value" can hold ":::"-separated multiples.
    for (const idx of phoneIdxs) {
      for (const raw of (row[idx] ?? "").split(":::")) {
        const key = last10(raw);
        if (key.length < 10) continue;
        const person = emailByPhone.get(key);
        if (person) {
          byContactName.set(normName(display), { ...person, number: raw.trim() });
          linked++;
        }
      }
    }
  }
  console.log(`contacts.csv: ${rows.length - 1} contacts, ${linked} linked to a roster number`);
} else {
  console.log(
    "No data/contacts.csv — phone evidence skipped. Export Google Contacts as CSV from the phone that exported the chats to auto-resolve named senders."
  );
}

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

const rows: { key: string; msgs: number; cands: string[]; phoneResolved: boolean }[] = [];
for (const s of senders.values()) {
  if (s.isPhone) continue;
  const viaPhone = byContactName.get(normName(s.senderKey));
  const senderToks = tokens(s.senderKey);
  const scored = [...people.values()]
    .map((p) => ({ p, sc: score(senderToks, p) }))
    .filter((x) => x.sc >= 0.5 && x.p.email !== viaPhone?.email)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, viaPhone ? 2 : 3);
  const cands = scored.map((x) => `${x.p.name} <${x.p.email}> [${x.sc.toFixed(2)}]`);
  if (viaPhone) cands.unshift(`${viaPhone.name} <${viaPhone.email}> [phone]`);
  rows.push({ key: s.senderKey, msgs: s.messageCount, cands, phoneResolved: Boolean(viaPhone) });
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
const phoneRows = rows.filter((r) => r.phoneResolved);
const msgsCovered = withCand.reduce((s, r) => s + r.msgs, 0);
const msgsPhone = phoneRows.reduce((s, r) => s + r.msgs, 0);
const msgsTotal = rows.reduce((s, r) => s + r.msgs, 0);
console.log(`Wrote ${outPath}`);
console.log(`name senders: ${rows.length}, with >=1 candidate: ${withCand.length}`);
console.log(
  `message volume with a candidate: ${msgsCovered} of ${msgsTotal} (${((msgsCovered / msgsTotal) * 100).toFixed(1)}%)`
);
console.log(
  `phone-resolved (contacts.csv): ${phoneRows.length} senders, ${msgsPhone} msgs (${((msgsPhone / msgsTotal) * 100).toFixed(1)}%)`
);
