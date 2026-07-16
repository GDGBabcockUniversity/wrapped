import type { StoryId } from "@/lib/stories";

export const CHAPTER = {
  members: 500, // TBD-confirm
  eventsRun: 23, // TBD-confirm
  productsShipped: 5,
  totalCheckins: 1400, // TBD-confirm (pipeline report will supply the real value)
  messagesParsed: 13000, // TBD-confirm (pipeline report will supply the real value)
} as const;

export interface Moment {
  id: string;
  title: string;
  caption: string;
  images: string[]; // /moments/<id>/NN.jpg
}

export const MOMENTS: Moment[] = [
  {
    id: "orbit",
    title: "ORBIT",
    caption: "The flagship. A full first-semester arc.",
    images: ["/moments/orbit/01.jpg", "/moments/orbit/02.jpg", "/moments/orbit/03.jpg"],
  },
  {
    id: "devfest",
    title: "DEVFEST",
    caption: "The big one. Babcock showed up.",
    images: ["/moments/devfest/01.jpg", "/moments/devfest/02.jpg"],
  },
  {
    id: "games",
    title: "GAME NIGHTS",
    caption: "Competitive. Unnecessarily so.",
    images: ["/moments/games/01.jpg", "/moments/games/02.jpg"],
  },
  {
    id: "spaces",
    title: "TWITTER SPACES",
    caption: "The conversations that ran too long.",
    images: ["/moments/spaces/01.jpg"],
  },
];

export const PRODUCTS = [
  { num: "01", name: "GDG WEBSITE", color: "blue", url: "gdgbabcock.com" },
  { num: "02", name: "BABCOCKVOTES", color: "green", url: "babcockvotes.com" },
  { num: "03", name: "RADAR", color: "blue", url: "radar.gdgbabcock.com" },
  { num: "04", name: "ORBIT", color: "red", url: "orbit.gdgbabcock.com" },
  { num: "05", name: "BABCOCK 100", color: "yellow", url: "babcock100.com" },
] as const;

export interface Person {
  name: string;
  role: string;
  section: "CORE" | "TRACKS" | "DEV" | "MEDIA" | "EVENTS";
  photo: string | null;
}

// SECTIONS order is fixed: CORE, TRACKS, DEV, MEDIA, EVENTS
// Filled per §14.3 from the team CSV once consent-filtered rows are curated.
export const PEOPLE: Person[] = [
  { name: "Chukwuneku Akpotohwo", role: "Organizer", section: "CORE", photo: "/people/chukwuneku-akpotohwo.jpg" },
  { name: "Sophia Osariemen Odiase", role: "Co-Organizer", section: "CORE", photo: "/people/sophia-osariemen-odiase.jpg" },
  { name: "Sharon Lawal", role: "Core Team", section: "CORE", photo: "/people/sharon-lawal.jpg" },
  { name: "Omobolanle Shaibu", role: "Core Team", section: "CORE", photo: "/people/omobolanle-shaibu.jpg" },
  { name: "Habeeb Abayomi", role: "Core Team", section: "CORE", photo: "/people/habeeb-abayomi.jpg" },
  { name: "Victor Ibironke", role: "Core Team", section: "CORE", photo: null },
  { name: "Braimah Olatilewa \"Brymar\"", role: "Core Team", section: "CORE", photo: "/people/braimah-olatilewa-eyituoyo-brymar.jpg" },
  { name: "Favour Oluwatunmibi", role: "Core Team", section: "CORE", photo: "/people/favour-oluwatunmibi.jpg" },
  { name: "Azubuike Chimamanda Favour", role: "Core Team", section: "CORE", photo: "/people/azubuike-chimamanda-favour.jpg" },
  { name: "Efegherimoni Oghenetejiri", role: "Core Team", section: "CORE", photo: "/people/efegherimoni-oghenetejiri.jpg" },
];

export const ASSET_MANIFEST: Partial<Record<StoryId, string[]>> = {
  moments: MOMENTS.flatMap((m) => m.images),
  people: PEOPLE.map((p) => p.photo).filter((p): p is string => Boolean(p)),
};
