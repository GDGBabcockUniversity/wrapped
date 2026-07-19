"use client";

// Static DOM stand-ins for the bold shader figures (build4 §2.1), rendered
// only when useGlQuality() reports "off" (low-memory/save-data/no-WebGL2,
// or prefers-reduced-motion) — a still figure beats a missing one.
//
// build7 §2.1: these drop to a TEXTURE role (opacity ~0.2, never the old
// 0.5–0.6). On the low-power path a still high-contrast figure SHOUTS — the
// owner's "fever dream" overture was this, a near-opaque cream warp field
// stacked under the belt and logo. A fallback must whisper the geometry, not
// compete with the story. (Full-shader devices never see these.)
const FIGURE_OPACITY = 0.2;

// -z-10 on every root: an absolutely-positioned element with z-index:auto
// paints ABOVE static in-flow content regardless of DOM order (CSS
// stacking-order gotcha) — these must stay behind the real story content.

export function StripeBandFigure({ accentHex }: { accentHex: string }) {
  const stripe = (opacity: number) => ({
    backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 6px, transparent 6px, transparent 16px)`,
    opacity,
  });
  return (
    <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none text-cream/90" style={{ opacity: FIGURE_OPACITY }}>
      <div className="absolute inset-x-0 bottom-0 h-[18%]" style={stripe(0.85)} />
      <div className="absolute inset-x-0 top-0 h-[8%]" style={stripe(0.42)} />
      <div
        className="absolute inset-x-0 bottom-0 h-[18%]"
        style={{ backgroundColor: accentHex, opacity: 0.18, mixBlendMode: "overlay" }}
      />
    </div>
  );
}

export function StripeCircleFigure({ accentHex }: { accentHex: string }) {
  return (
    <div
      aria-hidden
      className="absolute -z-10 pointer-events-none text-cream/90 rounded-full overflow-hidden"
      style={{
        opacity: FIGURE_OPACITY,
        width: "90cqw",
        height: "90cqw",
        left: "-30%",
        bottom: "-30%",
        backgroundImage:
          "repeating-linear-gradient(90deg, currentColor 0, currentColor 6px, transparent 6px, transparent 16px)",
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: accentHex, opacity: 0.16, mixBlendMode: "overlay" }} />
    </div>
  );
}

/** Static stand-in for the overture's warp field (shader story 10, build4
    §2.2) — a checker×ring approximation for devices where useGlQuality()
    reports "off" (build6 §2.2). Without this the drive-through's belt was
    the only thing alive over flat ink on those devices, reading as
    "jammed" rather than a spectacle. */
export function WarpFieldFigure() {
  // build7 §2.1: was a near-opaque cream block with hard black rings — the
  // literal "fever dream" background. Now transparent, drawn in faint cream
  // over the ink field: concentric rings you can just make out, not a target.
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{
        opacity: FIGURE_OPACITY,
        backgroundImage: [
          "repeating-radial-gradient(circle at 50% 40%, rgba(255,246,224,0.85) 0 22px, transparent 22px 46px)",
          "repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,246,224,0.4) 0 25%, transparent 0 50%)",
        ].join(", "),
        backgroundSize: "auto, 84px 84px",
      }}
    />
  );
}

export function QuarterRingsFigure() {
  return (
    <div
      aria-hidden
      className="absolute -z-10 pointer-events-none rounded-full text-ink/80"
      style={{
        opacity: 0.6,
        width: "160cqw",
        height: "160cqw",
        left: "-58%",
        bottom: "-95%",
        backgroundImage:
          "repeating-radial-gradient(circle at center, currentColor 0, currentColor 5px, transparent 5px, transparent 15px)",
      }}
    />
  );
}
