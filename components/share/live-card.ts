import { createProgram, hexToVec3 } from "@/components/gl/shaders";
import { CLUBS } from "@/lib/clubs";
import { copy, fmt } from "@/lib/copy";
import type { Snapshot } from "@/lib/snapshot";
import { supportsLiveCard, type LiveCardKind } from "./live-card-support";

export type { LiveCardKind };

const INK = "#0f0f0f";
const CREAM = "#fff6e0";
const BLUE = "#4285f4";
const RED = "#ea4335";
const YELLOW = "#faab00";
const GREEN = "#34a853";

const WIDTH = 1080;
const HEIGHT = 1920;
const GL_WIDTH = 540;
const GL_HEIGHT = 960;
const DURATION_S = 3;

const CLUB_PATTERN_INDEX = { grid: 0, waves: 1, halftone: 2, diagonals: 3 } as const;

let fontsReady: Promise<void> | null = null;

function loadFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    const bold = new FontFace("Google Sans", "url(/fonts/GoogleSans-Bold.ttf)", { weight: "700" });
    const medium = new FontFace("Google Sans", "url(/fonts/GoogleSans-Medium.ttf)", { weight: "500" });
    const bricolage = new FontFace("Bricolage", "url(/fonts/BricolageGrotesque-Medium.ttf)", {
      weight: "500",
    });
    const loaded = await Promise.all([bold.load(), medium.load(), bricolage.load()]);
    loaded.forEach((f) => document.fonts.add(f));
    await Promise.all([
      document.fonts.load("700 90px 'Google Sans'"),
      document.fonts.load("500 40px 'Google Sans'"),
      document.fonts.load("500 40px 'Bricolage'"),
    ]);
  })();
  return fontsReady;
}

function pickMimeType(): { mimeType: string; ext: string } | null {
  const candidates: Array<{ mimeType: string; ext: string }> = [
    { mimeType: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mimeType: "video/mp4", ext: "mp4" },
    { mimeType: "video/webm;codecs=vp9", ext: "webm" },
    { mimeType: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
  }
  return null;
}

function createGlLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = GL_WIDTH;
  canvas.height = GL_HEIGHT;
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const program = createProgram(gl);
  if (!program) return null;
  gl.useProgram(program);
  gl.viewport(0, 0, GL_WIDTH, GL_HEIGHT);
  return {
    canvas,
    gl,
    uniforms: {
      res: gl.getUniformLocation(program, "u_res"),
      time: gl.getUniformLocation(program, "u_time"),
      pointer: gl.getUniformLocation(program, "u_pointer"),
      accent: gl.getUniformLocation(program, "u_accent"),
      field: gl.getUniformLocation(program, "u_field"),
      story: gl.getUniformLocation(program, "u_story"),
      pattern: gl.getUniformLocation(program, "u_pattern"),
      progress: gl.getUniformLocation(program, "u_progress"),
      fade: gl.getUniformLocation(program, "u_fade"),
    },
  };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineHeight;
}

function drawWatermark(ctx: CanvasRenderingContext2D, dark: boolean) {
  const cy = HEIGHT - 56 - 11;
  const dotColors = [BLUE, RED, YELLOW, GREEN];
  const dotsWidth = dotColors.length * 10 + (dotColors.length - 1) * 6;
  ctx.font = "500 22px 'Google Sans'";
  const label = "wrapped.gdgbabcock.com";
  const labelWidth = ctx.measureText(label).width;
  const totalWidth = dotsWidth + 16 + labelWidth;
  let cx = (WIDTH - totalWidth) / 2;

  for (const c of dotColors) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(cx + 5, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    cx += 16;
  }
  cx += 16 - 6;
  ctx.fillStyle = dark ? `${CREAM}99` : `${INK}99`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, cx, cy);
}

