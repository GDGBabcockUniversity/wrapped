import { getImageProps } from "next/image";
import { ASSET_MANIFEST } from "@/lib/content/chapter";
import { STORIES } from "@/lib/stories";

// Must match the `sizes` the real <Image> for each story actually renders
// with (02-moments.tsx / 04-people.tsx) — preloading a different `sizes`
// still warms a cache entry, just not necessarily the one the real render
// picks (build3.md §2.2).
const SIZES_FOR: Partial<Record<string, string>> = {
  moments: "(max-width: 480px) 60vw, 240px",
  people: "84px",
};

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
  const sizes = SIZES_FOR[next.id] ?? "220px";

  urls.forEach((url) => {
    // Real <Image> components render via Next's image optimizer
    // (/_next/image?url=...&w=...&q=...), a different cache key from the
    // raw path. getImageProps builds the exact URL/srcset the real <Image>
    // would, so the request this fires actually warms what gets rendered.
    const { props } = getImageProps({
      src: url,
      alt: "",
      width: 240,
      height: 240,
      sizes,
      quality: 75,
    });
    const img = new window.Image();
    img.sizes = props.sizes ?? sizes;
    img.srcset = props.srcSet ?? "";
    img.src = props.src;
  });
}
