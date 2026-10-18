"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BRAND } from "@/config/product";
import { haptic, setHapticsEnabled } from "@/lib/haptics";
import { AccountProvider, useAccount } from "@/lib/store";
import { cn } from "@/lib/util";
import { Wordmark } from "@/components/ui/Wordmark";
import { isActive, NAV } from "./nav";
import { StatusBanner } from "./StatusBanner";

function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[720px] flex-col gap-3 px-4 pt-20">
      <div className="skeleton h-7 w-40 rounded-lg" />
      <div className="skeleton h-28 w-full rounded-[11px]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton h-20 rounded-[11px]" />
        <div className="skeleton h-20 rounded-[11px]" />
      </div>
    </div>
  );
}

/** Mirrors the Haptics preference into the haptics helper. */
function HapticsSync() {
  const { data } = useAccount();
  const on = data.prefs?.haptics ?? true;
  useEffect(() => setHapticsEnabled(on), [on]);
  return null;
}

/** Each tab opens at the top, instantly — no carried-over scroll, no sliding highlight. */
function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const immersive = pathname.startsWith("/app/chat/") || pathname === "/app/people/new";

  return (
    <AccountProvider fallback={<Loading />} onMissing={() => router.replace("/login")}>
      <ScrollReset />
      <HapticsSync />
      <div className="relative min-h-dvh md:pl-[232px]">
        {/* Desktop rail */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--line)] bg-ink-950 px-3 py-5 md:flex">
          <Link href="/app" className="mb-8 px-2.5">
            <Wordmark size="sm" />
          </Link>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, "exact" in item && item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] transition-colors duration-100",
                    active ? "bg-ink-800 text-fg" : "text-fg-subtle hover:bg-ink-850 hover:text-fg-muted",
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-auto px-2.5 text-[11.5px] leading-relaxed text-fg-faint">
            {BRAND.name} reads what you share. It can&apos;t know what anyone else thinks.
          </p>
        </aside>

        <StatusBanner />
        <main className={cn(!immersive && "pb-[calc(76px+var(--safe-bottom))] md:pb-10")}>{children}</main>

        {/* Phone tab bar: fixed, opaque, no animated pill — taps switch instantly */}
        {!immersive && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-ink-950/95 backdrop-blur-xl md:hidden"
            style={{ paddingBottom: "var(--safe-bottom)" }}
          >
            <div className="mx-auto flex h-[60px] max-w-[520px] items-stretch">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href, "exact" in item && item.exact);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-1 flex-col items-center justify-center gap-[3px] active:opacity-60"
                    aria-current={active ? "page" : undefined}
                    onClick={() => !active && haptic("selection")}
                  >
                    <Icon size={21} strokeWidth={active ? 2 : 1.6} className={active ? "text-fg" : "text-fg-faint"} />
                    <span className={cn("text-[10.5px] font-medium", active ? "text-fg" : "text-fg-faint")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </AccountProvider>
  );
}
