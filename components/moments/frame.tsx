"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Stylised photo frames for the Moments spread (build7 §4). Each is pure-CSS
 * chrome around a photo, and every photo slot degrades to a tinted
 * placeholder with its label — never a broken frame — so the spread ships
 * with the few photos that exist today and auto-fills as the owner drops more
 * into public/moments/<event>/NN.jpg.
 */

const TINTS = ["#4285f4", "#ea4335", "#faab00", "#34a853"];
export function tintFor(index: number): string {
  return TINTS[index % TINTS.length]!;
}

/** The real image, or a tinted placeholder carrying the label. `fill` covers
    the parent (which must be positioned + sized). */
export function FramedPhoto({
  src,
  label,
  index = 0,
  sizes = "50vw",
  className,
}: {
  src?: string;
  label: string;
  index?: number;
  sizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tint = tintFor(index);
  if (!src || failed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
        style={{ background: `${tint}1f` }}
        aria-hidden
      >
        <span className="t-label text-center px-2" style={{ color: tint, opacity: 0.75, fontSize: "0.55rem" }}>
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover contrast-[1.04] saturate-[88%]"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/** A polaroid — paper border, deep caption lip, optional tape. The hero
    frame of a spread. */
export function PolaroidFrame({
  src,
  label,
  caption,
  index = 0,
  width = "70cqw",
  maxWidth = 300,
  tape = true,
  big = false,
}: {
  src?: string;
  label: string;
  caption?: string;
  index?: number;
  width?: string;
  maxWidth?: number;
  tape?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className="relative bg-paper rounded-sm shadow-xl"
      style={{ width, maxWidth, padding: big ? "10px 10px 34px" : "8px 8px 28px" }}
    >
      {tape && (
        <div
          aria-hidden
          className="absolute -top-3 left-1/2 h-6 w-16 bg-cream/85 shadow-sm"
          style={{ transform: "translateX(-50%) rotate(-4deg)" }}
        />
      )}
      <FramedPhoto src={src} label={label} index={index} sizes="70vw" className="w-full aspect-square" />
      {caption && (
        <p
          className="t-editorial text-ink/70 text-center absolute inset-x-2"
          style={{ bottom: big ? "9px" : "7px", fontSize: "clamp(0.7rem, 3.4cqw, 0.95rem)" }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

function Sprockets({ count }: { count: number }) {
  return (
    <div className="flex justify-around px-1 py-1" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="h-2 w-1.5 rounded-[1px] bg-cream/70" />
      ))}
    </div>
  );
}

/** A strip of film — ink body, sprocket-hole edges, 2–3 photo cells. */
export function FilmstripFrame({
  srcs,
  label,
  startIndex = 0,
  width = "82cqw",
  maxWidth = 340,
}: {
  srcs: (string | undefined)[];
  label: string;
  startIndex?: number;
  width?: string;
  maxWidth?: number;
}) {
  const cells = srcs.length > 0 ? srcs : [undefined];
  const holes = Math.max(cells.length * 4, 6);
  return (
    <div className="bg-ink rounded-md shadow-xl" style={{ width, maxWidth }}>
      <Sprockets count={holes} />
      <div className="flex gap-1.5 px-1.5">
        {cells.map((s, i) => (
          <FramedPhoto
            key={i}
            src={s}
            label={label}
            index={startIndex + i}
            sizes="30vw"
            className="flex-1 aspect-[3/4] rounded-[2px]"
          />
        ))}
      </div>
      <Sprockets count={holes} />
    </div>
  );
}

/** A postcard — photo on the left, a "message" panel on the right with a
    stamp, postmark rule, and a headline stat. Carries a beat's number. */
export function PostcardFrame({
  src,
  label,
  index = 0,
  stat,
  statLabel,
  caption,
  accentHex,
  width = "84cqw",
  maxWidth = 350,
}: {
  src?: string;
  label: string;
  index?: number;
  stat?: string;
  statLabel?: string;
  caption?: string;
  accentHex: string;
  width?: string;
  maxWidth?: number;
}) {
  return (
    <div className="relative bg-paper rounded-sm shadow-xl p-2 flex gap-2.5" style={{ width, maxWidth }}>
      <FramedPhoto src={src} label={label} index={index} sizes="45vw" className="w-1/2 aspect-[4/5] rounded-[2px]" />
      <div className="flex-1 flex flex-col justify-between py-1 pr-0.5 min-w-0">
        {/* stamp */}
        <div
          className="self-end flex items-center justify-center rounded-[2px]"
          style={{ width: 30, height: 38, background: `${accentHex}26`, border: `1px dashed ${accentHex}` }}
          aria-hidden
        >
          <span className="t-label" style={{ color: accentHex, fontSize: "0.45rem" }}>25/26</span>
        </div>
        {/* postmark */}
        <div className="flex flex-col gap-1 my-1" aria-hidden>
          <span className="h-px bg-ink/20" style={{ width: "80%" }} />
          <span className="h-px bg-ink/15" style={{ width: "62%" }} />
        </div>
        {stat && (
          <div className="leading-none">
            <p className="t-display text-ink" style={{ fontSize: "clamp(1.6rem, 9cqw, 2.6rem)", fontVariantNumeric: "tabular-nums" }}>
              {stat}
            </p>
            {statLabel && <p className="t-label text-ink/60 mt-1" style={{ fontSize: "0.5rem" }}>{statLabel}</p>}
          </div>
        )}
        {caption && <p className="t-editorial text-ink/60" style={{ fontSize: "0.66rem" }}>{caption}</p>}
      </div>
    </div>
  );
}
