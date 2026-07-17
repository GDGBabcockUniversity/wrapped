"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { TIMING } from "@/lib/stories";
import { createProgram, hexToVec3 } from "./shaders";
import { useGlQuality } from "./use-gl-quality";

interface ShaderFieldProps {
  storyIndex: number;
  field: "ink" | "cream";
  accentHex: string;
  pattern: number; // 0..3, only read by the club story
  progressRef: RefObject<number>;
}

interface Uniform {
  story: number;
  field: number; // 0 ink / 1 cream
  accentHex: string;
  pattern: number;
}

export function ShaderField({ storyIndex, field, accentHex, pattern, progressRef }: ShaderFieldProps) {
  const quality = useGlQuality();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Uniform snapshot the render loop reads from — swapped only at the midpoint
  // of the crossfade so the visible story never jumps ahead of u_fade.
  const activeRef = useRef<Uniform>({
    story: storyIndex,
    field: field === "cream" ? 1 : 0,
    accentHex,
    pattern,
  });
  const fadeRef = useRef(1);
  const fadeRaf = useRef(0);

  // Story-change crossfade: fade out, swap uniforms, fade in — JS-driven,
  // total duration matches TIMING.storyFadeMs (never CSS, per §3.7).
  useEffect(() => {
    const next: Uniform = { story: storyIndex, field: field === "cream" ? 1 : 0, accentHex, pattern };
    const prev = activeRef.current;
    if (
      prev.story === next.story &&
      prev.field === next.field &&
      prev.accentHex === next.accentHex &&
      prev.pattern === next.pattern
    ) {
      return;
    }

    cancelAnimationFrame(fadeRaf.current);
    const half = TIMING.storyFadeMs / 2;
    const outStart = performance.now();

    function fadeOut(ts: number) {
      const t = Math.min(1, (ts - outStart) / half);
      fadeRef.current = 1 - t;
      if (t < 1) {
        fadeRaf.current = requestAnimationFrame(fadeOut);
        return;
      }
      activeRef.current = next;
      const inStart = performance.now();
      function fadeIn(ts2: number) {
        const t2 = Math.min(1, (ts2 - inStart) / half);
        fadeRef.current = t2;
        if (t2 < 1) fadeRaf.current = requestAnimationFrame(fadeIn);
      }
      fadeRaf.current = requestAnimationFrame(fadeIn);
    }
    fadeRaf.current = requestAnimationFrame(fadeOut);
    return () => cancelAnimationFrame(fadeRaf.current);
  }, [storyIndex, field, accentHex, pattern]);

  useEffect(() => {
    if (quality !== "full") return;
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    const uniforms = {
      res: gl.getUniformLocation(program, "u_res"),
      time: gl.getUniformLocation(program, "u_time"),
      pointer: gl.getUniformLocation(program, "u_pointer"),
      accent: gl.getUniformLocation(program, "u_accent"),
      field: gl.getUniformLocation(program, "u_field"),
      story: gl.getUniformLocation(program, "u_story"),
      pattern: gl.getUniformLocation(program, "u_pattern"),
      progress: gl.getUniformLocation(program, "u_progress"),
      fade: gl.getUniformLocation(program, "u_fade"),
    };

    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      const w = stage!.clientWidth;
      const h = stage!.clientHeight;
      const pxW = Math.max(1, Math.round(w * dpr));
      const pxH = Math.max(1, Math.round(h * dpr));
      if (canvas!.width !== pxW || canvas!.height !== pxH) {
        canvas!.width = pxW;
        canvas!.height = pxH;
      }
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const pointer = { x: 0.5, y: 0.5 };
    const pointerTarget = { x: 0.5, y: 0.5 };
    let hasRealPointer = false;
    function onPointerMove(e: PointerEvent) {
      const rect = stage!.getBoundingClientRect();
      pointerTarget.x = (e.clientX - rect.left) / rect.width;
      pointerTarget.y = 1 - (e.clientY - rect.top) / rect.height;
      hasRealPointer = true;
    }
    stage.addEventListener("pointermove", onPointerMove);

    const start = performance.now();
    let lastTs = start;
    let frameSamples: number[] = [];
    let degraded = false;
    let off = false;
    let raf = 0;

    function draw(ts: number) {
      const delta = ts - lastTs;
      lastTs = ts;
      frameSamples.push(delta);
      if (frameSamples.length >= 60) {
        const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
        frameSamples = [];
        if (avg > 24) {
          if (!degraded) {
            degraded = true;
            dpr = 1.0;
            resize();
          } else {
            off = true;
            canvas!.style.display = "none";
            return;
          }
        }
      }

      const t = (ts - start) / 1000;
      if (!hasRealPointer) {
        pointerTarget.x = 0.5 + 0.22 * Math.sin(t * 0.13);
        pointerTarget.y = 0.5 + 0.22 * Math.cos(t * 0.09);
      }
      pointer.x += (pointerTarget.x - pointer.x) * 0.08;
      pointer.y += (pointerTarget.y - pointer.y) * 0.08;

      const u = activeRef.current;
      const [ar, ag, ab] = hexToVec3(u.accentHex);

      gl!.uniform2f(uniforms.res, canvas!.width, canvas!.height);
      gl!.uniform1f(uniforms.time, t);
      gl!.uniform2f(uniforms.pointer, pointer.x, pointer.y);
      gl!.uniform3f(uniforms.accent, ar, ag, ab);
      gl!.uniform1f(uniforms.field, u.field);
      gl!.uniform1i(uniforms.story, u.story);
      gl!.uniform1i(uniforms.pattern, u.pattern);
      gl!.uniform1f(uniforms.progress, progressRef.current ?? 0);
      gl!.uniform1f(uniforms.fade, fadeRef.current);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      if (off) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        lastTs = performance.now();
        raf = requestAnimationFrame(draw);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    if (!document.hidden) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(program);
    };
  }, [quality, progressRef]);

  if (quality !== "full") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 z-[1] w-full h-full pointer-events-none"
    />
  );
}
