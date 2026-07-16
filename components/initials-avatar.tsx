const ACCENTS = ["#4285f4", "#34a853", "#faab00", "#ea4335"];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function InitialsAvatar({
  name,
  index = 0,
  sizePx = 40,
  className,
}: {
  name: string;
  index?: number;
  sizePx?: number;
  className?: string;
}) {
  const bg = ACCENTS[index % ACCENTS.length];
  return (
    <div
      className={className}
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: "9999px",
        background: bg,
        color: "#0f0f0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: sizePx * 0.38,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initialsOf(name)}
    </div>
  );
}
