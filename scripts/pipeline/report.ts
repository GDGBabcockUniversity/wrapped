import type { Snapshot, ChapterMeta, ClubId } from "@/lib/snapshot";
import type { PipelineMember } from "./types";
import { activityScore } from "./percentiles";

export function printReport(
  members: PipelineMember[],
  snapshots: Map<string, Snapshot>,
  chapterMeta: ChapterMeta,
  matchedMessageVolume: number,
  totalMessageVolume: number
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

  // Chapter numbers to paste into lib/content/chapter.ts
  console.log("\n--- Paste into lib/content/chapter.ts ---");
  console.log(`members: ${chapterMeta.members},`);
  console.log(`eventsRun: ${chapterMeta.eventsRun},`);
  console.log(`totalCheckins: ${chapterMeta.totalCheckins},`);
  console.log(`messagesParsed: ${chapterMeta.messagesParsed},`);

  console.log("\n===================================\n");

  return { matchRatePct, clubFloorOk };
}
