"use client";

import type { MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/util";

/*
 * Homepage visuals drawn in code: nothing to download, so they show the moment
 * the page opens and never stall on a slow connection.
 */

type Draw = (ctx: CanvasRenderingContext2D, size: number, v: number, time: number, intro: number) => void;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Square canvas driven by a scroll value. Only redraws while the value is
 * still easing (or `live` animates), and only while on screen.
 */
function useScene(progress: MotionValue<number>, draw: Draw, { live = false, intro = 0, maxDpr = 2 } = {}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let size = 0;
    let raf = 0;
    let visible = true;
    let dirty = true;
    let cur = progress.get();
    let shown = NaN;

    const tick = (now: number) => {
      raf = 0;
      if (!visible || !size) return;
      const target = progress.get();
      cur += (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      const k = intro && !still ? clamp01((now - start) / intro) : 1;
      const animating = (live && !still) || k < 1;
      if (dirty || cur !== shown || animating) {
        draw(ctx, size, cur, now / 1000, easeOut(k));
        if (!canvas.dataset.ready) canvas.dataset.ready = "1";
        shown = cur;
        dirty = false;
      }
      if (cur !== target || animating) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const resize = () => {
      const s = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, maxDpr));
      if (s && s !== size) {
        size = s;
        canvas.width = canvas.height = s;
        dirty = true;
        wake();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    const off = progress.on("change", wake);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      off();
    };
  }, [progress, draw, live, intro, maxDpr]);
  return ref;
}

const canvasClass = "block h-full w-full opacity-0 transition-opacity duration-700 data-[ready]:opacity-100";

/* ── Rose: a bud that opens as you scroll ───────────────────── */

const PETALS = 40;
const GOLDEN = 2.39996323;
const petals = Array.from({ length: PETALS }, (_, i) => ({ t: i / (PETALS - 1), a: i * GOLDEN, jl: rnd(i, 1), jw: rnd(i, 2), jc: rnd(i, 3) }));

const SHADOW = [
  [1.04, 1.06],
  [1.1, 1.14],
] as const;

const drawRose: Draw = (ctx, S, v, _time, intro) => {
  // Opens a little on arrival, then the rest is up to the scroll.
  const b = 0.14 * intro + 0.86 * v;
  const c = S / 2;
  const R = S * 0.47;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(c, c);
  ctx.lineCap = "round";
  // Outer petals first so the inner ones sit on top.
  for (let i = PETALS - 1; i >= 0; i--) {
    const { t, a, jl, jw, jc } = petals[i];
    const open = smooth((b - (1 - t) * 0.62) / 0.38);
    const L = lerp(R * (0.09 + 0.17 * t), R * (0.1 + 0.9 * Math.pow(t, 0.9)) * (0.92 + 0.12 * jl), open);
    const W = L * lerp(1.3, (0.98 - 0.12 * t) * (0.9 + 0.2 * jw), open);
    ctx.save();
    ctx.rotate(a + (1 - open) * 1.1);
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(L * 0.1, -W * 0.5, L * 0.48, -W * 0.68, L * 0.8, -W * 0.46);
    path.quadraticCurveTo(L, -W * 0.3, L * 0.985, -W * 0.03);
    path.quadraticCurveTo(L, W * 0.28, L * 0.8, W * 0.46);
    path.bezierCurveTo(L * 0.48, W * 0.68, L * 0.1, W * 0.5, 0, 0);

    // Soft shadow on the petals underneath: a few faint layers, darkest near the edge.
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    for (const [sx, sy] of SHADOW) {
      ctx.save();
      ctx.scale(sx, sy);
      ctx.fill(path);
      ctx.restore();
    }

    const depth = (0.5 + 0.5 * t) * (0.9 + 0.2 * jc);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L);
    g.addColorStop(0, `hsl(348,90%,${4 * depth}%)`);
    g.addColorStop(0.5, `hsl(349,82%,${17 * depth}%)`);
    g.addColorStop(0.86, `hsl(350,80%,${31 * depth + 3}%)`);
    g.addColorStop(1, `hsl(352,78%,${42 * depth + 5}%)`);
    ctx.fillStyle = g;
    ctx.fill(path);

    // The rolled lip of the petal catching the light.
    ctx.beginPath();
    ctx.moveTo(L * 0.6, -W * 0.44);
    ctx.quadraticCurveTo(L * 1.02, 0, L * 0.6, W * 0.44);
    ctx.strokeStyle = `rgba(255,120,130,${0.06 + 0.16 * depth})`;
    ctx.lineWidth = Math.max(1, L * 0.05);
    ctx.stroke();
    ctx.restore();
  }
  // One key light from the top left, only over the flower.
  ctx.globalCompositeOperation = "source-atop";
  const light = ctx.createLinearGradient(-R, -R, R, R);
  light.addColorStop(0, "rgba(255,190,190,0.10)");
  light.addColorStop(0.5, "rgba(0,0,0,0)");
  light.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = light;
  ctx.fillRect(-c, -c, S, S);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
};

