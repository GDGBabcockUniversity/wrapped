import { Pool } from "pg";

export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  whatsapp_number: string | null;
  created_at: Date;
}

export interface DbCheckin {
  user_id: string;
  checked_in_at: Date;
  title: string;
  starts_at: Date;
}

export interface DbRegistration {
  user_id: string;
  registered_at: Date;
  title: string; // event title — needed to dedupe against external sources
}

export interface DbCountRow {
  user_id: string;
  count: number;
}

export interface FetchedDb {
  users: DbUser[];
  checkins: DbCheckin[];
  registrations: DbRegistration[];
  radarReads: DbCountRow[];
  radarPlays: DbCountRow[];
  /** Titles of events run in the window — unioned with external sources for the chapter number. */
  eventTitlesRun: string[];
}

export async function fetchDbData(
  connectionString: string,
  yearStart: Date,
  yearEnd: Date
): Promise<FetchedDb> {
  const pool = new Pool({ connectionString });
  try {
    const users = await pool.query<DbUser>(
      `SELECT id, email, full_name, whatsapp_number, created_at FROM users
       WHERE is_active = TRUE AND deleted_at IS NULL`
    );

    const checkins = await pool.query<DbCheckin>(
      `SELECT c.user_id, c.checked_in_at, e.title, e.starts_at
       FROM event_checkins c JOIN events e ON e.id = c.event_id
       WHERE c.checked_in_at >= $1 AND c.checked_in_at < $2
       ORDER BY c.checked_in_at DESC`,
      [yearStart, yearEnd]
    );

    const registrations = await pool.query<DbRegistration>(
      `SELECT r.user_id, r.registered_at, e.title
       FROM event_registrations r JOIN events e ON e.id = r.event_id
       WHERE r.status = 'registered' AND r.registered_at >= $1 AND r.registered_at < $2`,
      [yearStart, yearEnd]
    );

    const radarReads = await pool.query<{ user_id: string; reads: string }>(
      `SELECT user_id, COUNT(*) AS reads FROM radar_reads GROUP BY user_id`
    );

    const radarPlays = await pool.query<{ user_id: string; plays: string }>(
      `SELECT user_id, COUNT(*) AS plays FROM radar_game_scores GROUP BY user_id`
    );

    const eventsRunResult = await pool.query<{ title: string }>(
      `SELECT title FROM events WHERE status IN ('published','ended')
       AND starts_at >= $1 AND starts_at < $2`,
      [yearStart, yearEnd]
    );

    return {
      users: users.rows,
      checkins: checkins.rows,
      registrations: registrations.rows,
      radarReads: radarReads.rows.map((r) => ({ user_id: r.user_id, count: parseInt(r.reads, 10) })),
      radarPlays: radarPlays.rows.map((r) => ({ user_id: r.user_id, count: parseInt(r.plays, 10) })),
      eventTitlesRun: eventsRunResult.rows.map((r) => r.title),
    };
  } finally {
    await pool.end();
  }
}
