import fs from "node:fs";
import path from "node:path";
import type { DbUser, DbCheckin, DbRegistration, DbCountRow, FetchedDb } from "./fetch-db";

const SEED = 25026;

function mulberry32(seed: number) {
  let s = seed;
  return function rand() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Ada", "Grace", "Alan", "Linus", "Margaret", "Katherine", "Tim", "Barbara",
  "Vint", "Radia", "Dennis", "Frances", "Steve", "Sophie", "Marc", "Jean",
  "Chinedu", "Amaka", "Tunde", "Ngozi", "Emeka", "Adaeze", "Kelechi", "Ifeoma",
  "Femi", "Bisi", "Segun", "Yemi", "Uche", "Chioma", "Obinna", "Nkechi",
];
const LAST_NAMES = [
  "Lovelace", "Hopper", "Turing", "Torvalds", "Hamilton", "Johnson", "Cook",
  "Liskov", "Cerf", "Perlman", "Ritchie", "Allen", "Jobs", "Wilson", "Andreessen",
  "Bartik", "Okafor", "Adeyemi", "Balogun", "Chukwu", "Eze", "Nwosu", "Okoro",
  "Ibrahim", "Suleiman", "Bello", "Yusuf", "Abubakar", "Nnamdi", "Ogundipe",
];

const EVENT_TITLES = [
  "ORBIT Kickoff", "DevFest Babcock", "Game Night Vol. 1", "Game Night Vol. 2",
  "Study Jam: Android", "Tech Talk: AI Agents", "Build With AI Day 1",
  "Build With AI Day 2", "GDG Week Finale", "Hackathon Demo Day",
];

const YEAR_START = new Date("2025-09-01T00:00:00Z");
const YEAR_END = new Date("2026-08-01T00:00:00Z");
const NEW_MEMBER_CUTOFF = new Date("2026-03-01T00:00:00Z");
const HISTORY_START = new Date("2021-01-01T00:00:00Z");
const NOW = new Date("2026-07-16T00:00:00Z");

export interface SeedUser extends DbUser {
  seedMessageCount: number;
  seedUnmatched: boolean;
}

export interface SeedResult {
  db: FetchedDb;
  exportFiles: { path: string; content: string }[];
}

