"use client";

import { useRef } from "react";
import { cn } from "@/lib/util";
import { ORB_FRAGMENT } from "./shaders";
import { useShaderCanvas } from "./useShaderCanvas";

export type OrbState = "idle" | "listening" | "thinking";

const ENERGY: Record<OrbState, number> = { idle: 0.08, listening: 0.45, thinking: 1 };

/**
 * The coach's presence: a softly glowing liquid sphere. Energy eases between
 * states so typing and thinking feel alive without ever jumping.
 */
export function Orb({
  state = "idle",
  mix = 0.35,
  className,
}: {
  state?: OrbState;
  /** 0 bronze → 1 sapphire */
  mix?: number;
  className?: string;
}) {
  const energy = useRef(ENERGY.idle);
  const target = useRef(ENERGY[state]);
  target.current = ENERGY[state];
  const mixRef = useRef(mix);
  const mixTarget = useRef(mix);
  mixTarget.current = mix;

  const canvasRef = useShaderCanvas(ORB_FRAGMENT, {
    scale: 0.75,
    onFrame: (u) => {
      energy.current += (target.current - energy.current) * 0.04;
      mixRef.current += (mixTarget.current - mixRef.current) * 0.03;
      u.uEnergy = energy.current;
      u.uMix = mixRef.current;
    },
  });

  return (
    <div className={cn("orb relative aspect-square", className)} data-state={state} aria-hidden>
      <div className="orb-fallback absolute inset-[18%] rounded-full" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
