/**
 * Measures the real tempo of every track in public/audio/tracks and prints the
 * constants for lib/tempo.ts.
 *
 *   npm run measure-tempo
 *
 * It exists because the published figures were wrong. MCBH's album metadata
 * says 117; the file says 114, and 117 is not a near miss but a different
 * grid. Anything that reads a BPM off a sleeve rather than out of the audio
 * will put every reveal in the deck next to the downbeat instead of on it.
 *
 * There is no mp3 decoder on the toolchain, so this drives the only one
 * available: the browser's. Playwright loads a page, Web Audio decodes to PCM,
 * and the analysis runs there.
 */
import { createServer } from "http";
import { readFileSync, readdirSync } from "fs";
import path from "path";

// Imported dynamically and deliberately NOT a dependency of this project.
// This runs once when a track changes; making every install carry a browser
// automation package for it would be the wrong trade.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "measure-tempo needs playwright:\n\n" +
      "  npm i --no-save playwright\n\n" +
      "It decodes the mp3s through the browser, because there is no mp3\n" +
      "decoder on the plain Node toolchain."
  );
  process.exit(1);
}

const EXE = process.env.CHROMIUM_PATH || undefined;
const DIR = path.join(process.cwd(), "public/audio/tracks");
const PORT = Number(process.env.PORT ?? 3301);
const BASE = `http://127.0.0.1:${PORT}`;