function randomDateBetween(rand: () => number, start: Date, end: Date): Date {
  return new Date(start.getTime() + rand() * (end.getTime() - start.getTime()));
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function androidLine(date: Date, twoDigitYear: boolean, sender: string, body: string): string {
  const year = twoDigitYear ? String(date.getUTCFullYear()).slice(2) : String(date.getUTCFullYear());
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${year}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} - ${sender}: ${body}`;
}

function iosLine(date: Date, sender: string, body: string): string {
  return `[${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}] ${sender}: ${body}`;
}

const FAKE_BODIES = [
  "hey everyone", "who's coming tonight", "<Media omitted>", "same here",
  "let's gooo", "what time does it start", "count me in", "thank you!",
  "see you there", "this was fun", "any updates?", "+1",
];

export function generateSeedData(): SeedResult {
  const rand = mulberry32(SEED);
  const users: SeedUser[] = [];

  const COUNT = 300;
  for (let i = 0; i < COUNT; i++) {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!;
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!;
    const fullName = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;

    let joinDate: Date;
    if (rand() < 0.15) {
      joinDate = randomDateBetween(rand, NEW_MEMBER_CUTOFF, NOW);
    } else {
      joinDate = randomDateBetween(rand, HISTORY_START, YEAR_END);
    }

    const unmatched = rand() < 0.2;
    const messageCount = Math.floor(Math.exp(rand() * Math.log(2000)));
    const phoneNumber = `+234${800000000 + Math.floor(rand() * 99999999)}`;

    users.push({
      id: crypto.randomUUID(),
      email,
      full_name: fullName,
      whatsapp_number: unmatched ? null : phoneNumber,
      created_at: joinDate,
      seedMessageCount: messageCount,
      seedUnmatched: unmatched,
    });
  }

  // Cohort plants (§12.7): hyperactive outlier, perfect attendance, zero-everything.
  users[0]!.seedMessageCount = 4000;
  users[0]!.seedUnmatched = false;
  users[0]!.whatsapp_number = "+2348001234567";

  users[1]!.seedUnmatched = false;

  users[2]!.seedUnmatched = true;
  users[2]!.whatsapp_number = null;
  users[2]!.seedMessageCount = 0;
  users[2]!.created_at = randomDateBetween(rand, NEW_MEMBER_CUTOFF, NOW);

  const checkins: DbCheckin[] = [];
  const registrations: DbRegistration[] = [];
  const radarReads: DbCountRow[] = [];
  const radarPlays: DbCountRow[] = [];

  users.forEach((u, i) => {
    let checkinCount: number;
    let registrationCount: number;
    if (i === 2) {
      checkinCount = 0;
      registrationCount = 0;
    } else if (i === 1) {
      checkinCount = 12;
      registrationCount = 12; // perfect attendance
    } else if (rand() < 0.25) {
      checkinCount = 0;
      registrationCount = Math.floor(rand() * 3);
    } else {
      checkinCount = Math.floor(30 * rand() * rand());
      registrationCount = checkinCount + Math.floor(rand() * 5);
    }

    for (let c = 0; c < checkinCount; c++) {
      const date = randomDateBetween(rand, u.created_at > YEAR_START ? u.created_at : YEAR_START, YEAR_END);
      checkins.push({
        user_id: u.id,
        checked_in_at: date,
        title: EVENT_TITLES[Math.floor(rand() * EVENT_TITLES.length)]!,
        starts_at: date,
      });
    }
    for (let r = 0; r < registrationCount; r++) {
      registrations.push({
        user_id: u.id,
        registered_at: randomDateBetween(rand, u.created_at > YEAR_START ? u.created_at : YEAR_START, YEAR_END),
      });
    }

    if (rand() < 0.3) radarReads.push({ user_id: u.id, count: Math.floor(rand() * 15) });
    if (rand() < 0.2) radarPlays.push({ user_id: u.id, count: Math.floor(rand() * 8) });
  });

  // Split matched senders across all three export dialects so the parser's
  // real code path is exercised for each. Unmatched senders use display
  // names (no phone) so they land in match-members's unmatched.csv path.
  const dialectFiles: string[][] = [[], [], []]; // android-2digit, android-4digit, ios

  users.forEach((u, i) => {
    if (u.seedMessageCount === 0) return;
    const dialect = i % 3;
    const sender = u.seedUnmatched ? u.full_name : u.whatsapp_number!;
    for (let m = 0; m < u.seedMessageCount; m++) {
      const date = randomDateBetween(rand, u.created_at > YEAR_START ? u.created_at : YEAR_START, YEAR_END);
      const body = FAKE_BODIES[Math.floor(rand() * FAKE_BODIES.length)]!;
      const line =
        dialect === 0
          ? androidLine(date, true, sender, body)
          : dialect === 1
            ? androidLine(date, false, sender, body)
            : iosLine(date, sender, body);
      dialectFiles[dialect]!.push(line);
    }
  });

  // A couple of system lines mixed in, to exercise the system-line-drop path.
  dialectFiles[0]!.push(
    `01/09/2025, 08:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.`
  );
  dialectFiles[1]!.push(`15/10/2025, 10:15 - Ada Lovelace changed the subject to "GDG Babcock 25/26"`);
  dialectFiles[2]!.push(`[20/11/2025, 09:00:00] Messages and calls are end-to-end encrypted.`);

  const exportFiles = [
    { path: "android-2digit.txt", content: shuffledJoin(dialectFiles[0]!, rand) },
    { path: "android-4digit.txt", content: shuffledJoin(dialectFiles[1]!, rand) },
    { path: "ios.txt", content: shuffledJoin(dialectFiles[2]!, rand) },
  ];

  const eventsRun = EVENT_TITLES.length;

  return {
    db: {
      users,
      checkins,
      registrations,
      radarReads,
      radarPlays,
      eventsRun,
    },
    exportFiles,
  };
}

function shuffledJoin(lines: string[], rand: () => number): string {
  // Chat exports are chronological in reality; parsing doesn't require sort
  // order, so keep generation simple and just join as generated.
  void rand;
  return lines.join("\n");
}

export function writeSeedExports(exportFiles: { path: string; content: string }[], dataDir: string): void {
  const exportsDir = path.join(dataDir, "exports");
  fs.mkdirSync(exportsDir, { recursive: true });
  for (const f of exportFiles) {
    fs.writeFileSync(path.join(exportsDir, f.path), f.content, "utf-8");
  }
}
