import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fetchDbData, type FetchedDb } from "./fetch-db";
import { parseSourceCsv, combineExternal, type ExternalData } from "./sources";
import { buildUniverse } from "./universe";
import { parseWhatsAppExports } from "./parse-whatsapp";
import { computeGroupChatStats, type GroupStatsResult } from "./group-stats";
import { matchMembers } from "./match-members";
import { buildPipelineMembers, computeSnapshots } from "./compute-stats";
import { writeSnapshots, deleteOptedOutSnapshots } from "./write-snapshot";
import { printReport } from "./report";
import { generateSeedData, writeSeedExports, writeSeedSources } from "./seed-fake";
import type { Snapshot } from "@/lib/snapshot";

const YEAR_START = new Date(process.env.WRAPPED_YEAR_START ?? "2025-09-01T00:00:00Z");
const YEAR_END = new Date(process.env.WRAPPED_YEAR_END ?? "2026-08-01T00:00:00Z");
const DATA_DIR = path.join(process.cwd(), "data");

function readJsonIfExists<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function readExportFiles(): string[] {
  const exportsDir = path.join(DATA_DIR, "exports");
  if (!fs.existsSync(exportsDir)) return [];
  return fs
    .readdirSync(exportsDir)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => fs.readFileSync(path.join(exportsDir, f), "utf-8"));
}

/** Every .txt under data/exports/groups/ — the main chat plus any subgroup
    exports (build5 §5.2), one file per group. Kept separate from the flat
    data/exports/ directory (member exports for the personal-stats path,
    unchanged) — this directory only feeds the Group Chat story's fun
    stats. `name` is the filename sans extension, e.g. "main", "data-and-ai". */
function readGroupExportFiles(): { name: string; text: string }[] {
  const groupsDir = path.join(DATA_DIR, "exports", "groups");
  if (!fs.existsSync(groupsDir)) return [];
  return fs
    .readdirSync(groupsDir)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => ({
      name: f.replace(/\.txt$/, ""),
      text: fs.readFileSync(path.join(groupsDir, f), "utf-8"),
    }));
}

/** Every CSV under data/sources/, any nesting — community.dev, Luma, ORBIT. */
function readSourceFiles(): ExternalData {
  const sourcesDir = path.join(DATA_DIR, "sources");
  if (!fs.existsSync(sourcesDir)) return { roster: [], attendance: [] };
  const parts: ExternalData[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".csv")) {
        parts.push(parseSourceCsv(path.relative(sourcesDir, full), fs.readFileSync(full, "utf-8")));
      }
    }
  };
  walk(sourcesDir);
  return combineExternal(parts);
}