function drawClubFrame(ctx: CanvasRenderingContext2D, snapshot: Snapshot, t: number) {
  const club = CLUBS[snapshot.club.id];
  const cardW = 720;
  const cardH = 1008;
  const cardX = (WIDTH - cardW) / 2;
  const cardY = (HEIGHT - cardH) / 2;
  const pad = 56;
  const innerW = cardW - pad * 2;

  ctx.save();
  ctx.beginPath();
  const r = 32;
  ctx.moveTo(cardX + r, cardY);
  ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, r);
  ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, r);
  ctx.arcTo(cardX, cardY + cardH, cardX, cardY, r);
  ctx.arcTo(cardX, cardY, cardX + cardW, cardY, r);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = `${CREAM}44`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();

  const x = cardX + pad;
  let y = cardY + pad;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = `${CREAM}cc`;
  ctx.font = "700 26px 'Google Sans'";
  ctx.fillText(copy.yourClub.revealPrefix, x, y);

  ctx.textAlign = "right";
  ctx.fillStyle = club.hex;
  ctx.font = "700 56px 'Google Sans'";
  ctx.fillText(club.name[0]!, x + innerW, y - 14);
  ctx.textAlign = "left";

  y += 56 + 40;
  ctx.fillStyle = `${club.hex}22`;
  ctx.fillRect(x, y, innerW, 280);
  // A faint pulse ties the still frame to the orbiting foil pointer below.
  ctx.fillStyle = `${club.hex}${Math.round(20 + 12 * (0.5 + 0.5 * Math.sin(t * 2.1))).toString(16).padStart(2, "0")}`;
  ctx.fillRect(x, y, innerW, 280);

  y += 280 + 40;
  ctx.fillStyle = club.hex;
  ctx.font = "700 96px 'Google Sans'";
  ctx.fillText(club.name, x, y);

  y += 110 + 16;
  ctx.fillStyle = CREAM;
  ctx.font = "500 36px 'Bricolage'";
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  ctx.fillText(club.vibe, 0, 0);
  ctx.restore();

  y += 52 + 16;
  ctx.fillStyle = `${CREAM}aa`;
  ctx.font = "500 26px 'Google Sans'";
  wrapText(ctx, club.role, x, y, innerW, 34);

  const badgeY = cardY + cardH - pad - 64;
  const badgeText = fmt(copy.yourClub.rarity, { rarityPct: snapshot.club.rarityPct });
  ctx.font = "700 24px 'Google Sans'";
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeW = badgeTextWidth + 56;
  ctx.fillStyle = club.hex;
  ctx.fillRect(x, badgeY, badgeW, 48);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, x + 28, badgeY + 24);

  ctx.restore();
}

function drawSummaryFrame(ctx: CanvasRenderingContext2D, snapshot: Snapshot) {
  const club = CLUBS[snapshot.club.id];
  const cardX = 90;
  const cardY = 160;
  const cardW = WIDTH - cardX * 2;
  const cardH = HEIGHT - cardY * 2;
  const pad = 56;
  const innerW = cardW - pad * 2;

  ctx.save();
  ctx.beginPath();
  const r = 32;
  ctx.moveTo(cardX + r, cardY);
  ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, r);
  ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, r);
  ctx.arcTo(cardX, cardY + cardH, cardX, cardY, r);
  ctx.arcTo(cardX, cardY, cardX + cardW, cardY, r);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.clip();

  const x = cardX + pad;
  let y = cardY + pad;

  const dotColors = [BLUE, RED, YELLOW, GREEN];
  let dotX = x;
  for (const c of dotColors) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(dotX + 8, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    dotX += 26;
  }
  ctx.fillStyle = `${INK}99`;
  ctx.font = "700 24px 'Google Sans'";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(copy.summary.title, x + innerW, y - 3);
  ctx.textAlign = "left";

  y += 40 + 40;
  const nameFontSize = snapshot.name.length > 22 ? 48 : snapshot.name.length > 14 ? 58 : 68;
  ctx.fillStyle = INK;
  ctx.font = `700 ${nameFontSize}px 'Google Sans'`;
  y = wrapText(ctx, snapshot.name, x, y, innerW, nameFontSize * 1.05) - nameFontSize * 1.05 + 40;

  function statPair(label: string, value: string) {
    ctx.font = "500 20px 'Google Sans'";
    ctx.fillStyle = `${INK}88`;
    ctx.fillText(label, x, y);
    y += 28;
    ctx.font = "700 36px 'Google Sans'";
    ctx.fillStyle = INK;
    ctx.fillText(value, x, y);
    y += 52;
  }
  statPair(copy.summary.memberSince, snapshot.joinMonthLabel);
  ctx.font = "500 20px 'Google Sans'";
  ctx.fillStyle = `${INK}88`;
  ctx.fillText(copy.summary.club, x, y);
  y += 28;
  ctx.font = "700 36px 'Google Sans'";
  ctx.fillStyle = club.hex;
  ctx.fillText(club.name, x, y);

  y += 48 + 44;
  let sx = x;
  function statBlock(value: string | number, label: string) {
    ctx.font = "700 44px 'Google Sans'";
    ctx.fillStyle = INK;
    ctx.fillText(String(value), sx, y);
    ctx.font = "500 20px 'Google Sans'";
    ctx.fillStyle = `${INK}88`;
    ctx.fillText(label, sx, y + 58);
    sx += Math.max(ctx.measureText(String(value)).width, 90) + 56;
  }
  if (!snapshot.flags.zeroCheckins) statBlock(snapshot.events.checkins, copy.summary.statEvents);
  if (snapshot.messages.matched) statBlock(snapshot.messages.count, copy.summary.statMessages);
  statBlock(snapshot.tenureMonths, copy.summary.statMonths);

  ctx.restore();
}

