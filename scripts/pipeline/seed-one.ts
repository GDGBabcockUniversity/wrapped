import { Pool } from "pg";
import { FIXTURES } from "@/lib/fixtures";
import { SnapshotSchema } from "@/lib/snapshot";

/**
 * Seeds ONE personal wrapped for a single email, so the member flow can be
 * smoke-tested end-to-end in prod before the full pipeline has run. Writes a
 * ready-made fixture snapshot (default `top1`) into wrapped_snapshots for the
 * given email — after this, that email's magic link resolves to a real member
 * experience instead of the guest fallback.
 *
 * This is a TEST/DEMO convenience, not the real data path — the actual member
 * numbers come from `npm run pipeline` against the auth DB. A seeded row is
 * overwritten the next time the real pipeline runs for that email.
 *
 * Usage:
 *   PIPELINE_DATABASE_URL=<neon url> \
 *     npx tsx scripts/pipeline/seed-one.ts <email> [fixtureKey] [display name]
 *
 * Examples:
 *   ... seed-one.ts you@example.com                 # top1 fixture
 *   ... seed-one.ts you@example.com member "Real Name"
 *   ... seed-one.ts --list                          # show fixture keys
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(
      "Usage: PIPELINE_DATABASE_URL=<url> npx tsx scripts/pipeline/seed-one.ts <email> [fixtureKey] [display name]\n" +
        `Fixtures: ${Object.keys(FIXTURES).join(", ")}`
    );
    process.exit(args.length === 0 ? 1 : 0);
  }
  if (args[0] === "--list") {
    for (const [k, v] of Object.entries(FIXTURES)) {
      console.log(`  ${k.padEnd(12)} ${v.name} — ${v.club.id}, ${v.standing.tier}, ${v.events.checkins} check-ins`);
    }
    return;
  }

  const email = args[0]!.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`"${args[0]}" is not a valid email.`);
    process.exit(1);
  }

  const fixtureKey = args[1] ?? "top1";
  const fixture = FIXTURES[fixtureKey];
  if (!fixture) {
    console.error(`Unknown fixture "${fixtureKey}". Available: ${Object.keys(FIXTURES).join(", ")}`);
    process.exit(1);
  }

  const displayName = args.slice(2).join(" ").trim();
  const snapshot = displayName
    ? { ...fixture, name: displayName, firstName: displayName.split(/\s+/)[0]! }
    : fixture;

  // Validate against the same schema /api/me parses with, so a seeded row can
  // never be the "malformed → treated as non-member" case.
  const check = SnapshotSchema.safeParse(snapshot);
  if (!check.success) {
    console.error("Fixture failed snapshot validation:", check.error.issues);
    process.exit(1);
  }

  const connectionString = process.env.PIPELINE_DATABASE_URL;
  if (!connectionString) {
    console.error("PIPELINE_DATABASE_URL is not set. Point it at the auth Neon DB and retry.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      `INSERT INTO wrapped_snapshots (email, user_id, year, data, computed_at)
       VALUES ($1, NULL, '2025-2026', $2, now())
       ON CONFLICT (email) DO UPDATE
         SET data = EXCLUDED.data, computed_at = now()`,
      [email, JSON.stringify(snapshot)]
    );
    console.log(
      `Seeded ${email} with the "${fixtureKey}" fixture (${snapshot.name}).\n` +
        "Request a magic link for that email — it now resolves to the member experience."
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