async function confirmWrite(host: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `About to WRITE wrapped snapshots to database host: ${host}\nType "yes" to continue: `
  );
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  const args = process.argv.slice(2);
  const isSeed = args.includes("--seed");
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");

  console.log(`GDG Wrapped pipeline — ${isSeed ? "SEED" : "REAL"} data, window ${YEAR_START.toISOString().slice(0, 10)} to ${YEAR_END.toISOString().slice(0, 10)}`);

  let db: FetchedDb;
  let whatsAppTexts: string[];
  let external: ExternalData;

  if (isSeed) {
    const seed = generateSeedData();
    db = seed.db;
    writeSeedExports(seed.exportFiles, DATA_DIR);
    writeSeedSources(seed.sourceFiles, DATA_DIR);
    whatsAppTexts = seed.exportFiles.map((f) => f.content);
    // Route the synthetic CSVs through the real parser, same as production.
    external = combineExternal(seed.sourceFiles.map((f) => parseSourceCsv(f.path, f.content)));
    console.log(
      `Generated ${db.users.length} synthetic auth members, ${seed.exportFiles.length} chat exports, ${seed.sourceFiles.length} source CSVs.`
    );
  } else {
    const connectionString = process.env.PIPELINE_DATABASE_URL;
    if (!connectionString) {
      console.error("PIPELINE_DATABASE_URL is not set. Aborting.");
      process.exit(1);
    }
    db = await fetchDbData(connectionString, YEAR_START, YEAR_END);
    whatsAppTexts = readExportFiles();
    if (whatsAppTexts.length === 0) {
      console.warn("No .txt files found in data/exports/ — proceeding with zero WhatsApp data.");
    }
    external = readSourceFiles();
    if (external.roster.length === 0 && external.attendance.length === 0) {
      console.warn(
        "No CSVs found in data/sources/ — universe will be auth-platform members only. " +
          "Export community.dev/Luma/ORBIT data there for the full 1500+ universe."
      );
    }
  }

  const mapping = readJsonIfExists<Record<string, string>>(path.join(DATA_DIR, "mapping.json"), {});
  const optedOutList = readJsonIfExists<string[]>(path.join(DATA_DIR, "opt-out.json"), []);
  const optedOutEmails = new Set(optedOutList.map((e) => e.toLowerCase()));

  const universe = buildUniverse(db, external, YEAR_START, YEAR_END);
  const communityOnly = universe.members.filter((m) => m.userId === null).length;
  console.log(
    `Universe: ${universe.members.length} members (${db.users.length} auth-platform, ${communityOnly} community/Luma/ORBIT-only), ${universe.eventsRun} distinct events.`
  );

  const senderStats = parseWhatsAppExports(whatsAppTexts, YEAR_START, YEAR_END);
  const matchResult = matchMembers(senderStats, universe.members, mapping);

  // Group Chat story fun stats (build5 §5) — separate from the member
  // exports above: data/exports/groups/*.txt, main chat plus any subgroups.
  const groupExports = readGroupExportFiles();
  if (groupExports.length === 0) {
    console.warn("No .txt files found in data/exports/groups/ — Group Chat stats will be zeroed.");
  }
  const groupStats: GroupStatsResult = computeGroupChatStats(groupExports, YEAR_START, YEAR_END);

  if (matchResult.unmatchedSenders.length > 0) {
    const unmatchedCsvPath = path.join(DATA_DIR, "unmatched.csv");
    const csv = [
      "senderKey,messageCount,suggestion",
      ...matchResult.unmatchedSenders.map(
        (u) => `"${u.senderKey}",${u.messageCount},"${u.suggestion}"`
      ),
    ].join("\n");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(unmatchedCsvPath, csv, "utf-8");
    console.log(`\nWrote ${matchResult.unmatchedSenders.length} unmatched senders to ${unmatchedCsvPath}`);
  }

  const members = buildPipelineMembers(universe, matchResult);
  const { snapshots, chapterMeta } = computeSnapshots(
    members,
    universe.eventsRun,
    YEAR_START,
    YEAR_END,
    optedOutEmails
  );

  const { matchRatePct, clubFloorOk } = printReport(
    members,
    snapshots,
    chapterMeta,
    matchResult.matchedMessageVolume,
    matchResult.totalMessageVolume,
    groupStats
  );

  if (isDryRun || !isWrite) {
    console.log(isWrite ? "Dry run — no database write performed." : "No --write flag — no database write performed.");
    return;
  }

  if (matchRatePct < 80) {
    // --allow-low-match: the provisional-write escape hatch (owner,
    // 2026-07-20) — ship real chapter/event data now, re-run for personal
    // message stats once data/mapping.json is curated.
    if (args.includes("--allow-low-match")) {
      console.warn(
        `Match rate ${matchRatePct}% is below the 80% gate — writing anyway (--allow-low-match). Personal message stats will be missing/low until data/mapping.json is curated.`
      );
    } else {
      console.error(`Match rate ${matchRatePct}% is below the 80% gate. Refusing to write. Fix data/mapping.json first.`);
      process.exit(1);
    }
  }
  if (!clubFloorOk) {
    console.warn("Warning: at least one club is below the 8% population floor after rebalancing.");
  }

  const connectionString = process.env.PIPELINE_DATABASE_URL;
  if (!connectionString) {
    console.error("PIPELINE_DATABASE_URL is not set. Aborting write.");
    process.exit(1);
  }

  const host = new URL(connectionString.replace(/^postgres(ql)?:\/\//, "https://")).host;
  const confirmed = await confirmWrite(host);
  if (!confirmed) {
    console.log("Write cancelled.");
    return;
  }

  if (optedOutList.length > 0) {
    await deleteOptedOutSnapshots(connectionString, optedOutList);
  }

  const userIdByEmail = new Map(universe.members.map((m) => [m.email, m.userId]));
  const writePayload = new Map<string, { userId: string | null; data: Snapshot }>();
  for (const [email, data] of snapshots) {
    writePayload.set(email, { userId: userIdByEmail.get(email) ?? null, data });
  }

  const summary = await writeSnapshots(
    connectionString,
    writePayload,
    chapterMeta,
    chapterMeta.clubDistribution,
    matchRatePct
  );
  console.log(`\nWrote ${summary.membersWritten} member snapshots. Match rate recorded: ${summary.matchRatePct}%.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
