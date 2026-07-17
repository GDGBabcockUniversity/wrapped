/** The canonical per-member shape assembled by compute-stats.ts, consumed by
 * percentiles.ts, clubs.ts, and write-snapshot.ts. */
export interface PipelineMember {
  userId: string;
  email: string;
  fullName: string;
  joinDate: Date;

  checkins: number;
  registrations: number;
  eventTitles: string[]; // most recent first, capped upstream
  checkinMonthlyCounts: Record<string, number>; // "yyyy-mm" -> count
  checkinDailyCounts: Record<string, number>; // "yyyy-mm-dd" -> count

  radarSignal: number; // reads + plays

  messagesMatched: boolean;
  messageCount: number;
  messageMonthlyCounts: Record<string, number>;
  messageDailyCounts: Record<string, number>;
  messageActiveDays: number;
}
