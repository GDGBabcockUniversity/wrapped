import type { StoryId } from "@/lib/stories";

export const CHAPTER = {
  // CONFIRMED from the real community.dev export (2026-07-18): 1,607 members
  // since inception, of whom 504 are active 25/26 track members per the
  // membership form. The receipt renders this with a "+" suffix. (The
  // pipeline's full universe is 2,166 once ORBIT registrations land — but
  // that includes external registrants, not members, so it stays out of
  // this display number.)
  members: 1600,
  // PIPELINE-CONFIRMED 2026-07-20 (with the ORBIT registrations CSV in):
  // 8 dated events with attendance exports — info session (Oct 5), Special
  // Edition meetup (Nov 2), the two DevFest-weekend track sessions (Nov 9),
  // Allstars (Nov 16), monthly meetup (Feb 1), the SW/Infra workshop (Feb
  // 20), ORBIT (Apr 17). The pipeline prints 9 because the auth DB still
  // holds a "Test Event" — excluded here. DevFest was attended, not
  // organized, so it never counts. Spaces/tech week/innovation challenge
  // have no attendance exports; drop CSVs in data/sources/events/ to count
  // them.
  eventsRun: 8,
  productsShipped: 5,
  totalCheckins: 526, // PIPELINE-CONFIRMED 2026-07-20 (event CSV check-ins)
  // Audited group-export totals (merge-exports + group-stats, 2026-07-19):
  // 11,607 main-chat + 5,972 subgroup messages. The pipeline's member-path
  // count (194) is NOT this number — that path is missing the main export.
  messagesParsed: 17579,
} as const;

export interface Moment {
  id: string;
  title: string;
  caption: string;
  images: string[]; // /moments/<id>/NN.jpg
}

// The full event slate, in the year's own order (owner, 2026-07-20): the
// info session opened the year, then the monthly meetups, All Stars, the
// Twitter Spaces, game nights (a WhatsApp thing — its page carries a stat,
// not a check-in count), DevFest (which came before ORBIT), Babcock Tech
// Week and the Babcock Innovation Challenge, and ORBIT closing as the
// flagship. Image paths are pre-listed slots: a missing file renders as a
// tinted placeholder, so dropping the photo into public/moments/<id>/
// fills it with zero code change (e.g. the two Spaces fliers → 02/03.jpg).
export const MOMENTS: Moment[] = [
  {
    id: "info-session",
    title: "INFO SESSION",
    caption: "Day one. The room said yes.",
    images: ["/moments/info-session/01.jpg"],
  },
  {
    id: "meetups",
    title: "MONTHLY MEETUPS",
    caption: "Every month. No excuses.",
    images: ["/moments/meetups/01.jpg", "/moments/meetups/02.jpg", "/moments/meetups/03.jpg"],
  },
  {
    id: "allstars",
    title: "ALL STARS",
    caption: "Every track's best, one room.",
    images: ["/moments/allstars/01.jpg"],
  },
  {
    id: "spaces",
    title: "TWITTER SPACES",
    caption: "The conversations that ran too long.",
    // 01 exists today; 02/03 are the two fliers the owner is dropping in.
    images: ["/moments/spaces/01.jpg", "/moments/spaces/02.jpg", "/moments/spaces/03.jpg"],
  },
  {
    id: "games",
    title: "GAME NIGHTS",
    caption: "Competitive. Unnecessarily so.",
    images: ["/moments/games/01.jpg", "/moments/games/02.jpg"],
  },
  {
    // build7 §3.3: DevFest is the continent's largest developer gathering —
    // showing up in force IS the flex, not a disclaimer.
    id: "devfest",
    title: "DEVFEST",
    caption: "The continent's biggest. We showed up in force.",
    images: ["/moments/devfest/01.jpg", "/moments/devfest/02.jpg"],
  },
  {
    id: "techweek",
    title: "BABCOCK TECH WEEK",
    caption: "A whole week. The whole campus.",
    images: ["/moments/techweek/01.jpg"],
  },
  {
    id: "innovation",
    title: "INNOVATION CHALLENGE",
    caption: "Pitched. Judged. Crowned.",
    images: ["/moments/innovation/01.jpg"],
  },
  {
    id: "orbit",
    title: "ORBIT",
    caption: "The flagship. A full second-semester arc.",
    images: ["/moments/orbit/01.jpg", "/moments/orbit/02.jpg", "/moments/orbit/03.jpg"],
  },
];

