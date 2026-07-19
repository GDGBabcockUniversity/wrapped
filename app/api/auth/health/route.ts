import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { countSnapshots } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The magic-link runbook's first stop (build6 §7.3/§7.4) — booleans only,
 * never actual secret values. `email_from`/`site_url` are configuration,
 * not secrets, so they're shown as-is to catch typos at a glance. No auth
 * on this route: it leaks nothing exploitable, only which vars are set.
 */
async function checkDbReachable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const query = sql`SELECT 1`;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("db health check timed out")), 2000)
    );
    await Promise.race([query, timeout]);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const dbReachable = await checkDbReachable();
  // How many personal wrappeds exist. This is the single most useful signal:
  // null = table missing (migration not applied) or DB down; 0 = migrated but
  // the pipeline hasn't run, so every magic link lands on the guest view;
  // >0 = data is live. (The "my link doesn't work" report was really this = 0.)
  const snapshots = dbReachable ? await countSnapshots() : null;
  return NextResponse.json({
    session_secret: !!process.env.WRAPPED_SESSION_SECRET,
    resend_key: !!process.env.RESEND_API_KEY,
    database_url: !!process.env.DATABASE_URL,
    email_from: process.env.EMAIL_FROM ?? "GDG Wrapped <wrapped@gdgbabcock.com>",
    site_url: process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin,
    db_reachable: dbReachable,
    snapshots,
  });
}
