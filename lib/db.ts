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
