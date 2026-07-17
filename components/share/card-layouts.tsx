import { CHAPTER, PRODUCTS } from "@/lib/content/chapter";
import { copy, fmt } from "@/lib/copy";
import { CLUBS } from "@/lib/clubs";
import type { Snapshot } from "@/lib/snapshot";

const INK = "#0f0f0f";
const CREAM = "#fff6e0";
const PAPER = "#fdfbf7";
const CREAM_DEEP = "#f8ecc9";
const BLUE = "#4285f4";
const RED = "#ea4335";
const YELLOW = "#faab00";
const GREEN = "#34a853";

const CHIP_TEXT: Record<string, string> = { blue: CREAM, red: CREAM, yellow: INK, green: INK };
const BG_HEX: Record<string, string> = { blue: BLUE, red: RED, yellow: YELLOW, green: GREEN };

function Watermark({ dark }: { dark: boolean }) {
  const dotColors = [BLUE, RED, YELLOW, GREEN];
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        bottom: 56,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        {dotColors.map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />
        ))}
      </div>
      <div
        style={{
          fontFamily: "Google Sans",
          fontWeight: 500,
          fontSize: 22,
          color: dark ? `${CREAM}99` : `${INK}99`,
        }}
      >
        wrapped.gdgbabcock.com
      </div>
    </div>
  );
}

function Base({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: bg,
        position: "relative",
        fontFamily: "Google Sans",
      }}
    >
      {children}
    </div>
  );
}

export function TheYearCard() {
  const rows = copy.theYear.rows;
  const values: Record<string, number> = {
    eventsRun: CHAPTER.eventsRun,
    members: CHAPTER.members,
    productsShipped: CHAPTER.productsShipped,
    totalCheckins: CHAPTER.totalCheckins,
    messagesParsed: CHAPTER.messagesParsed,
  };
  return (
    <Base bg={INK}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          margin: "0 80px",
          padding: "64px 56px",
          background: PAPER,
          borderRadius: 12,
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            justifyContent: "center",
            paddingBottom: 24,
            borderBottom: `2px dashed ${INK}55`,
          }}
        >
          {copy.theYear.revealLabel}
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "20px 0",
            }}
          >
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700 }}>
              {values[row.key]}
              {row.key === "members" ? "+" : ""}
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, opacity: 0.7 }}>
              {row.label}
            </div>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            justifyContent: "center",
            paddingTop: 24,
            borderTop: `2px dashed ${INK}55`,
          }}
        >
          {copy.theYear.footer}
        </div>
      </div>
      <Watermark dark />
    </Base>
  );
}