export const PRODUCTS = [
  { num: "01", name: "GDG WEBSITE", color: "blue", url: "gdgbabcock.com" },
  { num: "02", name: "BABCOCKVOTES", color: "green", url: "babcockvotes.com" },
  { num: "03", name: "RADAR", color: "blue", url: "radar.gdgbabcock.com" },
  { num: "04", name: "ORBIT", color: "red", url: "orbit.gdgbabcock.com" },
  { num: "05", name: "BABCOCK 100", color: "yellow", url: "babcock100.com" },
] as const;

// Product saga beats (build5 §3) — the What We Built story walks each
// product with receipts instead of a flat stat cycle. Every `null` beat is
// SKIPPED at render (no blank, no zero). VERIFIED values were read directly
// from the ORBIT repo (src/lib/constants.ts) and the Radar repo
// (app/lib/games.ts) on 2026-07-19; the rest are OWNER-CONFIRMED 2026-07-20
// (Radar issues/reads, BabcockVotes totals, ORBIT crowd sizes, Babcock100).
// Still open: Radar game plays (only the Radar DB knows) and site analytics.
export interface SagaStat {
  value: number | string; // slam numeral or string (e.g. "MONIEPOINT")
  label: string; // small-caps label
  detail?: string; // optional second line
}
export const PRODUCT_SAGA = {
  radar: {
    // 7 issues since December, including Radar's first-ever series. Reads
    // per issue: 30, 46, 159, 140, 273, 126, 74 — issue 5 leads.
    articles: { value: 7, label: "ISSUES PUBLISHED", detail: "the first dropped in December" } as SagaStat,
    mostRead: { value: "ISSUE 5", label: "MOST READ" } as SagaStat,
    reads: { value: 848, label: "TOTAL READS", detail: "including our first-ever series" } as SagaStat,
    games: { value: 7, label: "GAMES SHIPPED", detail: "3 in the newsletter, then 4 more" } as SagaStat, // VERIFIED (radar repo)
    gameNames: [
      "SIGNAL", "CROSSLINKS", "CRYPTIC", "RAPID FIRE",
      "NEW YEAR, NEW LIES", "VALENTINE'S MATCH", "FIND YOUR TRACK",
    ],
  },
  votes: {
    elections: { value: 9, label: "ELECTIONS RUN" } as SagaStat,
    votesCast: { value: 29253, label: "VOTES CAST" } as SagaStat,
    fallbackLine: "Democracy, but make it digital.", // shown only if BOTH null
  },
  orbit: {
    intro: "ONE FLAGSHIP. THREE DAYS.",
    companies: { value: 5, label: "COMPANIES VISITED" } as SagaStat, // VERIFIED
    companyNames: ["PAYSTACK", "DIGITAL ENCODE", "RISE", "NITHUB", "CUBBES"],
    lagos: { value: "70+", label: "STUDENTS TO LAGOS", detail: "the industry field trip" } as SagaStat,
    careerFair: { value: "1,000+", label: "AT THE CAREER FAIR" } as SagaStat,
    summit: { value: "500+", label: "AT THE CONFERENCE" } as SagaStat,
    speakers: { value: 12, label: "SPEAKERS ON STAGE", detail: "and 2 moderators keeping them honest" } as SagaStat, // VERIFIED
    tickets: { value: 547, label: "TICKETS ISSUED" } as SagaStat, // VERIFIED (build7 §3.1: check-in detail dropped)
    sponsors: { value: 23, label: "SPONSORS & PARTNERS" } as SagaStat, // VERIFIED
    headlineTease: "And one led the charge.",
    headline: { value: "MONIEPOINT", label: "HEADLINE SPONSOR" } as SagaStat, // VERIFIED
  },
  website: null as SagaStat | null, // TBD (site analytics)
  babcock100: { value: "400+", label: "NOMINATIONS", detail: "175 shortlisted" } as SagaStat,
} as const;

