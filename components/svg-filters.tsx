"use client";

export function SvgFilters() {
  const colors = [
    { name: "cream", hex: "#fff6e0" },
    { name: "blue", hex: "#4285f4" },
    { name: "red", hex: "#ea4335" },
    { name: "yellow", hex: "#faab00" },
    { name: "green", hex: "#34a853" },
  ];

  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        {colors.map((c) => (
          <filter key={c.name} id={`stroke-${c.name}`}>
            {/* Desktop thickness (1.5px) */}
            <feMorphology
              in="SourceAlpha"
              result="DILATED"
              operator="dilate"
              radius="1.5"
            />
            <feFlood floodColor={c.hex} floodOpacity="1" result="COLOR" />
            <feComposite
              in="COLOR"
              in2="DILATED"
              operator="in"
              result="OUTLINE_FILLED"
            />
            <feComposite
              in="OUTLINE_FILLED"
              in2="SourceAlpha"
              operator="out"
              result="FINAL"
            />
          </filter>
        ))}
        {colors.map((c) => (
          <filter key={`${c.name}-mobile`} id={`stroke-${c.name}-mobile`}>
            {/* Mobile thickness (0.75px) */}
            <feMorphology
              in="SourceAlpha"
              result="DILATED"
              operator="dilate"
              radius="0.75"
            />
            <feFlood floodColor={c.hex} floodOpacity="1" result="COLOR" />
            <feComposite
              in="COLOR"
              in2="DILATED"
              operator="in"
              result="OUTLINE_FILLED"
            />
            <feComposite
              in="OUTLINE_FILLED"
              in2="SourceAlpha"
              operator="out"
              result="FINAL"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
