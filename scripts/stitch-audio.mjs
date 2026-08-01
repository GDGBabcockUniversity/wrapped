/**
 * Builds the one stitched soundtrack the deck plays (build spec §8.4).
 *
 *   npm run stitch-audio
 *
 * One file, not five. Mobile Safari unlocks the audio context on a single user
 * gesture, and elements loaded later can silently fail even after the first
 * one worked — a "Tap for sound" fallback that fires at all is the symptom.
 * One file also removes the buffering gap between movements, which on campus
 * mobile data is audible.
 *
 * The segment list comes from lib/deck.ts, so the audio and the running order
 * cannot drift apart: change a beat's bar count and re-running this produces a
 * file that still matches.
 *
 * Requires ffmpeg. Writes public/audio/wrapped.mp3 and the cue sheet beside it.
 */
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, statSync } from "fs";
import { tmpdir } from "os";
import path from "path";
// lib/deck.ts is TypeScript with a "@/" alias, so this runs under tsx (see
// the npm script). Importing the deck rather than restating the running order
// here is the point: the audio and the order cannot drift apart.
const { MOVEMENT_AUDIO, MOVEMENTS, timeline, movementSpans, runtimeSec, violations } =
  await import("../lib/deck.ts");
const { TRACKS } = await import("../lib/tempo.ts");

const OUT_DIR = path.join(process.cwd(), "public/audio");
const OUT_MP3 = path.join(OUT_DIR, "wrapped.mp3");
const OUT_CUES = path.join(OUT_DIR, "wrapped.cues.json");
const CROSSFADE = 0.9; // seconds; long enough to hide a section change

function ffmpeg(args) {
  return execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8",
  });
}

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("stitch-audio needs ffmpeg on PATH.");
  process.exit(1);
}

const problems = violations();
if (problems.length) {
  console.error("the running order breaks its own rules; fix lib/deck.ts first:");
  problems.forEach((p) => console.error("  ! " + p));
  process.exit(1);
}

// ---- one segment per movement, long enough to cover its beats -------------

const spans = movementSpans();
const segments = [];
for (const [movement, span] of spans) {
  const audio = MOVEMENT_AUDIO[movement];
  const track = TRACKS[audio.track];
  const src = path.join(process.cwd(), "public", track.src.replace(/^\//, ""));
  if (!existsSync(src)) {
    console.error(`missing track for movement ${movement}: ${src}`);
    process.exit(1);
  }
  // Each movement is trimmed from its own start point, with a tail for the
  // crossfade into the next one.
  const needed = span.toSec - span.fromSec + CROSSFADE;
  if (audio.fromSec + needed > track.durationSec) {
    console.error(
      `movement ${movement} wants ${needed.toFixed(1)}s from ${audio.track} at ` +
        `${audio.fromSec}s, but the track is only ${track.durationSec.toFixed(1)}s`
    );
    process.exit(1);
  }
  segments.push({ movement, src, from: audio.fromSec, duration: needed, standIn: audio.standIn });
}

const tmp = mkdtempSync(path.join(tmpdir(), "wrapped-stitch-"));
try {
  // ---- cut each movement to a clean wav ----------------------------------
  const parts = [];
  for (const [i, s] of segments.entries()) {
    const out = path.join(tmp, `${i}-${s.movement}.wav`);
    ffmpeg([
      "-ss", String(s.from),
      "-t", String(s.duration),
      "-i", s.src,
      "-ac", "2", "-ar", "44100",
      // A cut lands mid-waveform, so both ends get a short ramp. Without it
      // every movement change starts and ends on a click.
      "-af", `afade=t=in:st=0:d=0.05,afade=t=out:st=${(s.duration - 0.05).toFixed(3)}:d=0.05`,
      out,
    ]);
    parts.push(out);
    console.log(
      `  cut  ${s.movement.padEnd(12)} ${s.from.toFixed(2)}s +${s.duration.toFixed(2)}s` +
        (s.standIn ? "   [stand-in]" : "")
    );
  }

  // ---- crossfade them into one continuous track --------------------------
  // acrossfade takes two inputs at a time, so this folds left to right.
  let current = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const out = path.join(tmp, `mix-${i}.wav`);
    ffmpeg([
      "-i", current,
      "-i", parts[i],
      "-filter_complex", `[0][1]acrossfade=d=${CROSSFADE}:c1=tri:c2=tri[a]`,
      "-map", "[a]",
      out,
    ]);
    current = out;
  }

  // 112k VBR-ish, not 160k. This file is fetched once over campus mobile
  // data before anything can play, and 4.8MB of it is a long time to wait on
  // LTE — long enough that the element stalls mid-deck. The deck now survives
  // a stall, but not stalling is better than recovering from one, and nobody
  // is listening to a Wrapped on studio monitors.
  ffmpeg(["-i", current, "-codec:a", "libmp3lame", "-b:a", "112k", OUT_MP3]);

  // ---- the cue sheet the player reads ------------------------------------
  const beats = timeline().map((b) => ({
    id: b.id,
    shape: b.shape,
    movement: b.movement,
    audience: b.audience,
    bars: b.bars,
    atSec: +b.atSec.toFixed(4),
    durationSec: +b.durationSec.toFixed(4),
    interactive: !!b.interactive,
    optional: !!b.optional,
  }));
  const cues = {
    // Regenerate rather than edit: every number here is derived.
    generatedBy: "npm run stitch-audio",
    src: "/audio/wrapped.mp3",
    runtimeSec: +runtimeSec().toFixed(3),
    crossfadeSec: CROSSFADE,
    movements: [...spans].map(([movement, span]) => ({
      id: movement,
      numeral: MOVEMENTS[movement].numeral,
      fromSec: +span.fromSec.toFixed(4),
      toSec: +span.toSec.toFixed(4),
      track: MOVEMENT_AUDIO[movement].track,
      standIn: MOVEMENT_AUDIO[movement].standIn,
    })),
    beats,
  };
  writeFileSync(OUT_CUES, JSON.stringify(cues, null, 2) + "\n");

  const probe = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", OUT_MP3],
    { encoding: "utf8" }
  ).trim();

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  console.log(`\n  wrote ${OUT_MP3}`);
  console.log(`        ${(statSync(OUT_MP3).size / 1e6).toFixed(2)} MB  ${mmss(+probe)}`);
  console.log(`  wrote ${OUT_CUES}  (${beats.length} beats)`);
  console.log(`\n  deck runtime ${mmss(cues.runtimeSec)}  ·  audio ${mmss(+probe)}`);
  const standIns = cues.movements.filter((m) => m.standIn).map((m) => m.id);
  if (standIns.length) console.log(`  stand-in movements: ${standIns.join(", ")}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