// The share card's per-product headline number (build5 §3.2 point 5) —
// one representative stat per product, sourced from the saga block. Same
// null-renders-nothing rule as everywhere else.
export function productHeadlineStat(
  name: (typeof PRODUCTS)[number]["name"]
): SagaStat | null {
  switch (name) {
    case "RADAR":
      return PRODUCT_SAGA.radar.articles ?? PRODUCT_SAGA.radar.games;
    case "BABCOCKVOTES":
      return PRODUCT_SAGA.votes.elections;
    case "ORBIT":
      return PRODUCT_SAGA.orbit.tickets;
    case "GDG WEBSITE":
      return PRODUCT_SAGA.website;
    case "BABCOCK 100":
      return PRODUCT_SAGA.babcock100;
    default:
      return null;
  }
}

// The reactive tap-to-guess beat (build4 §8) — the final beat of What We
// Built's reveal, after one full row cycle. Chapter data, not personal:
// guests and members see the same beat.
export const GUESS_GAME = {
  question: "One of these went live first. Which?",
  answerIndex: 0, // TBD-confirm with leads (index into PRODUCTS)
  right: "First try. You were paying attention.",
  wrong: "Wrong. The receipts don't lie.",
  timeout: "No guess? It was {answer}.",
} as const;

// The Builders board (§11.6 build2.md, Story 4's "THE BUILDERS" chapter) —
// per-product crew names, keyed by PRODUCTS[].name. TBD-confirm: empty until
// a lead fills them in; the card renders gracefully with just the product
// chip when its list is empty (never a blank line where names should be).
export const CREWS: Record<string, string[]> = {
  "GDG WEBSITE": [],
  "BABCOCKVOTES": [],
  "RADAR": [],
  "ORBIT": [],
  "BABCOCK 100": [],
};

// Main-group-chat fun stats (build5 §4) — recomputed 2026-07-19 from the
// FULL export drop (main chat + four track subgroups) after the date-order
// parser fix, then recomputed again through merge-exports.ts (build6 §6.1)
// — the dedupe pass found ~164 byte-identical duplicate lines within the
// raw exports (a handful of overlapping-window artifacts), so these are
// slightly lower than the pre-merge numbers and are the more accurate
// figures. Coverage spans all 11 months of the chapter year (Sept 2025 has
// only 2 messages because the group was created Sept 9 and only warmed up
// in October — real, not missing). Display names come from the EXPORTING
// phone's address book — TBD-review: the owner may remap any of them
// before freeze (e.g. "Habeeb Abayomi M." vs the earlier export's "Habibi"
// are the same person, different phone).
// Re-run: npx tsx scripts/pipeline/run-group-stats.ts
export const GROUP_CHAT = {
  messages: 11607,
  senders: 487,
  monthsMissing: 0, // full coverage — the "months missing" detail line null-skips
  topYappers: [
    { name: "Habeeb Abayomi M.", count: 1808 },
    { name: "Emma", count: 1138 },
    { name: "Dozie", count: 780 },
    { name: "YE", count: 759 },
    { name: "Neku", count: 629 },
  ],
  busiestDay: { label: "FEB 22", count: 1036, line: "One game night went completely off the rails." },
  peakHourLabel: "9PM", // 21:00-22:00
  afterMidnight: 798, // messages 00:00-04:59
  stickers: 1173,
  deleted: 107,
  laughs: 879, // 😂 + 💀 + 🤣 across the year
  dialect: [
    { word: "sha", count: 143 },
    { word: "dey", count: 106 },
    { word: "abeg", count: 48 },
    { word: "una", count: 39 },
    { word: "omo", count: 39 },
  ],
  streakDays: 25, // consecutive days with messages, Feb 13 → Mar 9 2026
  // Real subgroup exports landed (build5 §5.2 un-skips): Data & AI leads.
  topSubgroup: { name: "DATA & AI", messages: 3845 } as { name: string; messages: number } | null,
  // build6 §6.3: every track's count, for the subgroup beat's compact
  // 4-row bar list (topSubgroup alone only tells half the story).
  allSubgroups: [
    { name: "DATA & AI", messages: 3845 },
    { name: "SOFTWARE DEVELOPMENT & ENGINEERING", messages: 1010 },
    { name: "INFRASTRUCTURE & SECURITY", messages: 693 },
    { name: "DESIGN & MANAGEMENT", messages: 424 },
  ] as { name: string; messages: number }[] | null,
} as const;

