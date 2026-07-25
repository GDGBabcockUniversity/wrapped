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

export interface DbRadarReads {
  user_id: string;
  reads: number;
  seconds: number;
}

export interface DbRadarPlays {
  user_id: string;
  plays: number;
  distinct_games: number;
}

export interface DbRadarTopGame {
  user_id: string;
  game: string;
  plays: number;
}

export interface DbRadarDay {
  user_id: string;
  day: string; // "YYYY-MM-DD"
}

export interface FetchedDb {
  users: DbUser[];
  checkins: DbCheckin[];
  registrations: DbRegistration[];
  radarReads: DbRadarReads[];
  radarPlays: DbRadarPlays[];
  radarTopGame: DbRadarTopGame[];
  radarDays: DbRadarDay[];
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

    // RADAR queries are windowed like everything else above. Reads are dated
    // by first_read_at where it exists: read_at is overwritten on every
    // re-read, so it would drag an article read last September into this
    // year's numbers. Rows recovered from Redis carry no date at all and are
    // correctly excluded — they can't be attributed to a year.
    const radarReads = await pool.query<{
      user_id: string;
      reads: string;
      seconds: string;
    }>(
      `SELECT user_id,
              COUNT(*) AS reads,
              COALESCE(SUM(seconds), 0) AS seconds
       FROM radar_reads
       WHERE COALESCE(first_read_at, read_at) >= $1
         AND COALESCE(first_read_at, read_at) < $2
       GROUP BY user_id`,
      [yearStart, yearEnd]
    );

    const radarPlays = await pool.query<{
      user_id: string;
      plays: string;
      distinct_games: string;
    }>(
      `SELECT user_id,
              COUNT(*) AS plays,
              COUNT(DISTINCT game) AS distinct_games
       FROM radar_game_scores
       WHERE played_at >= $1 AND played_at < $2
       GROUP BY user_id`,
      [yearStart, yearEnd]
    );

    const radarTopGame = await pool.query<{
      user_id: string;
      game: string;
      plays: string;
    }>(
      `SELECT user_id, game, plays FROM (
         SELECT user_id,
                game,
                COUNT(*) AS plays,
                ROW_NUMBER() OVER (
                  PARTITION BY user_id ORDER BY COUNT(*) DESC, game ASC
                ) AS rn
         FROM radar_game_scores
         WHERE played_at >= $1 AND played_at < $2
         GROUP BY user_id, game
       ) ranked
       WHERE rn = 1`,
      [yearStart, yearEnd]
    );

    const radarDays = await pool.query<{ user_id: string; day: string }>(
      `SELECT user_id, to_char(day, 'YYYY-MM-DD') AS day
       FROM radar_activity_days
       WHERE day >= $1::date AND day < $2::date
       ORDER BY user_id, day ASC`,
      [yearStart, yearEnd]
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
      radarReads: radarReads.rows.map((r) => ({
        user_id: r.user_id,
        reads: parseInt(r.reads, 10),
        seconds: parseInt(r.seconds, 10),
      })),
      radarPlays: radarPlays.rows.map((r) => ({
        user_id: r.user_id,
        plays: parseInt(r.plays, 10),
        distinct_games: parseInt(r.distinct_games, 10),
      })),
      radarTopGame: radarTopGame.rows.map((r) => ({
        user_id: r.user_id,
        game: r.game,
        plays: parseInt(r.plays, 10),
      })),
      radarDays: radarDays.rows,
      eventTitlesRun: eventsRunResult.rows.map((r) => r.title),
    };
  } finally {
    await pool.end();
  }
}
