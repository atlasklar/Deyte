"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/util";
import { ORB_FRAGMENT } from "./shaders";
import { useShaderCanvas } from "./useShaderCanvas";

export type OrbState = "idle" | "listening" | "thinking";

const ENERGY: Record<OrbState, number> = { idle: 0.1, listening: 0.4, thinking: 1 };

/**
 * The coach's creature. It breathes and drifts, blinks at natural intervals,
 * glances around, follows your finger or cursor, looks down at the box while
 * you type and narrows its eyes in thought while it works.
 */
export function Orb({
  state = "idle",
  mix = 0.35,
  className,
}: {
  state?: OrbState;
  /** 0 ember → 1 sapphire */
  mix?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const live = useRef({
    state,
    mix,
    energy: ENERGY.idle,
    mixNow: mix,
    look: [0, 0] as [number, number],
    lookTarget: [0, 0] as [number, number],
    pointerAt: -1e9,
    nextGlance: 2,
    open: 1,
    nextBlink: 2.5,
    blinkStart: -1,
    doubleBlink: false,
    squint: 0,
  });
  live.current.state = state;
  live.current.mix = mix;

  // Follow the pointer / finger, relative to where the creature sits on screen.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45);
      const y = -(e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.45);
      live.current.lookTarget = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
      live.current.pointerAt = performance.now() / 1000;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  const canvasRef = useShaderCanvas(ORB_FRAGMENT, {
    scale: 0.75,
    onFrame: (u, t) => {
      const s = live.current;
      const now = performance.now() / 1000;

      // Where to look
      let target = s.lookTarget;
      if (s.state === "listening") target = [0, -0.85];
      else if (s.state === "thinking") target = [0.55 + 0.25 * Math.sin(t * 1.3), 0.6 + 0.15 * Math.cos(t * 0.9)];
      else if (now - s.pointerAt > 3) {
        if (t > s.nextGlance) {
          s.lookTarget = [(Math.random() * 2 - 1) * 0.8, (Math.random() * 2 - 1) * 0.5];
          if (Math.random() < 0.35) s.lookTarget = [0, 0];
          s.nextGlance = t + 1.8 + Math.random() * 3;
        }
        target = s.lookTarget;
      }
      const k = s.state === "thinking" ? 0.06 : 0.12;
      s.look[0] += (target[0] - s.look[0]) * k;
      s.look[1] += (target[1] - s.look[1]) * k;

      // Blinks: ~140 ms, every 2.5–6 s, sometimes twice
      if (s.blinkStart < 0 && t > s.nextBlink) {
        s.blinkStart = t;
        s.doubleBlink = Math.random() < 0.22;
      }
      if (s.blinkStart >= 0) {
        const b = (t - s.blinkStart) / 0.15;
        s.open = b < 1 ? Math.abs(1 - 2 * b) : 1;
        if (b >= 1) {
          if (s.doubleBlink) {
            s.blinkStart = t + 0.08;
            s.doubleBlink = false;
          } else {
            s.blinkStart = -1;
            s.nextBlink = t + 2.5 + Math.random() * 3.5;
          }
        }
      }
      const wide = s.state === "listening" ? 1.12 : 1;

      s.energy += (ENERGY[s.state] - s.energy) * 0.04;
      s.mixNow += (s.mix - s.mixNow) * 0.03;
      s.squint += ((s.state === "thinking" ? 0.5 : 0) - s.squint) * 0.08;

      u.uEnergy = s.energy;
      u.uMix = s.mixNow;
      u.uLook = [s.look[0], s.look[1]];
      u.uOpen = s.open * wide;
      u.uSquint = s.squint;
    },
  });

  return (
    <div ref={wrap} className={cn("orb relative aspect-square", className)} data-state={state} aria-hidden>
      <div className="orb-fallback absolute inset-[18%] rounded-full" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
