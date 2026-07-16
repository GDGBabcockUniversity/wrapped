import type { ClubId } from "@/lib/snapshot";

export const CLUBS: Record<
  ClubId,
  {
    name: string; // display name
    vibe: string; // one-liner on the card
    accent: "green" | "blue" | "yellow" | "red";
    hex: string;
    pattern: "grid" | "waves" | "halftone" | "diagonals";
    role: string; // "the role you play" line
  }
> = {
  builder: {
    name: "BUILDER",
    vibe: "Show up. Ship it. Repeat.",
    accent: "green",
    hex: "#34a853",
    pattern: "grid",
    role: "The chapter's hands. When something exists that didn't before, you were near it.",
  },
  connector: {
    name: "CONNECTOR",
    vibe: "The chat moves when you type.",
    accent: "blue",
    hex: "#4285f4",
    pattern: "waves",
    role: "The chapter's pulse. Conversations start, and somehow you're already in them.",
  },
  observer: {
    name: "OBSERVER",
    vibe: "Sees everything. Wastes nothing.",
    accent: "yellow",
    hex: "#faab00",
    pattern: "halftone",
    role: "The chapter's quiet radar. You watch, you pick your moments, and they count.",
  },
  sprinter: {
    name: "SPRINTER",
    vibe: "Zero to everywhere in one week.",
    accent: "red",
    hex: "#ea4335",
    pattern: "diagonals",
    role: "The chapter's surge. When you switch on, the whole feed knows about it.",
  },
};