export function MomentsCard() {
  return (
    <Base bg={CREAM}>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {[-6, 0, 6].map((rot, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              position: "absolute",
              width: 420,
              height: 420,
              background: CREAM_DEEP,
              borderRadius: 8,
              transform: `rotate(${rot}deg) translateX(${(i - 1) * 40}px)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 700,
          color: INK,
          textAlign: "center",
          justifyContent: "center",
          padding: "0 80px 220px",
        }}
      >
        SOME NIGHTS YOU HAD TO BE THERE.
      </div>
      <Watermark dark={false} />
    </Base>
  );
}

export function BuiltCard() {
  return (
    <Base bg={INK}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          margin: "0 80px",
          gap: 44,
        }}
      >
        {PRODUCTS.map((p) => (
          <div key={p.num} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", fontSize: 28, color: `${CREAM}66`, width: 60 }}>{p.num}</div>
            <div style={{ display: "flex", flex: 1, fontSize: 56, fontWeight: 700, color: CREAM }}>
              {p.name}
            </div>
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 999,
                background: BG_HEX[p.color],
                color: CHIP_TEXT[p.color],
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              LIVE
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 3,
          color: `${CREAM}99`,
          justifyContent: "center",
          marginTop: "auto",
          marginBottom: 220,
        }}
      >
        ALL LIVE. ALL OURS.
      </div>
    </Base>
  );
}

export function PeopleCard() {
  const sections = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS"];
  return (
    <Base bg={CREAM}>
      <div
        style={{
          display: "flex",
          fontSize: 88,
          fontWeight: 700,
          color: INK,
          justifyContent: "center",
          margin: "220px 0 100px",
        }}
      >
        ROLL CREDITS.
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          margin: "0 100px",
          gap: 40,
        }}
      >
        {sections.map((s) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 3, color: `${INK}88` }}>
              {s}
            </div>
            <div style={{ display: "flex", width: 120, height: 4, background: YELLOW }} />
          </div>
        ))}
      </div>
      <Watermark dark={false} />
    </Base>
  );
}

export function YourEventsCard({ snapshot }: { snapshot: Snapshot }) {
  const { events, flags } = snapshot;
  if (flags.zeroCheckins) {
    return (
      <Base bg={INK}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "0 100px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 480,
              height: 240,
              border: `6px solid ${BLUE}`,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              color: BLUE,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            ADMIT ONE
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: CREAM, textAlign: "center" }}>
            {CHAPTER.eventsRun} events happened this year.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: `${CREAM}88`, textAlign: "center" }}>
            26/27 has my name on it.
          </div>
        </div>
        <Watermark dark />
      </Base>
    );
  }
  return (
    <Base bg={INK}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 420,
            fontWeight: 700,
            color: BLUE,
          }}
        >
          {events.checkins}
        </div>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: CREAM, textAlign: "center" }}>
          {snapshot.firstName} checked into {events.checkins} events
        </div>
      </div>
      <Watermark dark />
    </Base>
  );
}

export function StandingCard({ snapshot }: { snapshot: Snapshot }) {
  const isTier = snapshot.standing.tier !== "member";
  if (isTier) {
    const TIER_LABEL: Record<string, string> = { top1: "1", top5: "5", top10: "10", top25: "25" };
    const tierNum = TIER_LABEL[snapshot.standing.tier] ?? "";
    return (
      <Base bg={CREAM}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 700,
              color: RED,
              transform: "rotate(-2deg)",
            }}
          >
            {fmt(copy.standing.revealTier, { percentile: tierNum })}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: `${INK}99`, textAlign: "center" }}>
            GDG BABCOCK COMMUNITY · 25/26
          </div>
        </div>
        <Watermark dark={false} />
      </Base>
    );
  }
  return (
    <Base bg={CREAM}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", gap: 80 }}>
          {snapshot.messages.matched && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: INK }}>
                {snapshot.messages.count}
              </div>
              <div style={{ display: "flex", fontSize: 22, color: `${INK}77`, letterSpacing: 2 }}>MESSAGES</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: INK }}>
              {snapshot.events.checkins}
            </div>
            <div style={{ display: "flex", fontSize: 22, color: `${INK}77`, letterSpacing: 2 }}>EVENTS</div>
          </div>
        </div>
      </div>
      <Watermark dark={false} />
    </Base>
  );
}

export function YourChapterCard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Base bg={INK}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: "0 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Bricolage",
            fontSize: 56,
            color: CREAM,
            textAlign: "center",
            transform: "skewX(-8deg)",
          }}
        >
          HERE SINCE {snapshot.joinMonthLabel.toUpperCase()}
        </div>
        <div style={{ display: "flex", width: 600, height: 6, background: GREEN, borderRadius: 3 }} />
      </div>
      <Watermark dark />
    </Base>
  );
}

export function YourClubCard({ snapshot }: { snapshot: Snapshot }) {
  const club = CLUBS[snapshot.club.id];
  return (
    <Base bg={club.hex}>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 720,
            height: 1008,
            background: INK,
            borderRadius: 32,
            padding: 56,
            border: `2px solid ${CREAM}44`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: `${CREAM}cc` }}>
              {copy.yourClub.revealPrefix}
            </div>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: club.hex }}>
              {club.name[0]}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              height: 280,
              borderRadius: 16,
              background: `${club.hex}22`,
              marginTop: 40,
            }}
          />
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: club.hex, marginTop: 40 }}>
            {club.name}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage",
              fontSize: 36,
              color: CREAM,
              marginTop: 16,
              transform: "skewX(-8deg)",
            }}
          >
            {club.vibe}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: `${CREAM}aa`, marginTop: 16 }}>{club.role}</div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              padding: "12px 28px",
              background: club.hex,
              color: INK,
              fontSize: 24,
              fontWeight: 700,
              borderRadius: 4,
              alignSelf: "flex-start",
            }}
          >
            {fmt(copy.yourClub.rarity, { rarityPct: snapshot.club.rarityPct })}
          </div>
        </div>
      </div>
      <Watermark dark />
    </Base>
  );
}

export function WhatsNextCard() {
  return (
    <Base bg={CREAM}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 88,
            fontWeight: 700,
            color: GREEN,
            textAlign: "center",
          }}
        >
          THE 100 IS LIVE.
        </div>
      </div>
      <Watermark dark={false} />
    </Base>
  );
}

export function SummaryCard({
  snapshot,
  guest,
}: {
  snapshot: Snapshot | null;
  guest: boolean;
}) {
  const club = snapshot ? CLUBS[snapshot.club.id] : null;
  return (
    <Base bg={INK}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "160px 90px",
          padding: 56,
          background: CREAM,
          borderRadius: 32,
          color: INK,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[BLUE, RED, YELLOW, GREEN].map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 999, background: c, display: "flex" }} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 2, opacity: 0.6 }}>
            {copy.summary.title}
          </div>
        </div>

        {guest || !snapshot ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 40 }}>
              {copy.summary.guestTitle}
            </div>
            <div style={{ display: "flex", gap: 60, marginTop: 48 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{CHAPTER.eventsRun}</div>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>EVENTS</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{CHAPTER.members}+</div>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>MEMBERS</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 700, marginTop: 40 }}>{snapshot.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 40 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>{copy.summary.memberSince}</div>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>{snapshot.joinMonthLabel}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>{copy.summary.club}</div>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: club!.hex }}>{club!.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 56, marginTop: 48 }}>
              {!snapshot.flags.zeroCheckins && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{snapshot.events.checkins}</div>
                  <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>{copy.summary.statEvents}</div>
                </div>
              )}
              {snapshot.messages.matched && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{snapshot.messages.count}</div>
                  <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>{copy.summary.statMessages}</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{snapshot.tenureMonths}</div>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.5 }}>{copy.summary.statMonths}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Watermark dark />
    </Base>
  );
}