export function Rose({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  // Soft shapes, so 1.5x pixels look as sharp as 3x and draw far faster.
  const ref = useScene(progress, drawRose, { intro: 1600, maxDpr: 1.5 });
  return (
    <div className={cn("motion-safe:animate-[spin_120s_linear_infinite]", className)}>
      <canvas ref={ref} aria-hidden className={canvasClass} />
    </div>
  );
}

/* ── Sparks: a golden burst for "make the move" ─────────────── */

const SPARKS = Array.from({ length: 130 }, (_, i) => ({
  a: rnd(i, 4) * Math.PI * 2,
  s: 0.3 + 0.7 * Math.sqrt(rnd(i, 5)),
  size: 0.6 + rnd(i, 6) * 1.6,
  hue: 30 + rnd(i, 7) * 18,
  tw: rnd(i, 8) * Math.PI * 2,
}));

const drawSparks: Draw = (ctx, S, q, time) => {
  const c = S / 2;
  const R = S * 0.46;
  const k = easeOut((q - 0.1) / 0.75);
  const unit = S / 400;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.translate(c, c);
  ctx.globalCompositeOperation = "lighter";

  // The spark before the burst: a warm point that swells, then gives way.
  const core = R * (0.05 + 0.1 * smooth(q / 0.12));
  const fade = 1 - k;
  if (fade > 0.01) {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, core * 3);
    glow.addColorStop(0, `rgba(255,236,200,${0.95 * fade})`);
    glow.addColorStop(0.25, `rgba(255,180,70,${0.5 * fade})`);
    glow.addColorStop(1, "rgba(255,150,40,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-core * 3, -core * 3, core * 6, core * 6);
  }

  if (k > 0) {
    ctx.lineCap = "round";
    const trail = 0.12 * fade;
    for (const p of SPARKS) {
      const at = (kk: number) => {
        const r = R * p.s * kk;
        return [Math.cos(p.a) * r, Math.sin(p.a) * r + R * 0.22 * p.s * kk * kk] as const;
      };
      const [x, y] = at(k);
      const twinkle = 0.55 + 0.45 * Math.sin(time * 2.2 + p.tw);
      const alpha = lerp(1, 0.75, k) * twinkle;
      const r = p.size * unit;
      if (trail > 0.004) {
        const [tx, ty] = at(Math.max(0, k - trail));
        ctx.strokeStyle = `hsla(${p.hue},100%,60%,${0.35 * fade})`;
        ctx.lineWidth = r * 0.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      // Halo, then a bright center.
      ctx.fillStyle = `hsla(${p.hue},100%,55%,${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${p.hue + 6},100%,${68 + 14 * twinkle}%,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

export function Sparks({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const ref = useScene(progress, drawSparks, { live: true });
  return (
    <div className={className}>
      <canvas ref={ref} aria-hidden className={canvasClass} />
    </div>
  );
}

/* ── Bar: warm out-of-focus lights behind the chat ──────────── */

const BOKEH = [
  { x: 12, y: 14, s: 90, c: "rgba(255,170,90,0.55)", t: 9 },
  { x: 70, y: 8, s: 120, c: "rgba(255,120,70,0.4)", t: 12 },
  { x: 42, y: 30, s: 70, c: "rgba(255,210,150,0.35)", t: 8 },
  { x: 85, y: 34, s: 80, c: "rgba(190,40,60,0.45)", t: 11 },
  { x: 6, y: 48, s: 110, c: "rgba(200,60,50,0.35)", t: 13 },
  { x: 58, y: 52, s: 60, c: "rgba(255,190,120,0.4)", t: 7 },
  { x: 28, y: 62, s: 140, c: "rgba(120,30,40,0.5)", t: 14 },
  { x: 78, y: 70, s: 100, c: "rgba(255,140,80,0.3)", t: 10 },
];

export function BarScene() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#2b1410_0%,#130807_48%,#060303_100%)]">
      {BOKEH.map((b, i) => (
        <span
          key={i}
          className="bokeh absolute rounded-full"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, background: `radial-gradient(circle, ${b.c} 0%, transparent 68%)`, animationDuration: `${b.t}s`, animationDelay: `${-i * 1.7}s` }}
        />
      ))}
      {/* Bar top: a soft line of reflected light */}
      <div className="absolute inset-x-0 top-[78%] h-px bg-gradient-to-r from-transparent via-[rgba(255,170,110,0.35)] to-transparent" />
      <div className="absolute inset-x-0 top-[78%] h-24 bg-gradient-to-b from-[rgba(255,140,80,0.08)] to-transparent" />
    </div>
  );
}

/* ── Stages: two lights, closer at every stage ──────────────── */

const STAGE_GAP = { before: 30, dating: 15, together: 5 } as const;

export function StageArt({ stage }: { stage: keyof typeof STAGE_GAP }) {
  const gap = STAGE_GAP[stage];
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_70%_at_50%_30%,#17110f_0%,#0b0a0a_60%,#070707_100%)]">
      {stage !== "before" && (
        <div
          className="absolute top-[34%] h-px -translate-y-1/2"
          style={{ left: `${50 - gap}%`, right: `${50 - gap}%`, background: "linear-gradient(90deg, rgba(109,137,247,0.6), rgba(255,107,71,0.6))", boxShadow: "0 0 12px rgba(255,140,100,0.5)" }}
        />
      )}
      {stage === "before" && <div className="absolute top-[34%] h-px -translate-y-1/2 border-t border-dashed border-white/15" style={{ left: `${50 - gap}%`, right: `${50 - gap}%` }} />}
      {stage === "together" && <div className="absolute left-1/2 top-[34%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,120,90,0.35),transparent_65%)]" />}
      <span className="stage-orb absolute top-[34%] -ml-12 -mt-12 h-24 w-24 rounded-full mix-blend-screen" style={{ left: `${50 - gap}%`, background: "radial-gradient(circle, rgba(140,160,255,0.95) 0%, rgba(109,137,247,0.45) 30%, transparent 68%)" }} />
      <span className="stage-orb absolute top-[34%] -ml-12 -mt-12 h-24 w-24 rounded-full mix-blend-screen" style={{ left: `${50 + gap}%`, background: "radial-gradient(circle, rgba(255,170,140,0.95) 0%, rgba(255,107,71,0.45) 30%, transparent 68%)", animationDelay: "-3s" }} />
    </div>
  );
}