export interface GroupTopics {
  wordsOfYear: { word: string; count: number }[] | null;
  emojiLeaderboard: { emoji: string; count: number }[] | null;
  topicBuckets: { name: string; count: number }[] | null;
  nameDrops: { name: string; count: number }[] | null;
  linksTotal: number | null;
  linkDomains: { domain: string; count: number }[] | null;
  questionsCount: number | null;
  shouter: { name: string; count: number } | null;
  longestMessage: { chars: number; sender: string } | null;
  starters: { name: string; count: number }[] | null;
}

// build6 §6.2: the topics engine (scripts/pipeline/topics.ts) audits WHAT
// the chat talked about, not just who/when/how much. Computed 2026-07-19
// from the same merged main-chat export as GROUP_CHAT above.
// Re-run: npx tsx scripts/pipeline/run-group-stats.ts
export const GROUP_TOPICS: GroupTopics = {
  // build7 §3.2: re-run through the junk filter (no consonant-only fragments
  // like pts/gdg, no sub-4-char non-slang like don/ohh). Owner curates before
  // freeze — e.g. "tejiri" is a member's name that slipped the roster stops.
  wordsOfYear: [
    { word: "sha", count: 143 },
    { word: "people", count: 134 },
    { word: "first", count: 118 },
    { word: "happy", count: 115 },
    { word: "dey", count: 106 },
    { word: "tejiri", count: 95 },
    { word: "even", count: 94 },
    { word: "babcock", count: 92 },
    { word: "real", count: 90 },
    { word: "give", count: 89 },
    { word: "points", count: 81 },
    { word: "image", count: 79 },
    { word: "question", count: 79 },
    { word: "nothing", count: 72 },
  ],
  emojiLeaderboard: [
    { emoji: "😂", count: 736 },
    { emoji: "😭", count: 661 },
    { emoji: "🤣", count: 104 },
    { emoji: "👀", count: 68 },
    { emoji: "😔", count: 53 },
    { emoji: "💀", count: 37 },
    { emoji: "😅", count: 37 },
    { emoji: "🌚", count: 36 },
  ],
  topicBuckets: [
    { name: "TECH", count: 231 },
    { name: "MONEY", count: 148 },
    { name: "EVENTS", count: 96 },
    { name: "EXAMS & SCHOOL", count: 35 },
    { name: "FOOTBALL", count: 28 },
    { name: "SPIRITUAL", count: 23 },
    { name: "LOVE & VAL", count: 22 },
    { name: "FOOD", count: 19 },
  ],
  nameDrops: [
    { name: "all", count: 5 },
    { name: "me", count: 3 },
    { name: "Meta", count: 1 },
    { name: "siri", count: 1 },
    { name: "his", count: 1 },
  ],
  linksTotal: 131,
  linkDomains: [
    { domain: "other", count: 83 },
    { domain: "x/twitter", count: 34 },
    { domain: "tiktok", count: 8 },
    { domain: "youtube", count: 4 },
    { domain: "instagram", count: 2 },
  ],
  questionsCount: 487,
  shouter: { name: "Habeeb Abayomi M.", count: 13 },
  longestMessage: { chars: 540, sender: "Neku" },
  starters: [
    { name: "Neku", count: 26 },
    { name: "Habeeb Abayomi M.", count: 21 },
    { name: "Dozie", count: 14 },
  ],
};

export interface Person {
  name: string;
  role: string;
  // SPONSORS and SPECIAL_THANKS are gone (build5 §6.6) — real sponsors live
  // in SPONSOR_WALL, advisors/MVPs/special force in their own consts below.
  section:
    | "CORE"
    | "SOFTWARE"
    | "DATA"
    | "INFRASTRUCTURE"
    | "DESIGN"
    | "DEV"
    | "MEDIA"
    | "EVENTS";
  photo: string | null;
  /** Leads render first and slightly larger in their chapter. */
  isLead?: boolean;
  /** Website subteam ("Frontend", "RADAR", ...) — MEDIA/DEV group by it. */
  subteam?: string;
}

