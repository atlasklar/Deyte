"use client";

import { useId } from "react";
import { cn } from "@/lib/util";

/**
 * The Deyte mark: two overlapping circles — two people — with the shared
 * space between them lit. That overlap is what the product reads.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <defs>
        <clipPath id={`l${id}`}>
          <circle cx="9" cy="12" r="7" />
        </clipPath>
        <linearGradient id={`g${id}`} x1="9" y1="5" x2="15" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9474" />
          <stop offset="1" stopColor="#FF5A36" />
        </linearGradient>
      </defs>
      <circle cx="9" cy="12" r="7" fill="currentColor" opacity="0.92" />
      <circle cx="15" cy="12" r="7" fill="currentColor" opacity="0.28" />
      <circle cx="15" cy="12" r="7" fill={`url(#g${id})`} clipPath={`url(#l${id})`} />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: [18, "text-[16px]"], md: [22, "text-[19px]"], lg: [28, "text-[24px]"] }[size] as [number, string];
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark size={s[0]} />
      <span className={cn("font-semibold leading-none tracking-[-0.045em]", s[1])}>deyte</span>
    </span>
  );
}
