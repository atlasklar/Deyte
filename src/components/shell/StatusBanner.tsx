"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAccount } from "@/lib/store";
import { formatDate } from "@/lib/util";

/** One quiet line about the plan when it isn't simply active. */
export function StatusBanner() {
  const { data } = useAccount();
  const s = data.subscription;
  if (s.status !== "paused" && s.status !== "canceled") return null;
  const paused = s.status === "paused";

  return (
    <div className="pt-safe sticky top-0 z-30 border-b border-[var(--line)] bg-ink-950/95 backdrop-blur-xl">
      <Link href="/app/account/plan" className="mx-auto flex max-w-[720px] items-center gap-2.5 px-4 py-2 text-[12.5px] md:px-8">
        <span className={paused ? "h-1.5 w-1.5 shrink-0 rounded-full bg-sapphire-300" : "h-1.5 w-1.5 shrink-0 rounded-full bg-warn"} />
        <span className="min-w-0 flex-1 truncate text-fg-muted">
          {paused ? `Paused until ${formatDate(s.resumeOn!)} · memory kept` : `Access ends ${formatDate(s.periodEnd)} · memory resets then`}
        </span>
        <span className="flex shrink-0 items-center font-medium text-fg">
          {paused ? "Resume" : "Keep plan"}
          <ChevronRight size={14} />
        </span>
      </Link>
    </div>
  );
}