// The credits roster — synced 2026-07-19 from the GDGWebsite team page
// (the pre-migration lib/team-data.ts roster, identical to what
// auth.gdgbabcock.com/team serves), in the /team page's own display order:
// sections core -> tracks (SW Dev -> Data & AI -> Infra -> Design) -> dev ->
// media -> events, subteams in declared order, leads first. Photos are the
// website's real headshots copied into /public/people. Re-sync recipe:
// build4 §10B.
export const PEOPLE: Person[] = [
  { name: "Chukwuneku Akpotohwo", role: "Organizer", section: "CORE", photo: "/people/chukwuneku-akpotohwo.jpg", isLead: true },
  { name: "Sophia Osariemen Odiase", role: "Co-Organizer", section: "CORE", photo: "/people/sophia-osariemen-odiase.jpg", isLead: true },
  { name: "Habeeb Muhammed", role: "Community Manager", section: "CORE", photo: "/people/habeeb-abayomi.jpg" },
  { name: "SHAIBU, Omobolanle Oluwademiladeogo", role: "Community Manager", section: "CORE", photo: "/people/omobolanle-shaibu.jpeg" },
  { name: "Victor Ibironke", role: "Technical Lead (Development)", section: "CORE", photo: "/people/victor-ibironke.jpg" },
  { name: "Favour Oluwatunmibi", role: "Technical Lead (Tracks)", section: "CORE", photo: "/people/favour-oluwatunmibi.jpg" },
  { name: "Lawal Sharon", role: "Operations Lead", section: "CORE", photo: "/people/sharon-lawal.jpg" },
  { name: "Braimah Olatilewa Eyituoyo Brymar", role: "Operations Lead", section: "CORE", photo: "/people/braimah-olatilewa-eyituoyo-brymar.jpg" },
  { name: "Efegherimoni Oghenetejiri", role: "Media & Marketing Lead", section: "CORE", photo: "/people/efegherimoni-oghenetejiri.jpeg" },
  { name: "Azubuike Chimamanda Favour", role: "Media and Marketing Co-Lead", section: "CORE", photo: "/people/azubuike-chimamanda-favour.jpg" },
  { name: "Alabi Reuben", role: "Software Development Track Lead", section: "SOFTWARE", photo: "/people/alabi-reuben.jpg", isLead: true, subteam: "Software Development & Engineering" },
  { name: "Oluwafemi Temitope Olatunji", role: "Mobile specialist", section: "SOFTWARE", photo: "/people/oluwafemi-temitope-olatunji.jpeg", subteam: "Software Development & Engineering" },
  { name: "Daniel Bolujo", role: "Quality Assurance Specialist", section: "SOFTWARE", photo: "/people/bolujo-daniel.jpg", subteam: "Software Development & Engineering" },
  { name: "Chidoziem Offor", role: "Data Science and Algorithms Specialist", section: "SOFTWARE", photo: "/people/chidoziem-offor.jpg", subteam: "Software Development & Engineering" },
  { name: "Providence Oduok", role: "Front End Web Specialist", section: "SOFTWARE", photo: "/people/providence-oduok.jpg", subteam: "Software Development & Engineering" },
  { name: "Balogun Eniola", role: "Core Team Member", section: "SOFTWARE", photo: "/people/balogun-eniola.jpg", subteam: "Software Development & Engineering" },
  { name: "Daniel Alexander Odulate", role: "Core Team Member", section: "SOFTWARE", photo: "/people/daniel-alexander-odulate.jpg", subteam: "Software Development & Engineering" },
  { name: "Eromoigbe Agbonikpeya", role: "Core Team Member", section: "SOFTWARE", photo: "/people/eromoigbe-agbonikpeya.jpg", subteam: "Software Development & Engineering" },
  { name: "Timilehin Adedayo", role: "Data and AI Track lead || Machine Learnimg Specialist", section: "DATA", photo: "/people/timilehin-adedayo.jpg", isLead: true, subteam: "Data & AI" },
  { name: "Ifeoma Ezeka", role: "Data engineering specialist", section: "DATA", photo: "/people/ifeoma-ezeka.jpeg", subteam: "Data & AI" },
  { name: "Ajagbe Olaoluwa", role: "Data Analytics Specialist", section: "DATA", photo: "/people/ajagbe-olaoluwa.jpg", subteam: "Data & AI" },
  { name: "David Obalabi", role: "Data Science Specialist", section: "DATA", photo: "/people/david-obalabi.jpeg", subteam: "Data & AI" },
  { name: "Okon Onono Ene", role: "Core Team Member", section: "DATA", photo: "/people/okon-onono-ene.jpeg", subteam: "Data & AI" },
  { name: "Oluwatomilola Arogundade", role: "Cybersecurity Specialist", section: "INFRASTRUCTURE", photo: "/people/oluwatomilola-arogundade.jpeg", isLead: true, subteam: "Infrastructure & Security" },
  { name: "Otelaja Oluwajuwonlo Okikiola", role: "Networking specialist", section: "INFRASTRUCTURE", photo: "/people/oluwajuwon-otelaja.jpeg", subteam: "Infrastructure & Security" },
  { name: "Emmanuel Ekundayo", role: "Cloud Specialist", section: "INFRASTRUCTURE", photo: "/people/emmanuel-ekundayo.jpg", subteam: "Infrastructure & Security" },
  { name: "Praise Akenroye", role: "Core Team Member", section: "INFRASTRUCTURE", photo: "/people/praise-akenroye.jpg", subteam: "Infrastructure & Security" },
  { name: "Oluwadayomisi Osisanya", role: "Design & Management Lead || Product Design Specialist", section: "DESIGN", photo: "/people/oluwadayomisi-osisanya.jpg", isLead: true, subteam: "Design & Management" },
  { name: "Adedoja Daniel Ademola", role: "Product Management Specialist", section: "DESIGN", photo: "/people/adedoja-daniel-ademola.jpg", subteam: "Design & Management" },
  { name: "Boluwatife Dada", role: "Games & Interactive Media Specialist", section: "DESIGN", photo: "/people/boluwatife-dada.png", subteam: "Design & Management" },
  { name: "Ademola Ademeso", role: "Lead", section: "DEV", photo: "/people/ademola-ademeso.jpeg", isLead: true, subteam: "Frontend" },
  { name: "Olugbesan Ayooluwakiitan Oluwatamilore", role: "Lead", section: "DEV", photo: "/people/olugbesan-ayooluwakiitan-oluwatamilore.jpg", isLead: true, subteam: "Backend" },
  { name: "Divine Athora", role: "Member", section: "DEV", photo: "/people/divine-athora.jpeg", subteam: "Product Design" },
  { name: "Olubowale Oluwatunmininu Temitope", role: "Member", section: "DEV", photo: "/people/olubowale-oluwatunmininu-temitope.jpeg", subteam: "Product Management" },
  { name: "Onyelukachukwu M. O. Obata", role: "Member", section: "DEV", photo: "/people/onyelukachukwu-m-o-obata.jpeg", subteam: "Product Management" },
  { name: "Uchenna Akubuiro", role: "Lead", section: "MEDIA", photo: "/people/uchenna-akubuiro.jpg", isLead: true, subteam: "Photographers" },
  { name: "Ojekemi Ayotomiwa", role: "Member", section: "MEDIA", photo: "/people/ojekemi-ayotomiwa.jpeg", subteam: "Photographers" },
  { name: "Bisong Best Ebu-Obasi", role: "Member", section: "MEDIA", photo: "/people/bisong-best-ebu-obasi.jpeg", subteam: "Content Creators" },
  { name: "Nafarnda Marilyn", role: "Member", section: "MEDIA", photo: "/people/nafarnda-marilyn.jpeg", subteam: "Content Creators" },
  { name: "Umaru Victor Oshioke", role: "Lead", section: "MEDIA", photo: "/people/umaru-victor-oshioke.jpeg", isLead: true, subteam: "Graphic Designers" },
  { name: "Olamide Fatunase", role: "Member", section: "MEDIA", photo: "/people/olamide-fatunase.jpeg", subteam: "Graphic Designers" },
  { name: "Xavier Okpalannajiaku", role: "Member", section: "MEDIA", photo: "/people/xavier-okpalannajiaku.png", subteam: "Graphic Designers" },
  { name: "Oyebajo Olaimide", role: "Lead", section: "MEDIA", photo: "/people/oyebajo-olaimide.jpg", isLead: true, subteam: "Video Editors" },
  { name: "Mokwunye Ogochukwu Asha", role: "Member", section: "MEDIA", photo: "/people/mokwunye-ogochukwu-asha.jpeg", subteam: "Video Editors" },
  { name: "Itamah Osedebame Ehigie", role: "Lead", section: "MEDIA", photo: "/people/itamah-osedebame-ehigie.jpg", isLead: true, subteam: "RADAR" },
  { name: "Agunbiade Ayomide Obanijesu", role: "Member", section: "MEDIA", photo: "/people/agunbiade-ayomide-obanijesu.jpeg", subteam: "RADAR" },
  { name: "Adeniran Oluwatamilore Janella", role: "Member", section: "MEDIA", photo: "/people/adeniran-oluwatamilore-janella.jpeg", subteam: "RADAR" },
  { name: "Harrison Tifeoluwanimi Dorcas", role: "Member", section: "MEDIA", photo: "/people/harrison-tifeoluwanimi-dorcas.jpg", subteam: "RADAR" },
  { name: "Ebosetaleh Andrea Andrew", role: "Member", section: "MEDIA", photo: "/people/ebosetaleh-andrea-andrew.jpeg", subteam: "RADAR" },
  { name: "Adefila Olutayo Esther", role: "Member", section: "MEDIA", photo: "/people/adefila-olutayo-esther.jpeg", subteam: "RADAR" },
  { name: "Wosu-Ezi Kamdirichukwu Blossom", role: "Member", section: "MEDIA", photo: "/people/wosu-ezi-kamdirichukwu-blossom.jpg", subteam: "RADAR" },
  { name: "Atolagbe Precious Olawole", role: "Member", section: "EVENTS", photo: "/people/atolagbe-precious-olawole.jpg" },
  { name: "Oseni David", role: "Member", section: "EVENTS", photo: "/people/oseni-david.jpeg" },
  { name: "NELSON-NWANONEZE DAVID", role: "Member", section: "EVENTS", photo: "/people/nelson-nwanoneze-david.png" },
  { name: "NELSON-NWANONEZE SAMUEL", role: "Member", section: "EVENTS", photo: "/people/nelson-nwanoneze-samuel.jpeg" },
  { name: "Alabo Treasure Sowari", role: "Member", section: "EVENTS", photo: "/people/alabo-treasure-sowari.jpg" },
  { name: "Oba odumeru", role: "Member", section: "EVENTS", photo: "/people/oba-odumeru.jpeg" },
  { name: "Akande Kehinde Gladys", role: "Member", section: "EVENTS", photo: "/people/akande-kehinde-gladys.jpg" },
  { name: "Akanni Temitope", role: "Member", section: "EVENTS", photo: "/people/akanni-temitope.jpg" },
  { name: "Iretomiwa Akande", role: "Member", section: "EVENTS", photo: "/people/iretomiwa-akande.jpeg" },
  { name: "Offiong Ryan", role: "Member", section: "EVENTS", photo: "/people/offiog-ryan.jpg" },
  // Sponsors and special thanks moved out to SPONSOR_WALL / ADVISORS / MVPS /
  // SPECIAL_FORCE below (build5 §6.5-6.6) — the old placeholder rows are gone.
];

