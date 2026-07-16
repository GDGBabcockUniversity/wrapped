import { z } from "zod";

export const ClubId = z.enum(["builder", "connector", "observer", "sprinter"]);
export type ClubId = z.infer<typeof ClubId>;

export const SnapshotSchema = z.object({
  version: z.literal(1),
  name: z.string(), // full_name from users table
  firstName: z.string(), // first token of name, for copy
  joinDate: z.string(), // ISO date
  joinMonthLabel: z.string(), // e.g. "September 2024" — precomputed, copy uses it verbatim
  tenureMonths: z.number().int().min(0),
  isNewMember: z.boolean(), // joined after 2026-03-01
  events: z.object({
    checkins: z.number().int().min(0),
    registrations: z.number().int().min(0),
    titles: z.array(z.string()).max(8), // most recent first, for the ticker list
    firstEventTitle: z.string().nullable(),
  }),
  messages: z.discriminatedUnion("matched", [
    z.object({
      matched: z.literal(true),
      count: z.number().int().min(0),
      activeDays: z.number().int().min(0),
      peakMonthLabel: z.string().nullable(), // e.g. "November"
    }),
    z.object({ matched: z.literal(false) }),
  ]),
  standing: z.object({
    percentile: z.number().int().min(1).max(100), // 1 = top 1%
    tier: z.enum(["top1", "top5", "top10", "top25", "member"]),
  }),
  club: z.object({
    id: ClubId,
    rarityPct: z.number().int().min(1).max(100), // share of chapter in this club
  }),
  flags: z.object({
    zeroCheckins: z.boolean(),
    lowActivity: z.boolean(), // checkins <= 1 AND (unmatched OR messages < 20)
  }),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ChapterMetaSchema = z.object({
  version: z.literal(1),
  members: z.number().int(), // total members in the chapter (headline number)
  eventsRun: z.number().int(),
  totalCheckins: z.number().int(),
  messagesParsed: z.number().int(),
  productsShipped: z.number().int(),
  clubDistribution: z.record(ClubId, z.number()),
  computedAt: z.string(),
});
export type ChapterMeta = z.infer<typeof ChapterMetaSchema>;
