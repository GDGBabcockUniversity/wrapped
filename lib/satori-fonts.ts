import fs from "node:fs";
import path from "node:path";

// Reading at module scope (not inside the request handler) means a missing
// font file fails the build/boot immediately, not on the first request.
const fontsDir = path.join(process.cwd(), "assets/fonts");

export const googleSansBold = fs.readFileSync(path.join(fontsDir, "GoogleSans-Bold.ttf"));
export const googleSansMedium = fs.readFileSync(path.join(fontsDir, "GoogleSans-Medium.ttf"));
// SPEC-GAP: Bricolage Grotesque ships no italic axis or instance upstream —
// card layouts fake the slant with a CSS skew transform on this regular weight.
export const bricolageMedium = fs.readFileSync(
  path.join(fontsDir, "BricolageGrotesque-Medium.ttf")
);

export const SATORI_FONTS = [
  { name: "Google Sans", data: googleSansBold, weight: 700 as const, style: "normal" as const },
  { name: "Google Sans", data: googleSansMedium, weight: 500 as const, style: "normal" as const },
  { name: "Bricolage", data: bricolageMedium, weight: 500 as const, style: "normal" as const },
];
