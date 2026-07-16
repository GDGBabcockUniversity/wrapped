import { ASSET_MANIFEST } from "@/lib/content/chapter";
import { STORIES } from "@/lib/stories";

export function preloadStoryAssets(currentIndex: number) {
  if (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData
  ) {
    return;
  }
  const next = STORIES[currentIndex + 1];
  if (!next) return;
  const urls = ASSET_MANIFEST[next.id] ?? [];
  urls.forEach((url) => {
    const img = new window.Image();
    img.src = url;
  });
}
