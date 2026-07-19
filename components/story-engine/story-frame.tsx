import type { ReactNode, RefObject } from "react";
import { ShaderField } from "@/components/gl/shader-field";
import { useGlQuality } from "@/components/gl/use-gl-quality";
import { GlQualityContext } from "@/components/gl/quality-context";

export function StoryFrame({
  field,
  storyIndex,
  accentHex,
  pattern,
  progressRef,
  children,
}: {
  field: "ink" | "cream";
  storyIndex: number;
  accentHex: string;
  pattern: number;
  progressRef: RefObject<number>;
  children: ReactNode;
}) {
  const quality = useGlQuality();
  return (
    <div className="fixed inset-0 grid place-items-center bg-ink">
      <div className="stage relative overflow-hidden w-full h-[100dvh] md:w-auto md:h-auto md:rounded-2xl">
        <div
          aria-hidden
          className={`absolute inset-0 z-0 ${field === "ink" ? "bg-ink" : "bg-cream"}`}
        />
        <ShaderField
          storyIndex={storyIndex}
          field={field}
          accentHex={accentHex}
          pattern={pattern}
          progressRef={progressRef}
        />
        <GlQualityContext.Provider value={quality}>{children}</GlQualityContext.Provider>
      </div>
    </div>
  );
}
