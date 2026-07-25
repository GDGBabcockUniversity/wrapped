import type { Snapshot, ChapterMeta, ClubId } from "@/lib/snapshot";
import { PRODUCT_SAGA } from "@/lib/content/chapter";
import type { PipelineMember } from "./types";
import { activityScore } from "./percentiles";
import { suggestTopSubgroup, type GroupStatsResult } from "./group-stats";

// Every PRODUCT_SAGA field still TBD, with a hint for where a lead finds
// the real number (build5 §5.3) — read live off PRODUCT_SAGA so this list
// self-corrects as fields get filled in and stops printing them.
const SAGA_TBD_HINTS: { path: string; get: () => unknown; hint: string }[] = [
  { path: "radar.articles", get: () => PRODUCT_SAGA.radar.articles, hint: "Sanity studio article count" },
  {
    path: "radar.mostRead",
    get: () => PRODUCT_SAGA.radar.mostRead,
    hint: "auth service GET /radar/stats/chapter → top_articles[0]",
  },
  {
    path: "radar.reads",
    get: () => PRODUCT_SAGA.radar.reads,
    hint: "auth service GET /radar/stats/chapter (member reads), or the anonymous view total printed by auth/scripts/backfill-radar-stats.js",
  },
  { path: "votes.elections", get: () => PRODUCT_SAGA.votes.elections, hint: "BabcockVotes admin" },
  { path: "votes.votesCast", get: () => PRODUCT_SAGA.votes.votesCast, hint: "BabcockVotes admin" },
  { path: "orbit.lagos", get: () => PRODUCT_SAGA.orbit.lagos, hint: "owner — field-trip headcount" },
  { path: "orbit.careerFair", get: () => PRODUCT_SAGA.orbit.careerFair, hint: "ORBIT admin dashboard" },
  { path: "orbit.summit", get: () => PRODUCT_SAGA.orbit.summit, hint: "ORBIT admin dashboard" },
  { path: "website", get: () => PRODUCT_SAGA.website, hint: "site analytics" },
  { path: "babcock100", get: () => PRODUCT_SAGA.babcock100, hint: "owner" },
];

