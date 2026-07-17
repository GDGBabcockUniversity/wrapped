import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fetchDbData, type FetchedDb } from "./fetch-db";
import { parseWhatsAppExports } from "./parse-whatsapp";
import { matchMembers } from "./match-members";
import { buildPipelineMembers, computeSnapshots } from "./compute-stats";
import { writeSnapshots, deleteOptedOutSnapshots } from "./write-snapshot";
import { printReport } from "./report";
import { generateSeedData, writeSeedExports } from "./seed-fake";
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

  if (isSeed) {
    const seed = generateSeedData();
    db = seed.db;
    writeSeedExports(seed.exportFiles, DATA_DIR);
    whatsAppTexts = seed.exportFiles.map((f) => f.content);
    console.log(`Generated ${db.users.length} synthetic members and ${seed.exportFiles.length} export files.`);
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
  }

  const mapping = readJsonIfExists<Record<string, string>>(path.join(DATA_DIR, "mapping.json"), {});
  const optedOutList = readJsonIfExists<string[]>(path.join(DATA_DIR, "opt-out.json"), []);
  const optedOutEmails = new Set(optedOutList.map((e) => e.toLowerCase()));

  const senderStats = parseWhatsAppExports(whatsAppTexts, YEAR_START, YEAR_END);
  const matchResult = matchMembers(senderStats, db.users, mapping);

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

  const members = buildPipelineMembers(db, matchResult);
  const { snapshots, chapterMeta } = computeSnapshots(members, db, YEAR_START, YEAR_END, optedOutEmails);

  const { matchRatePct, clubFloorOk } = printReport(
    members,
    snapshots,
    chapterMeta,
    matchResult.matchedMessageVolume,
    matchResult.totalMessageVolume
  );

  if (isDryRun || !isWrite) {
    console.log(isWrite ? "Dry run — no database write performed." : "No --write flag — no database write performed.");
    return;
  }

  if (matchRatePct < 80) {
    console.error(`Match rate ${matchRatePct}% is below the 80% gate. Refusing to write. Fix data/mapping.json first.`);
    process.exit(1);
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

  const emailByUserId = new Map(db.users.map((u) => [u.id, u.email]));
  const writePayload = new Map<string, { email: string; data: Snapshot }>();
  for (const [userId, data] of snapshots) {
    writePayload.set(userId, { email: emailByUserId.get(userId)!, data });
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
