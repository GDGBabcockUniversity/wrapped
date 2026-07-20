import { ImageResponse } from "next/og";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SATORI_FONTS } from "@/lib/satori-fonts";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";
import { FIXTURES, type FixtureName } from "@/lib/fixtures";
import { CLUBS } from "@/lib/clubs";
import type { Snapshot } from "@/lib/snapshot";
import { STORIES, type StoryId } from "@/lib/stories";
import { resolveTheme, isCardStyle, type CardStyle } from "@/components/share/card-themes";
import {
  TheYearCard,
  MomentsCard,
  BuiltCard,
  GroupChatCard,
  PeopleCard,
  YourEventsCard,
  StandingCard,
  YourChapterCard,
  YourClubCard,
  WhatsNextCard,
  SummaryCard,
} from "@/components/share/card-layouts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Every story is shareable (owner, 2026-07-20): the public chapter beats
// need no snapshot at all; "your-*" beats need one and fall back to the
// guest summary card when there isn't one, same as before.
const PUBLIC_CARDS = new Set<StoryId>(["the-year", "moments", "built", "group-chat", "people", "whats-next"]);

const SIZE = { width: 1080, height: 1920 };

async function resolveSnapshot(req: NextRequest): Promise<{ snapshot: Snapshot | null; guest: boolean } | null> {
  // Fixture override for /debug/cards — same gate as that page, so a Vercel
  // preview with ALLOW_DEBUG=1 renders the full card grid. Never set
  // ALLOW_DEBUG on the production project.
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEBUG) {
    const fixture = req.nextUrl.searchParams.get("fixture") as FixtureName | null;
    if (fixture && FIXTURES[fixture]) {
      return { snapshot: FIXTURES[fixture], guest: false };
    }
    if (fixture === "guest") {
      return { snapshot: null, guest: true };
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token, "session");
    const snapshot = await getSnapshotByEmail(payload.email);
    return { snapshot, guest: snapshot === null };
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const def = STORIES.find((s) => s.id === storyId);
  if (!def) {
    return new Response("not found", { status: 404 });
  }

  const styleParam = req.nextUrl.searchParams.get("style");
  const style: CardStyle = isCardStyle(styleParam) ? styleParam : "classic";

  if (PUBLIC_CARDS.has(def.id)) {
    const element = renderPublicCard(def.id, style);
    return new ImageResponse(element, {
      ...SIZE,
      fonts: SATORI_FONTS,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  const resolved = await resolveSnapshot(req);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  }

  const element = renderPersonalCard(def.id, resolved.snapshot, resolved.guest, style);
  return new ImageResponse(element, {
    ...SIZE,
    fonts: SATORI_FONTS,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function renderPublicCard(id: StoryId, style: CardStyle) {
  const t = resolveTheme(id, style);
  switch (id) {
    case "the-year":
      return <TheYearCard t={t} />;
    case "moments":
      return <MomentsCard t={t} />;
    case "built":
      return <BuiltCard t={t} />;
    case "group-chat":
      return <GroupChatCard t={t} />;
    case "people":
      return <PeopleCard t={t} />;
    case "whats-next":
      return <WhatsNextCard t={t} />;
    default:
      throw new Error(`unreachable public card: ${id}`);
  }
}

function renderPersonalCard(id: StoryId, snapshot: Snapshot | null, guest: boolean, style: CardStyle) {
  const clubHex = snapshot ? CLUBS[snapshot.club.id].hex : undefined;
  const t = resolveTheme(id, style, clubHex);
  const guestFallback = <SummaryCard snapshot={null} guest={guest} t={resolveTheme("summary", style)} />;
  switch (id) {
    case "your-events":
      return snapshot ? <YourEventsCard snapshot={snapshot} t={t} /> : guestFallback;
    case "standing":
      return snapshot ? <StandingCard snapshot={snapshot} t={t} /> : guestFallback;
    case "your-chapter":
      return snapshot ? <YourChapterCard snapshot={snapshot} t={t} /> : guestFallback;
    case "your-club":
      return snapshot ? <YourClubCard snapshot={snapshot} t={t} /> : guestFallback;
    case "summary":
      return <SummaryCard snapshot={snapshot} guest={guest} t={resolveTheme("summary", style)} />;
    default:
      throw new Error(`unreachable personal card: ${id}`);
  }
}
