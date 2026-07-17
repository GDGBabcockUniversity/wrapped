"use client";

import { useEffect, useState } from "react";

export type GlQuality = "full" | "off";

interface NavigatorGl extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function useGlQuality(): GlQuality {
  const [quality, setQuality] = useState<GlQuality>("off");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nav = navigator as NavigatorGl;
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return;
    if (nav.connection?.saveData) return;

    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    // Deferred: this is a one-time client capability probe, not a derived
    // render value — queueMicrotask keeps it out of the synchronous effect body.
    queueMicrotask(() => setQuality("full"));
  }, []);

  return quality;
}