export function printReport(
  members: PipelineMember[],
  snapshots: Map<string, Snapshot>,
  chapterMeta: ChapterMeta,
  matchedMessageVolume: number,
  totalMessageVolume: number,
  groupStats: GroupStatsResult
): { matchRatePct: number; clubFloorOk: boolean } {
  const matchRatePct =
    totalMessageVolume === 0 ? 100 : Math.round((100 * matchedMessageVolume) / totalMessageVolume);

  console.log("\n=== GDG Wrapped pipeline report ===\n");
  console.log(`Members processed: ${members.length}`);
  console.log(`WhatsApp message match rate: ${matchRatePct}% (gate: >= 80% before --write)`);

  // Club populations
  const byClub: Record<ClubId, Snapshot[]> = { builder: [], connector: [], observer: [], sprinter: [] };
  for (const s of snapshots.values()) byClub[s.club.id].push(s);

  console.log("\n--- Club populations ---");
  let clubFloorOk = true;
  const total = snapshots.size || 1;
  for (const club of Object.keys(byClub) as ClubId[]) {
    const pctShare = (100 * byClub[club].length) / total;
    if (pctShare < 8) clubFloorOk = false;
    console.log(`${club.toUpperCase()}: ${byClub[club].length} (${pctShare.toFixed(1)}%)`);
    const samples = byClub[club].slice(0, 10).map((s) => s.name);
    console.log(`  sample: ${samples.join(", ")}`);
  }
  console.log(`Club floor (>= 8% each): ${clubFloorOk ? "OK" : "VIOLATED"}`);

  // Percentile histogram (10 buckets)
  console.log("\n--- Percentile histogram ---");
  const buckets = new Array(10).fill(0);
  for (const s of snapshots.values()) {
    const idx = Math.min(9, Math.floor((s.standing.percentile - 1) / 10));
    buckets[idx]++;
  }
  buckets.forEach((count, i) => {
    console.log(`  ${i * 10 + 1}-${i * 10 + 10}%: ${"#".repeat(Math.min(count, 60))} (${count})`);
  });

  // Top-10 by activity score (for lead spot-checks)
  console.log("\n--- Top 10 by activity score ---");
  const logMessagesArr = members.filter((m) => m.messagesMatched).map((m) => Math.log1p(m.messageCount));
  const checkinsArr = members.map((m) => m.checkins);
  const scored = members
    .map((m) => ({
      name: m.fullName,
      score: activityScore(
        { messagesMatched: m.messagesMatched, messages: m.messageCount, checkins: m.checkins },
        logMessagesArr,
        checkinsArr
      ),
      messages: m.messageCount,
      checkins: m.checkins,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  for (const s of scored) {
    console.log(`  ${s.name} — score ${s.score.toFixed(3)} (${s.messages} msgs, ${s.checkins} check-ins)`);
  }

  // RADAR chapter totals, computed from this run. These are MEMBER-attributed
  // reads (signed-in, inside the year window) — deliberately not the same
  // number as the anonymous views:<slug> counters, which are larger and
  // include logged-out readers. PRODUCT_SAGA.radar.reads has historically
  // quoted the anonymous total; pick one and say which in the copy.
  const withRadar = members.filter((m) => m.radar.reads > 0 || m.radar.plays > 0);
  console.log("\n--- RADAR (this run, member-attributed, in-window) ---");
  console.log(`  members with any RADAR activity: ${withRadar.length}`);
  console.log(`  reads: ${members.reduce((n, m) => n + m.radar.reads, 0)}`);
  console.log(`  reading minutes: ${members.reduce((n, m) => n + m.radar.readingMinutes, 0)}`);
  console.log(`  game plays: ${members.reduce((n, m) => n + m.radar.plays, 0)}`);
  const topGames = new Map<string, number>();
  for (const m of members) {
    if (m.radar.topGame) {
      topGames.set(m.radar.topGame, (topGames.get(m.radar.topGame) ?? 0) + 1);
    }
  }
  const rankedGames = [...topGames.entries()].sort((a, b) => b[1] - a[1]);
  if (rankedGames.length > 0) {
    console.log(
      `  most common favourite game: ${rankedGames.map(([g, n]) => `${g} (${n})`).join(", ")}`
    );
  }

  // Chapter numbers to paste into lib/content/chapter.ts
  console.log("\n--- Paste into lib/content/chapter.ts ---");
  console.log(`members: ${chapterMeta.members},`);
  console.log(`eventsRun: ${chapterMeta.eventsRun},`);
  console.log(`totalCheckins: ${chapterMeta.totalCheckins},`);
  console.log(`messagesParsed: ${chapterMeta.messagesParsed},`);

  // Group Chat story stats (build5 §5.3) — paste-ready GROUP_CHAT literal.
  console.log("\n=== GROUP CHAT ===\n");
  if (groupStats.main.messages === 0) {
    console.log("No data/exports/groups/main*.txt found — nothing to report yet.");
  } else {
    const m = groupStats.main;
    console.log("Paste into lib/content/chapter.ts as GROUP_CHAT:\n");
    console.log(`  messages: ${m.messages},`);
    console.log(`  senders: ${m.senders},`);
    console.log(`  topYappers: [`);
    for (const y of m.topYappers) console.log(`    { name: "${y.name}", count: ${y.count} },`);
    console.log(`  ],`);
    console.log(
      `  busiestDay: { label: "${m.busiestDay.label}", count: ${m.busiestDay.count}, line: "TBD — write the line" },`
    );
    console.log(`  peakHourLabel: "${m.peakHourLabel}",`);
    console.log(`  afterMidnight: ${m.afterMidnight},`);
    console.log(`  stickers: ${m.stickers},`);
    console.log(`  deleted: ${m.deleted},`);
    console.log(`  laughs: ${m.laughs},`);
    console.log(`  dialect: [`);
    for (const d of m.dialect) console.log(`    { word: "${d.word}", count: ${d.count} },`);
    console.log(`  ],`);
    console.log(`  streakDays: ${m.streakDays},`);
  }
  if (groupStats.perGroup.length > 0) {
    console.log("\nPer-group message totals:");
    for (const g of groupStats.perGroup) console.log(`  ${g.name}: ${g.messages}`);
  }
  const topSubgroup = suggestTopSubgroup(groupStats.perGroup);
  console.log(
    topSubgroup
      ? `\nSuggested topSubgroup: { name: "${topSubgroup.name}", messages: ${topSubgroup.messages} }`
      : "\nNo subgroup exports found yet — drop them in data/exports/groups/ and re-run (build5 §5.2)."
  );

  // Product saga TBDs (build5 §5.3) — everything a lead still needs to fill
  // in lib/content/chapter.ts's PRODUCT_SAGA before copy freeze. Reads the
  // live block, so a field drops off this list the moment it's filled.
  console.log("\n=== PRODUCT SAGA — still TBD ===\n");
  const stillTbd = SAGA_TBD_HINTS.filter((f) => f.get() === null);
  if (stillTbd.length === 0) {
    console.log("Nothing left — PRODUCT_SAGA is fully filled.");
  } else {
    for (const f of stillTbd) console.log(`  PRODUCT_SAGA.${f.path} — fill from ${f.hint}`);
  }

  console.log("\n===================================\n");

  return { matchRatePct, clubFloorOk };
}
