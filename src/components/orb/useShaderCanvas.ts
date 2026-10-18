"use client";

import { useEffect, useRef } from "react";

export type Uniforms = Record<string, number | [number, number]>;

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

type Options = {
  /** Render resolution relative to CSS pixels × DPR. Lower is cheaper. */
  scale?: number;
  maxDpr?: number;
  /** Called every frame; write into the uniforms object. */
  onFrame?: (u: Uniforms, t: number) => void;
};

/**
 * Runs a full-screen fragment shader on a canvas. Pauses when the canvas is
 * off-screen or the tab is hidden, renders a single still frame for users who
 * prefer reduced motion, and reports whether WebGL is available.
 */
export function useShaderCanvas(fragment: string, opts: Options = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) {
      canvas.dataset.fallback = "1";
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.fallback = "1";
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uniformLocs = new Map<string, WebGLUniformLocation | null>();
    const setUniform = (name: string, v: number | [number, number]) => {
      if (!uniformLocs.has(name)) uniformLocs.set(name, gl.getUniformLocation(program, name));
      const l = uniformLocs.get(name);
      if (!l) return;
      if (typeof v === "number") gl.uniform1f(l, v);
      else gl.uniform2f(l, v[0], v[1]);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const uniforms: Uniforms = {};
    let raf = 0;
    let visible = true;
    let running = false;
    const start = performance.now();

    const resize = () => {
      const { scale = 1, maxDpr = 2 } = optsRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now: number) => {
      const t = reduced ? 8 : (now - start) / 1000;
      resize();
      optsRef.current.onFrame?.(uniforms, t);
      setUniform("uTime", t);
      setUniform("uRes", [canvas.width, canvas.height]);
      for (const [k, v] of Object.entries(uniforms)) setUniform(k, v);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    const update = () => {
      const shouldRun = visible && document.visibilityState === "visible" && !reduced;
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      update();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => reduced && draw(performance.now()));
    ro.observe(canvas);
    document.addEventListener("visibilitychange", update);

    draw(performance.now());
    update();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", update);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [fragment]);

  return canvasRef;
}
