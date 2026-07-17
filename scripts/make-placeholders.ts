/**
 * Generates flat placeholder JPGs for moments without real photography yet
 * (§14.1). Run with: npx tsx scripts/make-placeholders.ts
 * Replace the output files with real photos as they land — no code changes
 * needed, since the layout doesn't depend on real photo dimensions.
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const CREAM_DEEP = { r: 0xf8, g: 0xec, b: 0xc9 };
const INK = "#0f0f0f";
const WIDTH = 900;
const HEIGHT = 1200;

const PLACEHOLDERS: { dir: string; file: string; title: string }[] = [
  { dir: "devfest", file: "01.jpg", title: "DEVFEST" },
  { dir: "devfest", file: "02.jpg", title: "DEVFEST" },
  { dir: "games", file: "01.jpg", title: "GAME NIGHTS" },
  { dir: "games", file: "02.jpg", title: "GAME NIGHTS" },
  { dir: "spaces", file: "01.jpg", title: "TWITTER SPACES" },
];

async function main() {
  for (const p of PLACEHOLDERS) {
    const svg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgb(${CREAM_DEEP.r},${CREAM_DEEP.g},${CREAM_DEEP.b})" />
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="sans-serif" font-weight="700" font-size="44"
              letter-spacing="6" fill="${INK}" opacity="0.4">
          ${p.title}
        </text>
      </svg>`;

    const outDir = path.join(process.cwd(), "public", "moments", p.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, p.file);

    await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(outPath);
    console.log(`wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
