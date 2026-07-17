/**
 * The member universe: auth-platform users ∪ community.dev roster ∪ anyone
 * who appears in a Luma/ORBIT/community attendance export. Identity key is
 * the lowercased email. Event activity is deduped per (email, normalized
 * event title) across ALL sources, so an event tracked in both the auth
 * platform and Luma counts once.
 */

import type { FetchedDb } from "./fetch-db";
import type { ExternalData } from "./sources";
import { normalizeTitleKey } from "./sources";

export interface UniverseMember {
  email: string; // lowercased — THE identity key
  userId: string | null; // auth-platform UUID when they have an account
  fullName: string;
  whatsappNumber: string | null; // auth platform only
  joinDate: Date;
  sources: string[]; // "auth" | filenames
}

export interface MemberActivity {
  checkins: number; // distinct events checked into
  registrations: number; // distinct events registered for
  titles: string[]; // checked-in event titles, most recent first, capped 8
  checkinMonthlyCounts: Record<string, number>;
  checkinDailyCounts: Record<string, number>;
  radarSignal: number;
}

export interface Universe {
  members: UniverseMember[];
  activity: Map<string, MemberActivity>; // email -> merged activity
  eventsRun: number; // distinct event titles across all sources
}

interface EventRecord {
  title: string;
  titleKey: string;
  registered: boolean;
  checkedIn: boolean;
  checkedInAt: Date | null;
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function titleCaseEmailLocal(email: string): string {
  return email
    .split("@")[0]!
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildUniverse(
  db: FetchedDb,
  external: ExternalData,
  yearStart: Date,
  yearEnd: Date
): Universe {
  const members = new Map<string, UniverseMember>();
  const events = new Map<string, Map<string, EventRecord>>(); // email -> titleKey -> record

  function ensureMember(email: string, fullName: string | null, source: string, seenAt: Date | null) {
    const existing = members.get(email);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (seenAt && seenAt < existing.joinDate) existing.joinDate = seenAt;
      // A real name beats an email-derived one from an earlier source.
      if (fullName && existing.fullName === titleCaseEmailLocal(email)) existing.fullName = fullName;
      return existing;
    }
    const member: UniverseMember = {
      email,
      userId: null,
      fullName: fullName ?? titleCaseEmailLocal(email),
      whatsappNumber: null,
      joinDate: seenAt ?? yearStart,
      sources: [source],
    };
    members.set(email, member);
    return member;
  }

  function eventRecord(email: string, title: string): EventRecord {
    const titleKey = normalizeTitleKey(title);
    let perMember = events.get(email);
    if (!perMember) {
      perMember = new Map();
      events.set(email, perMember);
    }
    let record = perMember.get(titleKey);
    if (!record) {
      record = { title, titleKey, registered: false, checkedIn: false, checkedInAt: null };
      perMember.set(titleKey, record);
    }
    return record;
  }

  // 1. Auth platform users — they carry the UUID and WhatsApp number.
  const emailByUserId = new Map<string, string>();
  for (const u of db.users) {
    const email = u.email.trim().toLowerCase();
    emailByUserId.set(u.id, email);
    const member = ensureMember(email, u.full_name, "auth", u.created_at);
    member.userId = u.id;
    member.whatsappNumber = u.whatsapp_number;
    if (u.created_at < member.joinDate) member.joinDate = u.created_at;
  }

  // 2. External roster (community.dev member export).
  for (const r of external.roster) {
    ensureMember(r.email, r.fullName, r.source, r.joinedAt);
  }

  // 3. Auth-platform event activity.
  for (const c of db.checkins) {
    const email = emailByUserId.get(c.user_id);
    if (!email) continue;
    const record = eventRecord(email, c.title);
    record.checkedIn = true;
    record.registered = true; // being in the room implies it
    if (!record.checkedInAt || c.checked_in_at < record.checkedInAt) {
      record.checkedInAt = c.checked_in_at;
    }
  }
  for (const r of db.registrations) {
    const email = emailByUserId.get(r.user_id);
    if (!email) continue;
    eventRecord(email, r.title).registered = true;
  }

  // 4. External attendance (Luma / ORBIT / community per-event exports).
  //    Anyone here who isn't a member yet becomes one — they registered for a
  //    chapter event; that's membership enough for a Wrapped.
  for (const a of external.attendance) {
    const seenAt = a.registeredAt ?? a.checkedInAt ?? a.eventDate;
    const inWindow =
      !seenAt || (seenAt >= new Date(yearStart.getTime() - 365 * 86400000) && seenAt < yearEnd);
    if (!inWindow) continue; // garbage timestamp guard; the lead curates the folder

    ensureMember(a.email, a.fullName, a.source, seenAt);
    const record = eventRecord(a.email, a.eventTitle);
    record.registered = true;
    if (a.checkedIn) {
      record.checkedIn = true;
      const at = a.checkedInAt ?? a.eventDate;
      if (at && (!record.checkedInAt || at < record.checkedInAt)) record.checkedInAt = at;
    }
  }

  // 5. Radar signal, keyed back to email.
  const radarByEmail = new Map<string, number>();
  for (const r of [...db.radarReads, ...db.radarPlays]) {
    const email = emailByUserId.get(r.user_id);
    if (!email) continue;
    radarByEmail.set(email, (radarByEmail.get(email) ?? 0) + r.count);
  }

  // 6. Collapse per-member event records into MemberActivity.
  const activity = new Map<string, MemberActivity>();
  const allTitleKeys = new Set<string>(db.eventTitlesRun.map(normalizeTitleKey));

  for (const [email, perMember] of events) {
    const records = [...perMember.values()];
    for (const rec of records) allTitleKeys.add(rec.titleKey);

    const checkedIn = records
      .filter((r) => r.checkedIn)
      .sort((a, b) => (b.checkedInAt?.getTime() ?? 0) - (a.checkedInAt?.getTime() ?? 0));

    const monthly: Record<string, number> = {};
    const daily: Record<string, number> = {};
    for (const rec of checkedIn) {
      if (!rec.checkedInAt) continue; // counts toward totals, not toward timing signals
      if (rec.checkedInAt < yearStart || rec.checkedInAt >= yearEnd) continue;
      monthly[monthKey(rec.checkedInAt)] = (monthly[monthKey(rec.checkedInAt)] ?? 0) + 1;
      daily[dayKey(rec.checkedInAt)] = (daily[dayKey(rec.checkedInAt)] ?? 0) + 1;
    }

    activity.set(email, {
      checkins: checkedIn.length,
      registrations: records.filter((r) => r.registered).length,
      titles: checkedIn.slice(0, 8).map((r) => r.title),
      checkinMonthlyCounts: monthly,
      checkinDailyCounts: daily,
      radarSignal: radarByEmail.get(email) ?? 0,
    });
  }

  // Members with radar activity but no event records still need their signal.
  for (const [email, signal] of radarByEmail) {
    if (!activity.has(email)) {
      activity.set(email, {
        checkins: 0,
        registrations: 0,
        titles: [],
        checkinMonthlyCounts: {},
        checkinDailyCounts: {},
        radarSignal: signal,
      });
    }
  }

  return {
    members: [...members.values()],
    activity,
    eventsRun: allTitleKeys.size,
  };
}
