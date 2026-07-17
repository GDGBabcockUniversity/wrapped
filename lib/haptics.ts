export function vibrate(pattern: number | number[]) {
  if (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator &&
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    document.hasFocus()
  ) {
    navigator.vibrate(pattern);
  }
}