export async function renderLiveCardBlob(
  kind: LiveCardKind,
  snapshot: Snapshot,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  if (!supportsLiveCard()) throw new Error("MediaRecorder unsupported");
  const picked = pickMimeType();
  if (!picked) throw new Error("no supported video mimeType");

  await loadFonts();

  const gl = createGlLayer();
  const composition = document.createElement("canvas");
  composition.width = WIDTH;
  composition.height = HEIGHT;
  const ctx2d = composition.getContext("2d");
  if (!ctx2d) throw new Error("2d context unavailable");
  const ctx: CanvasRenderingContext2D = ctx2d;

  const club = CLUBS[snapshot.club.id];
  const story = kind === "your-club" ? 7 : 9;
  const accentHex = kind === "your-club" ? club.hex : "#4285f4";
  const pattern = kind === "your-club" ? CLUB_PATTERN_INDEX[club.pattern] : 0;
  const [ar, ag, ab] = hexToVec3(accentHex);
  const field = 0; // both flagship cards composite over the ink field

  function drawFrame(t: number) {
    if (gl) {
      const { gl: glctx, uniforms } = gl;
      const px = 0.5 + 0.35 * Math.cos(t * 2.1);
      const py = 0.5 + 0.35 * Math.sin(t * 1.7);
      glctx.uniform2f(uniforms.res, GL_WIDTH, GL_HEIGHT);
      glctx.uniform1f(uniforms.time, t);
      glctx.uniform2f(uniforms.pointer, px, py);
      glctx.uniform3f(uniforms.accent, ar, ag, ab);
      glctx.uniform1f(uniforms.field, field);
      glctx.uniform1i(uniforms.story, story);
      glctx.uniform1i(uniforms.pattern, pattern);
      glctx.uniform1f(uniforms.progress, 1);
      glctx.uniform1f(uniforms.fade, 1);
      glctx.drawArrays(glctx.TRIANGLES, 0, 3);
      ctx.drawImage(gl.canvas, 0, 0, WIDTH, HEIGHT);
    } else {
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (kind === "your-club") {
      drawClubFrame(ctx, snapshot, t);
      drawWatermark(ctx, true);
    } else {
      drawSummaryFrame(ctx, snapshot);
      drawWatermark(ctx, true);
    }
  }

  const stream = composition.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: picked.mimeType,
    videoBitsPerSecond: 6_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: picked.mimeType }));
  });

  recorder.start();
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function tick(now: number) {
      const t = Math.min(DURATION_S, (now - start) / 1000);
      drawFrame(t);
      onProgress?.(t / DURATION_S);
      if (t >= DURATION_S) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  recorder.stop();
  return done;
}

export function fileExtensionFor(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export { shareOrDownloadFile } from "./share-utils";
