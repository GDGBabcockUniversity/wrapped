"use client";

import { createContext, useContext } from "react";
import type { GlQuality } from "./use-gl-quality";

// Exposes the one useGlQuality() probe StoryFrame already runs so story
// components can render a static DOM stand-in for their shader figure
// without re-running the WebGL2 capability probe themselves (build4 §2.3).
export const GlQualityContext = createContext<GlQuality>("off");

export function useGlQualityContext(): GlQuality {
  return useContext(GlQualityContext);
}
