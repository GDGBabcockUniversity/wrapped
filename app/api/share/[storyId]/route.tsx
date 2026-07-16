import { ImageResponse } from "next/og";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SATORI_FONTS } from "@/lib/satori-fonts";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getSnapshotByEmail } from "@/lib/db";
import { FIXTURES, type FixtureName } from "@/lib/fixtures";
import type { Snapshot } from "@/lib/snapshot";
import { STORIES, type StoryId } from "@/lib/stories";
import {
  TheYearCard,
  MomentsCard,
  BuiltCard,
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

const PUBLIC_CARDS = new Set<StoryId>(["the-year", "moments", "built", "people", "whats-next"]);

const SIZE = { width: 1080, height: 1920 };

async function resolveSnapshot(req: NextRequest): Promise<{ snapshot: Snapshot | null; guest: boolean } | null> {
  // Fixture override — non-production only, for /debug/cards.
  if (process.env.NODE_ENV !== "production") {
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

  if (PUBLIC_CARDS.has(def.id)) {
    const element = renderPublicCard(def.id);
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

  const element = renderPersonalCard(def.id, resolved.snapshot, resolved.guest);
  return new ImageResponse(element, {
    ...SIZE,
    fonts: SATORI_FONTS,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function renderPublicCard(id: StoryId) {
  switch (id) {
    case "the-year":
      return <TheYearCard />;
    case "moments":
      return <MomentsCard />;
    case "built":
      return <BuiltCard />;
    case "people":
      return <PeopleCard />;
    case "whats-next":
      return <WhatsNextCard />;
    default:
      throw new Error(`unreachable public card: ${id}`);
  }
}

function renderPersonalCard(id: StoryId, snapshot: Snapshot | null, guest: boolean) {
  switch (id) {
    case "your-events":
      return snapshot ? <YourEventsCard snapshot={snapshot} /> : <SummaryCard snapshot={null} guest={guest} />;
    case "standing":
      return snapshot ? <StandingCard snapshot={snapshot} /> : <SummaryCard snapshot={null} guest={guest} />;
    case "your-chapter":
      return snapshot ? <YourChapterCard snapshot={snapshot} /> : <SummaryCard snapshot={null} guest={guest} />;
    case "your-club":
      return snapshot ? <YourClubCard snapshot={snapshot} /> : <SummaryCard snapshot={null} guest={guest} />;
    case "summary":
      return <SummaryCard snapshot={snapshot} guest={guest} />;
    default:
      throw new Error(`unreachable personal card: ${id}`);
  }
}