// The sponsor wall (build5 §6.5) — transcribed VERIFIED from the ORBIT repo
// (src/lib/constants.ts SPONSOR_TIERS, 2026-07-19). Logos copied into
// /public/sponsors from the ORBIT repo's public/images/sponsors/*.
export interface SponsorTier {
  tier: string;
  sponsors: { name: string; logo: string }[];
}
export const SPONSOR_WALL: SponsorTier[] = [
  { tier: "HEADLINE SPONSOR", sponsors: [{ name: "Moniepoint", logo: "/sponsors/moniepoint.jpeg" }] },
  {
    tier: "GOLD SPONSORS",
    sponsors: [
      { name: "AICL", logo: "/sponsors/aicl.webp" },
      { name: "Patron Luxury Apartment", logo: "/sponsors/patron.webp" },
    ],
  },
  {
    tier: "RAFFLE DRAW SPONSOR",
    sponsors: [
      { name: "Gadget Cartel", logo: "/sponsors/gadget-cartel.webp" },
      { name: "Glass Finance Ltd", logo: "/sponsors/glass.webp" },
    ],
  },
  {
    tier: "INDUSTRY VISIT HOSTS",
    sponsors: [
      { name: "Paystack", logo: "/sponsors/paystack.png" },
      { name: "Digital Encode Limited", logo: "/sponsors/digital-encode.jpg" },
      { name: "Rise", logo: "/sponsors/risevest.jpg" },
      { name: "Nithub", logo: "/sponsors/nithub.jpg" },
      { name: "Cubbes", logo: "/sponsors/cubbes.png" },
    ],
  },
  {
    tier: "HOSPITALITY SPONSORS",
    sponsors: [
      { name: "His Grace", logo: "/sponsors/his-grace.webp" },
      { name: "Eben Nuts", logo: "/sponsors/eben-nuts.png" },
      { name: "Waffledom", logo: "/sponsors/waffledom.jpg" },
    ],
  },
  {
    tier: "CAREER FAIR PARTNERS",
    sponsors: [
      { name: "Stanbic IBTC", logo: "/sponsors/stanbic-ibtc.png" },
      { name: "GTB", logo: "/sponsors/gtbank.png" },
    ],
  },
  {
    tier: "STUDENT SPONSORS",
    sponsors: [
      { name: "Postra", logo: "/sponsors/postra.webp" },
      { name: "Jules Luxury", logo: "/sponsors/jules-luxury.webp" },
    ],
  },
  {
    tier: "MEDIA PARTNERS",
    sponsors: [
      { name: "Rahkindstudios", logo: "/sponsors/rahmon.webp" },
      { name: "Sorethegrapher", logo: "/sponsors/sorefunmi.webp" },
    ],
  },
  {
    tier: "ASSOCIATE COMMUNITIES",
    sponsors: [
      { name: "GDG on Campus Caleb", logo: "/sponsors/gdg-caleb.jpg" },
      { name: "GDG on Campus OOU", logo: "/sponsors/gdg-oou.jpg" },
      { name: "GDG on Campus Lautech", logo: "/sponsors/gdg-lautech.webp" },
      { name: "GDG on Campus UI", logo: "/sponsors/gdg-ui.jpg" },
    ],
  },
];

