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
  section: "CORE" | "TRACKS" | "DEV" | "MEDIA" | "EVENTS" | "SPONSORS" | "SPECIAL_THANKS";
  subsection?: string;
  photo: string | null;
}

// SECTIONS order is fixed: CORE, TRACKS, DEV, MEDIA, EVENTS, SPONSORS, SPECIAL_THANKS
export const PEOPLE: Person[] = [
  { name: "Azubuike Chimamanda Favour", role: "Media And Marketing Co-lead", section: "CORE", photo: "/people/azubuike-chimamanda-favour.jpg" },
  { name: "Braimah Olatilewa Eyituoyo Brymar", role: "Operations Lead", section: "CORE", photo: "/people/braimah-olatilewa-eyituoyo-brymar.jpg" },
  { name: "Efegherimoni Oghenetejiri", role: "Media & Marketing Lead", section: "CORE", photo: "/people/efegherimoni-oghenetejiri.jpg" },
  { name: "Favour Oluwatunmibi", role: "Technical Lead", section: "CORE", photo: "/people/favour-oluwatunmibi.jpg" },
  { name: "Shaibu Omobolanle Oluwademiladeogo", role: "Community Manager", section: "CORE", photo: "/people/shaibu-omobolanle-oluwademiladeogo.jpg" },
  { name: "Sophia Osariemen Odiase", role: "Co-organizer", section: "CORE", photo: "/people/sophia-osariemen-odiase.jpg" },
  
  { name: "Ajagbe Olaoluwa", role: "Data Analytics Specialist", section: "TRACKS", subsection: "Data", photo: "/people/ajagbe-olaoluwa.jpg" },
  { name: "Alabi Reuben", role: "Software Development Track Lead", section: "TRACKS", subsection: "Software", photo: "/people/alabi-reuben.jpg" },
  { name: "Daniel Alexander Odulate", role: "Technical Co-lead (tracks)", section: "TRACKS", subsection: "Software", photo: "/people/daniel-alexander-odulate.jpg" },
  { name: "Eromoigbe Agbonikpeya", role: "Technical Lead (development)", section: "TRACKS", subsection: "Software", photo: "/people/eromoigbe-agbonikpeya.jpg" },
  { name: "Ifeoma Ezeka", role: "Data Engineering Specialist", section: "TRACKS", subsection: "Data", photo: "/people/ifeoma-ezeka.jpg" },
  { name: "Lawal Sharon", role: "Operations Lead", section: "TRACKS", photo: "/people/lawal-sharon.jpg" },
  { name: "Oluwatomilola Arogundade", role: "Cybersecurity Specialist", section: "TRACKS", subsection: "Infrastructure", photo: "/people/oluwatomilola-arogundade.jpg" },
  { name: "Otelaja Oluwajuwonlo Okikiola", role: "Networking Specialist", section: "TRACKS", subsection: "Infrastructure", photo: null },
  { name: "Timilehin Adedayo", role: "Data And AI Track Lead || Machine Learnimg Specialist", section: "TRACKS", subsection: "Data", photo: "/people/timilehin-adedayo.jpg" },
  { name: "Adedoja Daniel Ademola", role: "Product Management Specialist", section: "TRACKS", subsection: "Product Management", photo: "/people/adedoja-daniel-ademola.jpg" },
  { name: "Bolujo Daniel", role: "Quality Assurance Specialist", section: "TRACKS", subsection: "Software", photo: "/people/bolujo-daniel.jpg" },
  { name: "Emmanuel Ekundayo", role: "Cloud Specialist", section: "TRACKS", subsection: "Infrastructure", photo: "/people/emmanuel-ekundayo.jpg" },
  { name: "Okon Onono Ene", role: "Data & AI Core Team Member & Data Scientist", section: "TRACKS", subsection: "Data", photo: "/people/okon-onono-ene.jpg" },
  { name: "Oluwafemi Temitope Olatunji", role: "Mobile Specialist", section: "TRACKS", subsection: "Software", photo: "/people/oluwafemi-temitope-olatunji.jpg" },
  { name: "Praise Akenroye", role: "GDG Infrastructure And Security Core Team", section: "TRACKS", subsection: "Infrastructure", photo: "/people/praise-akenroye.jpg" },
  
  { name: "Ademola Ademeso", role: "Lead Frontend Developer", section: "DEV", subsection: "Frontend", photo: "/people/ademola-ademeso.jpg" },
  { name: "Divine Athora", role: "Lead Product Design (dev Team)", section: "DEV", subsection: "Product Design", photo: "/people/divine-athora.jpg" },
  { name: "Olugbesan Ayooluwakiitan Oluwatamilore", role: "Lead Backend Developer", section: "DEV", subsection: "Backend", photo: "/people/olugbesan-ayooluwakiitan-oluwatamilore.jpg" },
  { name: "Akanni Temitope", role: "Data & AI Manager", section: "DEV", subsection: "Data & AI", photo: "/people/akanni-temitope.jpg" },
  { name: "Balogun Eniola", role: "Mobile Development And Front End Pretty Much The Same In A Way", section: "DEV", subsection: "Frontend", photo: "/people/balogun-eniola.jpg" },
  { name: "Daniel Fagbohunlu", role: "GDG Developer", section: "DEV", subsection: "Backend", photo: null },
  { name: "Olubowale Oluwatunmininu Temitope", role: "Dev Team Member Orbit Organizer", section: "DEV", subsection: "Backend", photo: "/people/olubowale-oluwatunmininu-temitope.jpg" },
  { name: "Onyelukachukwu M. O. Obata", role: "Kachi", section: "DEV", subsection: "Frontend", photo: "/people/onyelukachukwu-m-o-obata.jpg" },
  
  { name: "Agunbiade Ayomide Obanijesu", role: "Media Lead", section: "MEDIA", photo: "/people/agunbiade-ayomide-obanijesu.jpg" },
  { name: "Itamah Osedebame Ehigie", role: "Technical Writing Team Lead (radar)", section: "MEDIA", subsection: "Radar", photo: "/people/itamah-osedebame-ehigie.jpg" },
  { name: "Oghojafor Oghenemaro Esther.o", role: "Media Co-lead", section: "MEDIA", photo: null },
  { name: "Umaru Victor Oshioke", role: "Graphics Design Lead", section: "MEDIA", subsection: "Graphic Designers", photo: "/people/umaru-victor-oshioke.jpg" },
  { name: "Adefila Olutayo Esther", role: "Technical Writer", section: "MEDIA", subsection: "Radar", photo: "/people/adefila-olutayo-esther.jpg" },
  { name: "Adeniran Oluwatamilore Janella", role: "Technical Writer", section: "MEDIA", subsection: "Radar", photo: "/people/adeniran-oluwatamilore-janella.jpg" },
  { name: "Bisong Best Ebu-obasi", role: "Marketing Team Member", section: "MEDIA", subsection: "Content Creators", photo: "/people/bisong-best-ebu-obasi.jpg" },
  { name: "Ebosetaleh Andrea Andrew", role: "Technical Writer", section: "MEDIA", subsection: "Radar", photo: "/people/ebosetaleh-andrea-andrew.jpg" },
  { name: "Harrison Tifeoluwanimi Dorcas", role: "Technical Writer", section: "MEDIA", subsection: "Radar", photo: "/people/harrison-tifeoluwanimi-dorcas.jpg" },
  { name: "Mokwunye Ogochukwu Asha", role: "Video Editor", section: "MEDIA", subsection: "Video Editors", photo: "/people/mokwunye-ogochukwu-asha.jpg" },
  { name: "Nafarnda Marilyn", role: "Content Creator", section: "MEDIA", subsection: "Content Creators", photo: "/people/nafarnda-marilyn.jpg" },
  { name: "Ojekemi Ayotomiwa", role: "Videographer", section: "MEDIA", subsection: "Photographers", photo: "/people/ojekemi-ayotomiwa.jpg" },
  { name: "Olamide Fatunase", role: "Member", section: "MEDIA", subsection: "Content Creators", photo: "/people/olamide-fatunase.jpg" },
  { name: "Oyebajo Olaimide", role: "Videographer/editor", section: "MEDIA", subsection: "Video Editors", photo: "/people/oyebajo-olaimide.jpg" },
  { name: "Wosu-ezi Kamdirichukwu Blossom", role: "Technical Writer", section: "MEDIA", subsection: "Radar", photo: "/people/wosu-ezi-kamdirichukwu-blossom.jpg" },
  
  { name: "Akande Kehinde Gladys", role: "Event Manager", section: "EVENTS", photo: "/people/akande-kehinde-gladys.jpg" },
  { name: "Alabo Treasure Sowari", role: "Team Member", section: "EVENTS", photo: "/people/alabo-treasure-sowari.jpg" },
  { name: "Atolagbe Precious Olawole", role: "Event Planning And Mangemant Team", section: "EVENTS", photo: "/people/atolagbe-precious-olawole.jpg" },
  { name: "Iretomiwa Akande", role: "Coordinator", section: "EVENTS", photo: "/people/iretomiwa-akande.jpg" },
  { name: "Nelson-nwanoneze David", role: "Event Coordinator", section: "EVENTS", photo: "/people/nelson-nwanoneze-david.jpg" },
  { name: "Nelson-nwanoneze Samuel", role: "Event Volunteer", section: "EVENTS", photo: "/people/nelson-nwanoneze-samuel.jpg" },
  { name: "Oba Odumeru", role: "Member", section: "EVENTS", photo: "/people/oba-odumeru.jpg" },
  { name: "Oseni David", role: "Events And Planning Team", section: "EVENTS", photo: "/people/oseni-david.jpg" },

  { name: "Partner 1", role: "Sponsor", section: "SPONSORS", photo: "/people/partner-1.jpg" },
  { name: "Partner 2", role: "Sponsor", section: "SPONSORS", photo: "/people/partner-2.jpg" },
  
  { name: "Dr. Ernest", role: "", section: "SPECIAL_THANKS", photo: "/people/dr-ernest.jpg" },
  { name: "Emmanuel Oladosu", role: "", section: "SPECIAL_THANKS", photo: "/people/emmanuel-oladosu.jpg" },
];

export const ASSET_MANIFEST: Partial<Record<StoryId, string[]>> = {
  moments: MOMENTS.flatMap((m) => m.images),
  people: PEOPLE.map((p) => p.photo).filter((p): p is string => Boolean(p)),
};
