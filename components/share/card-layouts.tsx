import { CHAPTER, GROUP_CHAT, PRODUCTS, productHeadlineStat } from "@/lib/content/chapter";
import { copy, fmt } from "@/lib/copy";
import { CLUBS } from "@/lib/clubs";
import type { Snapshot } from "@/lib/snapshot";
import { STICKER_LOGOMARK_BASE64 } from "./logo-data";
import { INK, CREAM, CREAM_DEEP, type CardTheme } from "./card-themes";

/**
 * Satori layouts for every share card, 1080×1920. Each card receives a
 * CardTheme (components/share/card-themes.ts) — `classic` reproduces the
 * original art direction; ink/cream/accent restyle the same layout, chosen
 * by the visitor in the share sheet. Product chips keep their literal GDG
 * colors in every theme: they're identity, not decoration.
 */

const CHIP_TEXT: Record<string, string> = { blue: CREAM, red: CREAM, yellow: INK, green: INK };
const BG_HEX: Record<string, string> = {
  blue: "#4285f4",
  red: "#ea4335",
  yellow: "#faab00",
  green: "#34a853",
};

function Watermark({ t }: { t: CardTheme }) {
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
      <img
        src={`data:image/png;base64,${STICKER_LOGOMARK_BASE64}`}
        style={{ width: 33, height: 22, display: "flex" }}
      />
      <div
        style={{
          fontFamily: "Google Sans",
          fontWeight: 500,
          fontSize: 22,
          color: t.muted,
        }}
      >
        wrapped.gdgbabcock.com
      </div>
    </div>
  );
}

function Base({ t, children }: { t: CardTheme; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: t.bg,
        position: "relative",
        fontFamily: "Google Sans",
      }}
    >
      {children}
    </div>
  );
}

export function TheYearCard({ t }: { t: CardTheme }) {
  const rows = copy.theYear.rows;
  const values: Record<string, number> = {
    eventsRun: CHAPTER.eventsRun,
    members: CHAPTER.members,
    productsShipped: CHAPTER.productsShipped,
    totalCheckins: CHAPTER.totalCheckins,
    messagesParsed: CHAPTER.messagesParsed,
  };
  return (
    <Base t={t}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          margin: "0 80px",
          padding: "64px 56px",
          background: t.panelBg,
          borderRadius: 12,
          color: t.panelFg,
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
            borderBottom: `2px dashed ${t.panelFg}55`,
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
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3,
                color: t.panelMuted,
              }}
            >
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
            borderTop: `2px dashed ${t.panelFg}55`,
          }}
        >
          {copy.theYear.footer}
        </div>
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function MomentsCard({ t }: { t: CardTheme }) {
  const frameBg = t.dark ? `${CREAM}22` : CREAM_DEEP;
  return (
    <Base t={t}>
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
              background: frameBg,
              borderRadius: 8,
              transform: `rotate(${rot}deg) translateX(${(i - 1) * 40}px)`,
            }}
          />
        ))}
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: 180,
            height: 34,
            background: t.accent,
            transform: "rotate(-5deg) translateY(-215px)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 700,
          color: t.fg,
          textAlign: "center",
          justifyContent: "center",
          padding: "0 80px 220px",
        }}
      >
        SOME NIGHTS YOU HAD TO BE THERE.
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function BuiltCard({ t }: { t: CardTheme }) {
  return (
    <Base t={t}>
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
        {PRODUCTS.map((p) => {
          const stat = productHeadlineStat(p.name);
          return (
            <div key={p.num} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ display: "flex", fontSize: 28, color: t.faint, width: 60 }}>
                  {p.num}
                </div>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontSize: 56,
                    fontWeight: 700,
                    color: t.fg,
                  }}
                >
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
              {/* build4 §10A.2 step 5: same null-renders-nothing rule as the
                  live story — no blank line where a stat isn't confirmed yet. */}
              {stat && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginLeft: 84 }}>
                  <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: t.fg }}>
                    {typeof stat.value === "number" ? stat.value.toLocaleString("en-US") : stat.value}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: 2,
                      color: t.muted,
                    }}
                  >
                    {stat.label}
                  </div>
                  {stat.detail && (
                    <div style={{ display: "flex", fontSize: 18, color: t.faint, marginLeft: "auto" }}>
                      {stat.detail}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 3,
          color: t.muted,
          justifyContent: "center",
          marginTop: "auto",
          marginBottom: 220,
        }}
      >
        ALL LIVE. ALL OURS.
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function GroupChatCard({ t }: { t: CardTheme }) {
  const rows: { value: string; label: string }[] = [
    { value: GROUP_CHAT.stickers.toLocaleString("en-US"), label: "STICKERS DEPLOYED" },
    { value: GROUP_CHAT.laughs.toLocaleString("en-US"), label: "LAUGHS ON RECORD" },
    { value: `${GROUP_CHAT.streakDays} DAYS`, label: "WITHOUT SILENCE" },
    { value: GROUP_CHAT.peakHourLabel, label: "PEAK HOUR" },
  ];
  return (
    <Base t={t}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          margin: "0 90px",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            color: t.muted,
          }}
        >
          {copy.groupChat.revealLabel}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 190,
            fontWeight: 700,
            color: t.accent,
            marginTop: 8,
          }}
        >
          {GROUP_CHAT.messages.toLocaleString("en-US")}
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: t.fg }}>
          MESSAGES SENT
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            gap: 26,
          }}
        >
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                borderBottom: `2px solid ${t.faint}`,
                paddingBottom: 18,
              }}
            >
              <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: t.fg }}>
                {r.value}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: t.muted,
                }}
              >
                {r.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: t.muted, marginTop: 40 }}>
          Sleep is a suggestion.
        </div>
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function PeopleCard({ t }: { t: CardTheme }) {
  const sections = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS"];
  return (
    <Base t={t}>
      <div
        style={{
          display: "flex",
          fontSize: 88,
          fontWeight: 700,
          color: t.fg,
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
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 3,
                color: t.muted,
              }}
            >
              {s}
            </div>
            <div style={{ display: "flex", width: 120, height: 4, background: t.accent }} />
          </div>
        ))}
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function YourEventsCard({ snapshot, t }: { snapshot: Snapshot; t: CardTheme }) {
  const { events, flags } = snapshot;
  if (flags.zeroCheckins) {
    return (
      <Base t={t}>
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
              border: `6px solid ${t.accent}`,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              color: t.accent,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            ADMIT ONE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              color: t.fg,
              textAlign: "center",
            }}
          >
            {CHAPTER.eventsRun} events happened this year.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: t.muted, textAlign: "center" }}>
            26/27 has my name on it.
          </div>
        </div>
        <Watermark t={t} />
      </Base>
    );
  }
  return (
    <Base t={t}>
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
            color: t.accent,
          }}
        >
          {events.checkins}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            color: t.fg,
            textAlign: "center",
          }}
        >
          {snapshot.firstName} checked into {events.checkins} events
        </div>
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function StandingCard({ snapshot, t }: { snapshot: Snapshot; t: CardTheme }) {
  const isTier = snapshot.standing.tier !== "member";
  if (isTier) {
    const TIER_LABEL: Record<string, string> = { top1: "1", top5: "5", top10: "10", top25: "25" };
    const tierNum = TIER_LABEL[snapshot.standing.tier] ?? "";
    return (
      <Base t={t}>
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
              color: t.accent,
              transform: "rotate(-2deg)",
            }}
          >
            {fmt(copy.standing.revealTier, { percentile: tierNum })}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: t.muted, textAlign: "center" }}>
            GDG BABCOCK COMMUNITY · 25/26
          </div>
        </div>
        <Watermark t={t} />
      </Base>
    );
  }
  return (
    <Base t={t}>
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
              <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: t.fg }}>
                {snapshot.messages.count}
              </div>
              <div style={{ display: "flex", fontSize: 22, color: t.muted, letterSpacing: 2 }}>
                MESSAGES
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: t.fg }}>
              {snapshot.events.checkins}
            </div>
            <div style={{ display: "flex", fontSize: 22, color: t.muted, letterSpacing: 2 }}>
              EVENTS
            </div>
          </div>
        </div>
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function YourChapterCard({ snapshot, t }: { snapshot: Snapshot; t: CardTheme }) {
  return (
    <Base t={t}>
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
            color: t.fg,
            textAlign: "center",
            transform: "skewX(-8deg)",
          }}
        >
          HERE SINCE {snapshot.joinMonthLabel.toUpperCase()}
        </div>
        <div style={{ display: "flex", width: 600, height: 6, background: t.accent, borderRadius: 3 }} />
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function YourClubCard({ snapshot, t }: { snapshot: Snapshot; t: CardTheme }) {
  const club = CLUBS[snapshot.club.id];
  // The club card's inner panel is always the ink club card — its identity.
  // On an ink page it lifts to a slightly lighter surface for separation.
  const innerBg = t.bg === INK ? "#1c1c1c" : INK;
  return (
    <Base t={t}>
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
            background: innerBg,
            borderRadius: 32,
            padding: 56,
            border: `2px solid ${CREAM}44`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 3,
                color: `${CREAM}cc`,
              }}
            >
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
          <div style={{ display: "flex", fontSize: 26, color: `${CREAM}aa`, marginTop: 16 }}>
            {club.role}
          </div>
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
      <Watermark t={t} />
    </Base>
  );
}

