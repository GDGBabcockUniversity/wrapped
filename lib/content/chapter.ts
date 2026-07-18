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

export interface Person {
  name: string;
  role: string;
  section: "CORE" | "SOFTWARE" | "DATA" | "INFRASTRUCTURE" | "DESIGN" | "MEDIA" | "EVENTS" | "SPONSORS" | "SPECIAL_THANKS";
  photo: string | null;
}

export const PEOPLE: Person[] = [
  { name: "Chukwuneku Akpotohwo", role: "Organizer", section: "CORE", photo: null },
  { name: "Sophia Osariemen Odiase", role: "Co-Organizer", section: "CORE", photo: "/people/sophia-osariemen-odiase.jpg" },
  { name: "Habeeb Muhammed", role: "Community Manager", section: "CORE", photo: null },
  { name: "SHAIBU, Omobolanle Oluwademiladeogo", role: "Community Manager", section: "CORE", photo: "/people/shaibu-omobolanle-oluwademiladeogo.jpg" },
  { name: "Victor Ibironke", role: "Technical Lead (Development)", section: "CORE", photo: "/people/umaru-victor-oshioke.jpg" },
  { name: "Favour Oluwatunmibi", role: "Technical Lead (Tracks)", section: "CORE", photo: "/people/favour-oluwatunmibi.jpg" },
  { name: "Lawal Sharon", role: "Operations Lead", section: "CORE", photo: "/people/lawal-sharon.jpg" },
  { name: "Braimah Olatilewa Eyituoyo Brymar", role: "Operations Lead", section: "CORE", photo: "/people/braimah-olatilewa-eyituoyo-brymar.jpg" },
  { name: "Efegherimoni Oghenetejiri", role: "Media & Marketing Lead", section: "CORE", photo: "/people/efegherimoni-oghenetejiri.jpg" },
  { name: "Azubuike Chimamanda Favour", role: "Media and Marketing Co-Lead", section: "CORE", photo: "/people/azubuike-chimamanda-favour.jpg" },
  { name: "Alabi Reuben", role: "Software Development Track Lead", section: "SOFTWARE", photo: "/people/alabi-reuben.jpg" },
  { name: "Oluwafemi Temitope Olatunji", role: "Mobile specialist", section: "SOFTWARE", photo: "/people/oluwafemi-temitope-olatunji.jpg" },
  { name: "Daniel Bolujo", role: "Quality Assurance Specialist", section: "SOFTWARE", photo: "/people/daniel-alexander-odulate.jpg" },
  { name: "Chidoziem Offor", role: "Data Science and Algorithms Specialist", section: "DATA", photo: null },
  { name: "Providence Oduok", role: "Front End Web Specialist", section: "SOFTWARE", photo: null },
  { name: "Balogun Eniola", role: "Core Team Member", section: "SOFTWARE", photo: "/people/balogun-eniola.jpg" },
  { name: "Daniel Alexander Odulate", role: "Core Team Member", section: "SOFTWARE", photo: "/people/daniel-alexander-odulate.jpg" },
  { name: "Eromoigbe Agbonikpeya", role: "Core Team Member", section: "SOFTWARE", photo: "/people/eromoigbe-agbonikpeya.jpg" },
  { name: "Timilehin Adedayo", role: "Data and AI Track lead || Machine Learnimg Specialist", section: "DATA", photo: "/people/timilehin-adedayo.jpg" },
  { name: "Ifeoma Ezeka", role: "Data engineering specialist", section: "DATA", photo: "/people/ifeoma-ezeka.jpg" },
  { name: "Ajagbe Olaoluwa", role: "Data Analytics Specialist", section: "DATA", photo: "/people/ajagbe-olaoluwa.jpg" },
  { name: "David Obalabi", role: "Data Science Specialist", section: "DATA", photo: "/people/nelson-nwanoneze-david.jpg" },
  { name: "Okon Onono Ene", role: "Core Team Member", section: "DATA", photo: "/people/okon-onono-ene.jpg" },
  { name: "Oluwatomilola Arogundade", role: "Cybersecurity Specialist", section: "INFRASTRUCTURE", photo: "/people/oluwatomilola-arogundade.jpg" },
  { name: "Otelaja Oluwajuwonlo Okikiola", role: "Networking specialist", section: "INFRASTRUCTURE", photo: null },
  { name: "Emmanuel Ekundayo", role: "Cloud Specialist", section: "INFRASTRUCTURE", photo: "/people/emmanuel-ekundayo.jpg" },
  { name: "Praise Akenroye", role: "Core Team Member", section: "INFRASTRUCTURE", photo: "/people/praise-akenroye.jpg" },
  { name: "Oluwadayomisi Osisanya", role: "Design & Management Lead || Product Design Specialist", section: "DESIGN", photo: null },
  { name: "Adedoja Daniel Ademola", role: "Product Management Specialist", section: "DESIGN", photo: "/people/adedoja-daniel-ademola.jpg" },
  { name: "Boluwatife Dada", role: "Games & Interactive Media Specialist", section: "DESIGN", photo: null },
  { name: "Ademola Ademeso", role: "Lead", section: "SOFTWARE", photo: "/people/ademola-ademeso.jpg" },
  { name: "Olugbesan Ayooluwakiitan Oluwatamilore", role: "Lead", section: "SOFTWARE", photo: "/people/olugbesan-ayooluwakiitan-oluwatamilore.jpg" },
  { name: "Divine Athora", role: "Member", section: "DESIGN", photo: "/people/divine-athora.jpg" },
  { name: "Olubowale Oluwatunmininu Temitope", role: "Member", section: "SOFTWARE", photo: "/people/olubowale-oluwatunmininu-temitope.jpg" },
  { name: "Onyelukachukwu M. O. Obata", role: "Member", section: "SOFTWARE", photo: "/people/onyelukachukwu-m-o-obata.jpg" },
  { name: "Uchenna Akubuiro", role: "Lead", section: "MEDIA", photo: null },
  { name: "Ojekemi Ayotomiwa", role: "Member", section: "MEDIA", photo: "/people/ojekemi-ayotomiwa.jpg" },
  { name: "Bisong Best Ebu-Obasi", role: "Member", section: "MEDIA", photo: "/people/bisong-best-ebu-obasi.jpg" },
  { name: "Nafarnda Marilyn", role: "Member", section: "MEDIA", photo: "/people/nafarnda-marilyn.jpg" },
  { name: "Umaru Victor Oshioke", role: "Lead", section: "MEDIA", photo: "/people/umaru-victor-oshioke.jpg" },
  { name: "Olamide Fatunase", role: "Member", section: "MEDIA", photo: "/people/olamide-fatunase.jpg" },
  { name: "Xavier Okpalannajiaku", role: "Member", section: "MEDIA", photo: null },
  { name: "Oyebajo Olaimide", role: "Lead", section: "MEDIA", photo: "/people/oyebajo-olaimide.jpg" },
  { name: "Mokwunye Ogochukwu Asha", role: "Member", section: "MEDIA", photo: "/people/mokwunye-ogochukwu-asha.jpg" },
  { name: "Itamah Osedebame Ehigie", role: "Lead", section: "MEDIA", photo: "/people/itamah-osedebame-ehigie.jpg" },
  { name: "Agunbiade Ayomide Obanijesu", role: "Member", section: "MEDIA", photo: "/people/agunbiade-ayomide-obanijesu.jpg" },
  { name: "Adeniran Oluwatamilore Janella", role: "Member", section: "MEDIA", photo: "/people/adeniran-oluwatamilore-janella.jpg" },
  { name: "Harrison Tifeoluwanimi Dorcas", role: "Member", section: "MEDIA", photo: "/people/harrison-tifeoluwanimi-dorcas.jpg" },
  { name: "Ebosetaleh Andrea Andrew", role: "Member", section: "MEDIA", photo: "/people/ebosetaleh-andrea-andrew.jpg" },
  { name: "Adefila Olutayo Esther", role: "Member", section: "MEDIA", photo: "/people/adefila-olutayo-esther.jpg" },
  { name: "Wosu-Ezi Kamdirichukwu Blossom", role: "Member", section: "MEDIA", photo: "/people/wosu-ezi-kamdirichukwu-blossom.jpg" },
  { name: "Atolagbe Precious Olawole", role: "Member", section: "EVENTS", photo: "/people/atolagbe-precious-olawole.jpg" },
  { name: "Oseni David", role: "Member", section: "EVENTS", photo: "/people/oseni-david.jpg" },
  { name: "NELSON-NWANONEZE DAVID", role: "Member", section: "EVENTS", photo: "/people/nelson-nwanoneze-david.jpg" },
  { name: "NELSON-NWANONEZE SAMUEL", role: "Member", section: "EVENTS", photo: "/people/nelson-nwanoneze-samuel.jpg" },
  { name: "Alabo Treasure Sowari", role: "Member", section: "EVENTS", photo: "/people/alabo-treasure-sowari.jpg" },
  { name: "Oba odumeru", role: "Member", section: "EVENTS", photo: "/people/oba-odumeru.jpg" },
  { name: "Akande Kehinde Gladys", role: "Member", section: "EVENTS", photo: "/people/akande-kehinde-gladys.jpg" },
  { name: "Akanni Temitope", role: "Member", section: "EVENTS", photo: "/people/akanni-temitope.jpg" },
  { name: "Iretomiwa Akande", role: "Member", section: "EVENTS", photo: "/people/iretomiwa-akande.jpg" },
  { name: "Offiong Ryan", role: "Member", section: "EVENTS", photo: null },
  { name: "Partner 1", role: "Sponsor", section: "SPONSORS", photo: "/people/partner-1.jpg" },
  { name: "Partner 2", role: "Sponsor", section: "SPONSORS", photo: "/people/partner-2.jpg" },
  { name: "Dr. Ernest", role: "", section: "SPECIAL_THANKS", photo: "/people/dr-ernest.jpg" },
  { name: "Emmanuel Oladosu", role: "", section: "SPECIAL_THANKS", photo: "/people/emmanuel-oladosu.jpg" }
];

export const ASSET_MANIFEST: Partial<Record<StoryId, string[]>> = {
  moments: MOMENTS.flatMap((m) => m.images),
  people: PEOPLE.map((p) => p.photo).filter((p): p is string => Boolean(p)),
};
