/**
 * Builds lib/content/chapter.ts's PEOPLE array from the team CSV (§14.3).
 * Run with: npx tsx scripts/generate-people.ts
 * Prints a formatted PEOPLE array to stdout — paste it into chapter.ts by
 * hand (the app reads literal data, never parses the CSV at runtime).
 * Also copies + compresses matching headshots into public/people/.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CSV_PATH =
  "/home/user/GDGWebsite/public/2025_2026 Website Data Form (Responses) - Form Responses 1.csv";
const TEAM_PHOTOS_DIR = "/home/user/GDGWebsite/public/team";
const OUT_PEOPLE_DIR = path.join(process.cwd(), "public", "people");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore
      } else field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const SECTION_ORDER = ["CORE", "TRACKS", "DEV", "MEDIA", "EVENTS"] as const;
type Section = (typeof SECTION_ORDER)[number];

function mapTeamToSection(team: string): Section | null {
  const t = team.trim().toLowerCase();
  if (t === "core") return "CORE";
  if (t === "tracks") return "TRACKS";
  if (t.startsWith("develop")) return "DEV"; // covers the "Developement" typo in the form
  if (t.startsWith("media")) return "MEDIA";
  if (t.startsWith("events")) return "EVENTS";
  return null;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

const ACRONYMS = ["Ai", "Gdg", "Ui", "Ux", "Qa"];

function titleCase(s: string): string {
  const cased = s
    .trim()
    .replace(/,/g, "") // a few respondents entered "Last, First" — drop the stray comma
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  // Normalize common org acronyms that naive title-casing lowercases (Ai -> AI).
  return ACRONYMS.reduce(
    (acc, a) => acc.replace(new RegExp(`\\b${a}\\b`, "g"), a.toUpperCase()),
    cased
  );
}

function findAllPhotoFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findAllPhotoFiles(full));
    else if (/\.(jpe?g|png)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function findPhotoFor(fullName: string, allPhotos: string[]): string | null {
  const nameSlug = slugify(fullName);
  const nameTokens = nameSlug.split("-").filter(Boolean);
  let best: string | null = null;
  let bestScore = 0;
  for (const photoPath of allPhotos) {
    const base = path.basename(photoPath).replace(/\.(jpe?g|png)$/i, "");
    const baseSlug = slugify(base);
    // Score = how many of the person's name tokens appear in the filename.
    const score = nameTokens.filter((t) => baseSlug.includes(t)).length;
    if (score > bestScore && score >= Math.min(2, nameTokens.length)) {
      bestScore = score;
      best = photoPath;
    }
  }
  return best;
}

async function copyAndCompress(srcPath: string, destSlug: string): Promise<string> {
  fs.mkdirSync(OUT_PEOPLE_DIR, { recursive: true });
  const destPath = path.join(OUT_PEOPLE_DIR, `${destSlug}.jpg`);
  await sharp(srcPath)
    .resize(400, 400, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toFile(destPath);
  return `/people/${destSlug}.jpg`;
}

interface PersonRow {
  name: string;
  role: string;
  section: Section;
  position: string;
}

async function main() {
  const csv = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csv);
  const header = rows[0]!;
  const idx = (col: string) => header.indexOf(col);
  const nameIdx = idx("Full name");
  const roleIdx = idx("Role/title");
  const teamIdx = idx("Team");
  const positionIdx = idx("Position (Lead/Co-Lead/Member)");
  const consentIdx = idx("Consent to display");

  const people: PersonRow[] = [];
  const seenNames = new Set<string>(); // drops duplicate form submissions
  for (const r of rows.slice(1)) {
    if (!r[nameIdx]?.trim()) continue;
    const consent = (r[consentIdx] ?? "").trim().toLowerCase();
    if (consent !== "i do" && consent !== "yes") continue; // §14.3 rule 1

    const section = mapTeamToSection(r[teamIdx] ?? "");
    if (!section) continue;

    const name = titleCase(r[nameIdx]!);
    const dedupeKey = `${section}:${slugify(name)}`;
    if (seenNames.has(dedupeKey)) continue;
    seenNames.add(dedupeKey);

    people.push({
      name,
      role: titleCase(r[roleIdx] ?? ""),
      section,
      position: (r[positionIdx] ?? "").trim().toLowerCase(),
    });
  }

  // Rule 3: leads/co-leads first, then alphabetical, within each section.
  people.sort((a, b) => {
    const aLead = a.position.includes("lead") ? 0 : 1;
    const bLead = b.position.includes("lead") ? 0 : 1;
    if (aLead !== bLead) return aLead - bLead;
    return a.name.localeCompare(b.name);
  });
  people.sort(
    (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
  );

  const allPhotos = findAllPhotoFiles(TEAM_PHOTOS_DIR);
  const output: { name: string; role: string; section: Section; photo: string | null }[] = [];

  for (const p of people) {
    const slug = slugify(p.name);
    const srcPhoto = findPhotoFor(p.name, allPhotos);
    let photo: string | null = null;
    if (srcPhoto) {
      try {
        photo = await copyAndCompress(srcPhoto, slug);
      } catch (err) {
        console.error(`Failed to process photo for ${p.name}:`, err);
      }
    }
    output.push({ name: p.name, role: p.role, section: p.section, photo });
  }

  console.log(`\n// Generated by scripts/generate-people.ts — ${output.length} people, ${output.filter((o) => o.photo).length} with photos.\n`);
  console.log("export const PEOPLE: Person[] = [");
  for (const o of output) {
    console.log(
      `  { name: ${JSON.stringify(o.name)}, role: ${JSON.stringify(o.role)}, section: ${JSON.stringify(o.section)}, photo: ${o.photo ? JSON.stringify(o.photo) : "null"} },`
    );
  }
  console.log("];");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
