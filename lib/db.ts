import { neon } from "@neondatabase/serverless";
import { SnapshotSchema, type Snapshot } from "@/lib/snapshot";

function sql() {
  return neon(process.env.DATABASE_URL!);
}

export async function getSnapshotByEmail(email: string): Promise<Snapshot | null> {
  const query = sql();
  const rows = await query`
    SELECT data FROM wrapped_snapshots WHERE lower(email) = ${email.toLowerCase().trim()} LIMIT 1`;
  if (rows.length === 0) return null;
  const parsed = SnapshotSchema.safeParse(rows[0]!.data);
  return parsed.success ? parsed.data : null; // malformed row → treat as non-member (prod-safe)
}

/** Cheap "do we have a wrapped for this email" check — a `SELECT 1`, no JSON
    parse. Backs the quota-safe send gate: we only email people we actually
    have something to show. Throws on DB error (caller decides fail-open). */
export async function snapshotExistsByEmail(email: string): Promise<boolean> {
  const query = sql();
  const rows = await query`
    SELECT 1 FROM wrapped_snapshots WHERE lower(email) = ${email.toLowerCase().trim()} LIMIT 1`;
  return rows.length > 0;
}

/**
 * Atomically claims a "you may send now" slot for an email, DB-backed so it
 * survives serverless (an in-memory limiter resets on every cold start and
 * can't cap Resend usage across instances). Returns true at most once per
 * `cooldownMs` per email: the conditional upsert only writes — and only
 * RETURNs a row — when no send happened inside the window. Idempotent by
 * construction; a burst of identical requests yields exactly one send.
 */
export async function claimMagicSendSlot(email: string, cooldownMs: number): Promise<boolean> {
  const query = sql();
  const key = `magiclink:${email.toLowerCase().trim()}`;
  const cutoff = new Date(Date.now() - cooldownMs);
  const rows = await query`
    INSERT INTO wrapped_meta (key, data, updated_at)
    VALUES (${key}, '{}'::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET updated_at = now()
      WHERE wrapped_meta.updated_at < ${cutoff.toISOString()}
    RETURNING key`;
  return rows.length > 0;
}

/**
 * Every address with a Wrapped waiting for it — the send-out list.
 *
 * The table IS the list, which is the point: the pipeline deletes the
 * snapshots of anyone who opted out (scripts/pipeline/write-snapshot.ts), so
 * an opt-out cannot be missed here by forgetting to check a second place.
 * Ordered so a run that dies halfway resumes over the same sequence.
 */
export async function listSnapshotEmails(): Promise<string[]> {
  const query = sql();
  const rows = await query`
    SELECT lower(email) AS email FROM wrapped_snapshots ORDER BY lower(email)`;
  return rows.map((r) => r.email as string);
}

/**
 * Claim the right to send someone their Wrapped, exactly once, for good.
 *
 * Unlike claimMagicSendSlot's rolling window this never expires: a broadcast
 * is not a thing you retry on a timer, and the failure it exists to prevent —
 * a re-run of the script mailing five hundred people a second time — has no
 * cooldown that makes it acceptable. `force` is the deliberate override, and
 * it is why the script asks for it explicitly rather than inferring it.
 *
 * Returns true when this caller is the one that may send.
 */
export async function claimDeliverySlot(email: string, force = false): Promise<boolean> {
  const query = sql();
  const key = `delivery:${email.toLowerCase().trim()}`;
  const rows = force
    ? await query`
        INSERT INTO wrapped_meta (key, data, updated_at)
        VALUES (${key}, '{}'::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET updated_at = now()
        RETURNING key`
    : await query`
        INSERT INTO wrapped_meta (key, data, updated_at)
        VALUES (${key}, '{}'::jsonb, now())
        ON CONFLICT (key) DO NOTHING
        RETURNING key`;
  return rows.length > 0;
}

/** Addresses already sent to, so a dry run can report the real remainder. */
export async function listDeliveredEmails(): Promise<Set<string>> {
  const query = sql();
  const rows = await query`
    SELECT key FROM wrapped_meta WHERE key LIKE 'delivery:%'`;
  return new Set(rows.map((r) => (r.key as string).slice("delivery:".length)));
}

/** Count of snapshot rows — the health endpoint's "is there any data yet"
    signal. Returns null if the table is unreachable/missing so a caller can
    tell "DB down / not migrated" apart from "migrated but empty" (0). */
export async function countSnapshots(): Promise<number | null> {
  try {
    const query = sql();
    const rows = await query`SELECT count(*)::int AS n FROM wrapped_snapshots`;
    return (rows[0]?.n as number | undefined) ?? 0;
  } catch {
    return null;
  }
}
