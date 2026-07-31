import "dotenv/config";
import {
  listSnapshotEmails,
  listDeliveredEmails,
  claimDeliverySlot,
} from "@/lib/db";
import { sendWrappedDeliveryEmail } from "@/lib/email";
import { selectRecipients } from "@/lib/send-list";
import { signDeliveryToken, DELIVERY_TOKEN_TTL } from "@/lib/session";

/**
 * Sends everyone their Wrapped.
 *
 * The chapter does not ask members to come and fetch this; it arrives. Every
 * address with a snapshot gets one email carrying a link that logs them
 * straight into their own deck, good for the season (lib/session.ts).
 *
 *   npm run send-wrapped                    # dry run — who WOULD be mailed
 *   npm run send-wrapped -- --send          # actually send
 *   npm run send-wrapped -- --only a@b.com --send
 *   npm run send-wrapped -- --limit 5 --send
 *   npm run send-wrapped -- --force --send  # re-send to people already done
 *
 * Three properties this has to have, because an email cannot be recalled:
 *
 *  - Dry by default. Nothing goes out without --send, spelled out in full.
 *  - Once per person, ever. The slot is claimed in the database BEFORE the
 *    send, so a crash, a re-run, or two people running it at once cannot
 *    double-mail anybody. That ordering costs a lost email if the send then
 *    fails, which is the right way round: --only can retry an individual,
 *    but nothing can un-send.
 *  - Paced. Resend rate-limits, and a rejected send here is a member who
 *    never hears from us.
 */

interface Args {
  send: boolean;
  force: boolean;
  only?: string;
  limit?: number;
  rps: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { send: false, force: false, rps: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--send") args.send = true;
    else if (a === "--force") args.force = true;
    else if (a === "--only") args.only = argv[++i]?.toLowerCase().trim();
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--rps") args.rps = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(
        "usage: send-wrapped [--send] [--force] [--only EMAIL] [--limit N] [--rps N]"
      );
      process.exit(0);
    } else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (args.limit !== undefined && !Number.isFinite(args.limit)) {
    console.error("--limit needs a number");
    process.exit(2);
  }
  if (!Number.isFinite(args.rps) || args.rps <= 0) {
    console.error("--rps needs a positive number");
    process.exit(2);
  }
  return args;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set. Refusing to run.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Checked up front, before a single email moves. A run that discovers
  // halfway through that it has been minting links to the wrong host has
  // already done the damage.
  requireEnv("DATABASE_URL");
  requireEnv("WRAPPED_SESSION_SECRET");
  const siteUrl = requireEnv("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
  if (args.send && !process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — --send would print links, not send them.");
    process.exit(1);
  }

  const all = await listSnapshotEmails();
  const delivered = await listDeliveredEmails();

  if (args.only && !all.includes(args.only)) {
    console.error(`no wrapped snapshot for ${args.only} — nothing to send.`);
    process.exit(1);
  }
  const targets = selectRecipients(all, delivered, args);

  console.log(`site        ${siteUrl}`);
  console.log(`link life   ${DELIVERY_TOKEN_TTL}`);
  console.log(`snapshots   ${all.length}`);
  console.log(`already out ${delivered.size}`);
  console.log(`to send     ${targets.length}${args.force ? " (forced)" : ""}`);

  if (targets.length === 0) {
    console.log("\nnothing to do.");
    return;
  }

  if (!args.send) {
    console.log("\nDRY RUN — nothing sent. Re-run with --send.\n");
    for (const email of targets.slice(0, 20)) console.log(`  ${email}`);
    if (targets.length > 20) console.log(`  … and ${targets.length - 20} more`);
    return;
  }

  const gap = 1000 / args.rps;
  let sent = 0;
  const failed: { email: string; error: string }[] = [];

  console.log("");
  for (const [i, email] of targets.entries()) {
    // Claim FIRST. If this process dies between the claim and the send, that
    // address is skipped by later runs and can be picked up with --only — a
    // recoverable miss. Claiming after would leave the opposite failure, a
    // second copy in somebody's inbox, which is not recoverable at all.
    const mine = await claimDeliverySlot(email, args.force);
    if (!mine) {
      console.log(`  skip  ${email} (already claimed)`);
      continue;
    }

    const token = await signDeliveryToken(email);
    const result = await sendWrappedDeliveryEmail(email, token, siteUrl);
    if (result.ok) {
      sent++;
      console.log(`  sent  ${email}  (${i + 1}/${targets.length})`);
    } else {
      failed.push({ email, error: result.error ?? "unknown" });
      console.log(`  FAIL  ${email}  ${result.error}`);
    }
    if (i < targets.length - 1) await sleep(gap);
  }

  console.log(`\nsent ${sent}, failed ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nretry these individually with --only … --send --force:");
    for (const f of failed) console.log(`  ${f.email}  ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