// Files have to be served rather than read from disk: decodeAudioData needs a
// real fetch, and a file:// page cannot make one.
const files = readdirSync(DIR).filter((f) => f.endsWith(".mp3")).sort();
if (files.length === 0) {
  console.error(`no .mp3 files in ${DIR}`);
  process.exit(1);
}
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.replace(/^\//, "").split("?")[0]);
  if (files.includes(name)) {
    const b = readFileSync(path.join(DIR, name));
    res.writeHead(200, { "content-type": "audio/mpeg", "content-length": b.length });
    return res.end(b);
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end("<!doctype html><title>tempo</title>");
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

// Everything below runs inside the page, because that is where the only mp3
// decoder in this environment lives (Web Audio's decodeAudioData). The
// analysis is spectral flux -> autocorrelation, which is the standard way to
// get tempo out of percussive music and is well within reach in plain JS.
const ANALYSIS = `
window.__env = {};
window.analyse = async function (url) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const sr = audio.sampleRate;

  // Downmix to mono.
  const n = audio.length;
  const mono = new Float32Array(n);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += ch[i] / audio.numberOfChannels;
  }

  // ---- spectral flux onset envelope -------------------------------------
  const N = 2048, HOP = 512;
  const frames = Math.floor((n - N) / HOP);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  // Iterative radix-2 FFT.
  const rev = new Uint32Array(N);
  for (let i = 0, j = 0; i < N; i++) {
    rev[i] = j;
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
  }
  const cos = new Float32Array(N / 2), sin = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    cos[i] = Math.cos((-2 * Math.PI * i) / N);
    sin[i] = Math.sin((-2 * Math.PI * i) / N);
  }
  const re = new Float32Array(N), im = new Float32Array(N);
  function fft() {
    for (let len = 2; len <= N; len <<= 1) {
      const step = N / len;
      for (let i = 0; i < N; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const c = cos[k * step], s = sin[k * step];
          const ar = re[i + k], ai = im[i + k];
          const br = re[i + k + len / 2], bi = im[i + k + len / 2];
          const tr = br * c - bi * s, ti = br * s + bi * c;
          re[i + k] = ar + tr; im[i + k] = ai + ti;
          re[i + k + len / 2] = ar - tr; im[i + k + len / 2] = ai - ti;
        }
      }
    }
  }

  const flux = new Float32Array(frames);
  let prev = new Float32Array(N / 2);
  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    for (let i = 0; i < N; i++) {
      re[rev[i]] = mono[off + i] * win[i];
      im[rev[i]] = 0;
    }
    fft();
    let sum = 0;
    const mag = new Float32Array(N / 2);
    for (let i = 0; i < N / 2; i++) {
      mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
      const d = mag[i] - prev[i];
      if (d > 0) sum += d;           // half-wave rectified: onsets only
    }
    flux[f] = sum;
    prev = mag;
  }

  // Subtract a local mean so a loud section does not outweigh a quiet one.
  const fps = sr / HOP;
  const W = Math.round(fps * 0.5);
  const env = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let a = 0, c = 0;
    for (let j = Math.max(0, i - W); j < Math.min(frames, i + W); j++) { a += flux[j]; c++; }
    env[i] = Math.max(0, flux[i] - a / c);
  }

  // ---- autocorrelation over plausible tempi -----------------------------
  function acfAt(lag) {
    let s = 0;
    for (let i = 0; i + lag < frames; i++) s += env[i] * env[i + lag];
    return s / (frames - lag);
  }
  const lagFor = (bpm) => (60 / bpm) * fps;
  const bpmFor = (lag) => (60 * fps) / lag;

  const curve = [];
  for (let bpm = 60; bpm <= 200; bpm += 0.05) curve.push([bpm, acfAt(lagFor(bpm))]);

  // A comb score sums the beat lag and its multiples, which suppresses the
  // half/double-tempo confusion a bare autocorrelation peak is prone to.
  function comb(bpm) {
    const l = lagFor(bpm);
    let s = 0;
    for (const k of [1, 2, 3, 4]) s += acfAt(Math.round(l * k)) / k;
    return s;
  }
  let best = null;
  for (let bpm = 70; bpm <= 180; bpm += 0.05) {
    const s = comb(bpm);
    if (!best || s > best.score) best = { bpm, score: s };
  }

  // Top raw ACF peaks, for reporting what else was in contention.
  const peaks = [];
  for (let i = 2; i < curve.length - 2; i++) {
    if (curve[i][1] > curve[i - 1][1] && curve[i][1] > curve[i + 1][1]) peaks.push(curve[i]);
  }
  peaks.sort((a, b) => b[1] - a[1]);

  // ---- phase: where the beat grid actually starts -----------------------
  const beatLag = lagFor(best.bpm);
  let bestPhase = { offset: 0, score: -1 };
  for (let p = 0; p < beatLag; p += 0.25) {
    let s = 0;
    for (let b = 0; ; b++) {
      const idx = Math.round(p + b * beatLag);
      if (idx >= frames) break;
      s += env[idx];
    }
    if (s > bestPhase.score) bestPhase = { offset: p, score: s };
  }

  window.__env[url] = { env, fps };

  return {
    duration: audio.duration,
    sampleRate: sr,
    fps,
    bpm: best.bpm,
    barSec: (60 / best.bpm) * 4,
    firstBeatSec: bestPhase.offset / fps,
    topPeaks: peaks.slice(0, 6).map(([b, v]) => ({ bpm: +b.toFixed(2), rel: +(v / peaks[0][1]).toFixed(3) })),
  };
};

/** How well a beat grid at this tempo lands on the track's real onsets, taken
    over every phase. This is what separates a true tempo from its shuffle and
    half/double relatives, which autocorrelation alone cannot do. */
window.gridFit = function (url, bpm) {
  const { env, fps } = window.__env[url];
  const frames = env.length;
  const beat = (60 / bpm) * fps;
  let best = { phase: 0, score: -1 };
  for (let p = 0; p < beat; p += 0.2) {
    let s = 0, c = 0;
    for (let b = 0; ; b++) {
      const idx = Math.round(p + b * beat);
      if (idx >= frames) break;
      s += env[idx]; c++;
    }
    if (c && s / c > best.score) best = { phase: p / fps, score: s / c };
  }
  return best;
};
`;

const b = await chromium.launch({
  ...(EXE ? { executablePath: EXE } : {}),
  args: ["--no-sandbox"],
});
const ctx = await b.newContext();
await ctx.addInitScript(ANALYSIS);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`${BASE}/`, { waitUntil: "load" });

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
const results = [];

for (const file of files) {
  const r = await page.evaluate((u) => window.analyse(u), `${BASE}/${file}`);
  const id = file.replace(/\.mp3$/, "");

  // The raw autocorrelation winner is not trustworthy on this material: a
  // shuffle makes 4/3 of the true tempo score highest (MCBH peaked at 151.45,
  // which is 114 x 4/3). Grid fit — how well a beat grid at a tempo lands on
  // the track's actual onsets — settles it, so every plausible relative of
  // the winner is scored and the best fit wins.
  const relatives = [0.5, 2 / 3, 0.75, 1, 4 / 3, 1.5, 2]
    .map((k) => r.bpm * k)
    .filter((v) => v >= 70 && v <= 180);
  const scored = [];
  for (const bpm of relatives) {
    const fit = await page.evaluate(
      ([u, b]) => window.gridFit(u, b),
      [`${BASE}/${file}`, bpm]
    );
    scored.push({ bpm, ...fit });
  }
  scored.sort((a, b) => b.score - a.score);

  // Picking from a handful of candidates only ever returns one of those
  // candidates, which is how two runs with different lists can disagree by a
  // third of a BPM. Sweep finely around the best relative and take the actual
  // maximum, so the answer comes from the audio rather than from the guesses.
  let winner = scored[0];
  for (let bpm = winner.bpm - 1.5; bpm <= winner.bpm + 1.5; bpm += 0.01) {
    const fit = await page.evaluate(
      ([u, b]) => window.gridFit(u, b),
      [`${BASE}/${file}`, bpm]
    );
    if (fit.score > winner.score) winner = { bpm, ...fit };
  }

  console.log(`\n=== ${id}`);
  console.log(`  duration      ${mmss(r.duration)}  @ ${r.sampleRate} Hz`);
  console.log(`  raw ACF peak  ${r.bpm.toFixed(2)} BPM`);
  console.log(`  grid fit:`);
  for (const s of scored) {
    console.log(
      `    ${s.bpm.toFixed(2).padStart(7)} BPM   fit ${(s.score / winner.score).toFixed(3)}` +
        (s === winner ? "   <- best" : "")
    );
  }
  console.log(`  MEASURED      ${winner.bpm.toFixed(2)} BPM`);
  console.log(`  bar           ${((60 / winner.bpm) * 4).toFixed(4)}s  (4/4)`);
  console.log(`  first beat    ${winner.phase.toFixed(3)}s`);
  results.push({ id, bpm: winner.bpm, firstBeatSec: winner.phase, durationSec: r.duration });
}

console.log("\n--- for lib/tempo.ts ---");
for (const r of results) {
  console.log(`  ${r.id}: {`);
  console.log(`    id: ${JSON.stringify(r.id)},`);
  console.log(`    src: "/audio/tracks/${r.id}.mp3",`);
  console.log(`    bpm: ${Math.round(r.bpm * 100) / 100},`);
  console.log(`    beatsPerBar: 4,`);
  console.log(`    firstBeatSec: ${r.firstBeatSec.toFixed(2)},`);
  console.log(`    durationSec: ${r.durationSec.toFixed(2)},`);
  console.log(`  },`);
}

await b.close();
server.close();
