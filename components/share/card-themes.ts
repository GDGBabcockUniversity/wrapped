import type { StoryId } from "@/lib/stories";

/**
 * Share-card styles (2026-07-20, Spotify-style picker): every card renders
 * in four looks the visitor chooses in the share sheet. `classic` is each
 * card's original art direction; `ink`, `cream`, and `accent` restyle the
 * same layout. The API route validates against CARD_STYLES and the sheet's
 * swatch row is generated from it — adding a style here lights it up
 * everywhere.
 */

export const INK = "#0f0f0f";
export const CREAM = "#fff6e0";
export const PAPER = "#fdfbf7";
export const CREAM_DEEP = "#f8ecc9";
export const BLUE = "#4285f4";
export const RED = "#ea4335";
export const YELLOW = "#faab00";
export const GREEN = "#34a853";

export type CardStyle = "classic" | "ink" | "cream" | "accent";
export const CARD_STYLES: CardStyle[] = ["classic", "ink", "cream", "accent"];

export function isCardStyle(v: string | null): v is CardStyle {
  return !!v && (CARD_STYLES as string[]).includes(v);
}

export interface CardTheme {
  bg: string; // page background
  fg: string; // primary text on bg
  muted: string; // secondary text on bg
  faint: string; // hairlines / whispers on bg
  dark: boolean; // bg is dark (watermark + scrims key off this)
  panelBg: string; // card/panel surface
  panelFg: string; // primary text on panel
  panelMuted: string; // secondary text on panel
  accent: string; // highlight color, guaranteed visible on bg
}

/** Story accent hex; `club` resolves via the caller (club hex) or falls red. */
export function storyAccentHex(storyId: StoryId, clubHex?: string): string {
  const byStory: Record<StoryId, string> = {
    "the-year": BLUE,
    moments: RED,
    built: BLUE,
    "group-chat": GREEN,
    people: YELLOW,
    "your-events": BLUE,
    standing: RED,
    "your-chapter": GREEN,
    "your-club": clubHex ?? RED,
    "whats-next": GREEN,
    summary: GREEN,
  };
  return byStory[storyId];
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function themed(bg: string, accent: string): CardTheme {
  const dark = luminance(bg) < 0.55;
  const fg = dark ? CREAM : INK;
  // Accent must survive its own background — on an accent-colored page the
  // highlight becomes the foreground color instead of vanishing into itself.
  const visibleAccent = bg === accent ? fg : accent;
  return {
    bg,
    fg,
    muted: `${fg}99`,
    faint: `${fg}55`,
    dark,
    panelBg: dark ? PAPER : INK,
    panelFg: dark ? INK : CREAM,
    panelMuted: dark ? `${INK}99` : `${CREAM}99`,
    accent: visibleAccent,
  };
}

/** Each card's original art direction — what `classic` means per story. */
const CLASSIC_BG: Record<StoryId, string> = {
  "the-year": INK,
  moments: CREAM,
  built: INK,
  "group-chat": INK,
  people: CREAM,
  "your-events": INK,
  standing: CREAM,
  "your-chapter": INK,
  "your-club": INK, // panel carries the club color
  "whats-next": CREAM,
  summary: INK,
};

export function resolveTheme(storyId: StoryId, style: CardStyle, clubHex?: string): CardTheme {
  const accent = storyAccentHex(storyId, clubHex);
  switch (style) {
    case "classic":
      return themed(CLASSIC_BG[storyId], accent);
    case "ink":
      return themed(INK, accent);
    case "cream":
      return themed(CREAM, accent);
    case "accent":
      return themed(accent, accent);
  }
}