// Special thanks arc (build5 §6.6) — the two advisors, then the MVPs, then
// the design special force. Owner-declared 2026-07-19.
export const ADVISORS = [
  { name: "Emmanuel Oladosu", role: "ALUMNI SPONSOR", photo: "/people/emmanuel-oladosu.webp" },
  { name: "Dr. Ernest Onuiri", role: "CAMPUS ADVISOR", photo: "/people/dr-ernest.jpg" }, // TBD-owner: real headshot pending, initials render until then
] as const;

// Owner-declared, 2026-07-19. Photos resolve from the existing PEOPLE
// roster by name — do not re-add these people to PEOPLE.
export const MVPS = {
  core: [
    { name: "Lawal Sharon", photo: "/people/sharon-lawal.jpg" },
    { name: "Habeeb Muhammed", photo: "/people/habeeb-abayomi.jpg" },
    { name: "Victor Ibironke", photo: "/people/victor-ibironke.jpg" },
    { name: "Efegherimoni Oghenetejiri", photo: "/people/efegherimoni-oghenetejiri.jpeg" },
  ],
  media: [
    { name: "Olamide Fatunase", photo: "/people/olamide-fatunase.jpeg" },
    { name: "Oyebajo Olaimide", photo: "/people/oyebajo-olaimide.jpg" },
    { name: "Agunbiade Ayomide Obanijesu", photo: "/people/agunbiade-ayomide-obanijesu.jpeg" },
    { name: "Umaru Victor Oshioke", photo: "/people/umaru-victor-oshioke.jpeg" },
  ],
  track: "DATA & AI",
} as const;

// The design special force behind the products (owner-declared). Photos
// TBD-owner except Xavier's and Daddy D's (already in /public/people —
// "Daddy D the Designer" is Oluwadayomisi Osisanya, the Design & Mgmt Track
// Lead already in PEOPLE; reuse his existing photo path here rather than
// re-adding him to PEOPLE — this is a second, nickname appearance).
export const SPECIAL_FORCE = [
  { name: "Alli Akinpelu", photo: null },
  { name: "Bassey Saviour", photo: null },
  { name: "Okpalannajiaku Xavier", photo: "/people/xavier-okpalannajiaku.png" },
  { name: "Deborah Onabanjo", photo: null },
  { name: "Daddy D the Designer", photo: "/people/oluwadayomisi-osisanya.jpg" },
] as const;

export const ASSET_MANIFEST: Partial<Record<StoryId, string[]>> = {
  moments: MOMENTS.flatMap((m) => m.images),
  people: [
    ...PEOPLE.map((p) => p.photo).filter((p): p is string => Boolean(p)),
    ...SPONSOR_WALL.flatMap((tier) => tier.sponsors.map((s) => s.logo)),
    ...ADVISORS.map((a) => a.photo),
  ],
};