export function WhatsNextCard({ t }: { t: CardTheme }) {
  return (
    <Base t={t}>
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
            color: t.accent,
            textAlign: "center",
          }}
        >
          THE 100 IS LIVE.
        </div>
      </div>
      <Watermark t={t} />
    </Base>
  );
}

export function SummaryCard({
  snapshot,
  guest,
  t,
}: {
  snapshot: Snapshot | null;
  guest: boolean;
  t: CardTheme;
}) {
  const club = snapshot ? CLUBS[snapshot.club.id] : null;
  return (
    <Base t={t}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "160px 90px",
          padding: 56,
          background: t.panelBg,
          borderRadius: 32,
          color: t.panelFg,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img
            src={`data:image/png;base64,${STICKER_LOGOMARK_BASE64}`}
            style={{ width: 33, height: 22, display: "flex" }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 2,
              color: t.panelMuted,
            }}
          >
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
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
                  {CHAPTER.eventsRun}
                </div>
                <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>EVENTS</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
                  {CHAPTER.members}+
                </div>
                <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>MEMBERS</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 700, marginTop: 40 }}>
              {snapshot.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 40 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>
                  {copy.summary.memberSince}
                </div>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
                  {snapshot.joinMonthLabel}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>
                  {copy.summary.club}
                </div>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: club!.hex }}>
                  {club!.name}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 56, marginTop: 48 }}>
              {!snapshot.flags.zeroCheckins && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
                    {snapshot.events.checkins}
                  </div>
                  <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>
                    {copy.summary.statEvents}
                  </div>
                </div>
              )}
              {snapshot.messages.matched && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
                    {snapshot.messages.count}
                  </div>
                  <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>
                    {copy.summary.statMessages}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
                  {snapshot.tenureMonths}
                </div>
                <div style={{ display: "flex", fontSize: 20, color: t.panelMuted }}>
                  {copy.summary.statMonths}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Watermark t={t} />
    </Base>
  );
}
