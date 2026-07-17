import { Pool } from "pg";
import type { Snapshot, ChapterMeta } from "@/lib/snapshot";

export interface WriteSummary {
  membersWritten: number;
  matchRatePct: number;
}

export async function writeSnapshots(
  connectionString: string,
  snapshots: Map<string, { userId: string | null; data: Snapshot }>, // keyed by lowercased email
  chapterMeta: ChapterMeta,
  clubDistribution: Record<string, number>,
  matchRatePct: number
): Promise<WriteSummary> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [email, { userId, data }] of snapshots) {
      await client.query(
        `INSERT INTO wrapped_snapshots (email, user_id, year, data, computed_at)
         VALUES ($1, $2, '2025-2026', $3, now())
         ON CONFLICT (email) DO UPDATE
           SET user_id = EXCLUDED.user_id, data = EXCLUDED.data, computed_at = now()`,
        [email.toLowerCase(), userId, JSON.stringify(data)]
      );
    }

    await client.query(
      `INSERT INTO wrapped_meta (key, data, updated_at) VALUES ('chapter', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(chapterMeta)]
    );
    await client.query(
      `INSERT INTO wrapped_meta (key, data, updated_at) VALUES ('clubs', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(clubDistribution)]
    );
    await client.query(
      `INSERT INTO wrapped_meta (key, data, updated_at) VALUES ('run', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify({ at: new Date().toISOString(), matchRatePct, membersWritten: snapshots.size })]
    );

    await client.query("COMMIT");
    return { membersWritten: snapshots.size, matchRatePct };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

/** Deletes snapshot rows for members who opted out — run before writing new data. */
export async function deleteOptedOutSnapshots(
  connectionString: string,
  optedOutEmails: string[]
): Promise<void> {
  if (optedOutEmails.length === 0) return;
  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      `DELETE FROM wrapped_snapshots WHERE lower(email) = ANY($1::text[])`,
      [optedOutEmails.map((e) => e.toLowerCase())]
    );
  } finally {
    await pool.end();
  }
}
