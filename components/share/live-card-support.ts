// Deliberately tiny and dependency-free — statically imported by share-button.tsx
// so the heavy WebGL/MediaRecorder pipeline in live-card.ts stays out of the
// initial player bundle (§10.6.5). Only a capability check and a type live here.

export type LiveCardKind = "your-club" | "summary";

export function supportsLiveCard(): boolean {
  return (
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype
  );
}
