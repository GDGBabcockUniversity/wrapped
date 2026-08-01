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
  // Optional so snapshots written before RADAR was wired still parse — an
  // older blob simply has no radar beat, matching the null-skip contract the
  // chapter content already uses.
  radar: z
    .object({
      reads: z.number().int().min(0),
      readingMinutes: z.number().int().min(0),
      plays: z.number().int().min(0),
      distinctGames: z.number().int().min(0),
      topGame: z.string().nullable(),
      activeDays: z.number().int().min(0),
      longestStreak: z.number().int().min(0),
    })
    .nullable()
    .optional(),
  // ---- build spec §04, §06, §07 -----------------------------------------
  // All optional so snapshots written before these existed still parse, the
  // same null-skip contract the radar block already uses: a beat with no data
  // is dropped rather than rendered empty.

  /** Moment ids the member checked into, for the YOU WERE HERE stamps (§04).
      The check-in data already exists; this is it, keyed to the gallery. */
  attendedMomentIds: z.array(z.string()).nullable().optional(),

  /** The one day the chat remembers, for THIS member (§06). Derived by
      grouping their messages by day, taking the max, and joining to the
      events table on the date. */
  loudestDay: z
    .object({
      dateLabel: z.string(), // "FEB 22"
      count: z.number().int().min(0),
      startHour: z.string(), // "9PM"
      endHour: z.string(), // "2AM"
      eventName: z.string().nullable(),
    })
    .nullable()
    .optional(),

  /** The social graph (§07), all of it from check-ins alone. */
  rooms: z
    .object({
      /** Distinct members who shared at least one event. */
      count: z.number().int().min(0),
      /** Highest co-attendance. Directional: their card may name someone else. */
      top: z.object({ name: z.string(), events: z.number().int() }).nullable(),
      /** Everyone who completed a multi-day series together. */
      group: z
        .object({ others: z.number().int(), days: z.number().int(), seriesName: z.string() })
        .nullable(),
      /** The first person they ever checked in beside. */
      origin: z
        .object({ name: z.string(), dateLabel: z.string(), eventName: z.string() })
        .nullable(),
    })
    .nullable()
    .optional(),

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
