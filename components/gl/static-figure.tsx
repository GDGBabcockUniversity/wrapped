"use client";

// Static DOM stand-ins for the bold shader figures (build4 §2.1), rendered
// only when useGlQuality() reports "off" (low-memory/save-data/no-WebGL2,
// or prefers-reduced-motion) — a still figure beats a missing one. Plain
// repeating CSS gradients, no animation, 60% opacity per spec.

// -z-10 on every root: an absolutely-positioned element with z-index:auto
// paints ABOVE static in-flow content regardless of DOM order (CSS
// stacking-order gotcha) — these must stay behind the real story content.

export function StripeBandFigure({ accentHex }: { accentHex: string }) {
  const stripe = (opacity: number) => ({
    backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 6px, transparent 6px, transparent 16px)`,
    opacity,
  });
  return (
    <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none text-cream/90" style={{ opacity: 0.6 }}>
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
        opacity: 0.6,
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
