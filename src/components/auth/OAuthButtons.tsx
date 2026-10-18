"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { callbackUrl, supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/util";

function AppleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
      <path d="M14.2 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM11.6 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5Z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5Z" />
    </svg>
  );
}

/** "Continue with Apple / Google". Each provider must be switched on in Supabase. */
export function OAuthButtons({ next = "/app", onError }: { next?: string; onError: (m: string) => void }) {
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  const go = async (provider: "apple" | "google") => {
    haptic("light");
    setBusy(provider);
    const { error } = await supabase().auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl(next) } });
    if (error) {
      setBusy(null);
      onError(error.message.includes("not enabled") ? `${provider === "apple" ? "Apple" : "Google"} sign-in isn't switched on yet.` : error.message);
    }
  };

  const base = "flex h-12 w-full items-center justify-center gap-2.5 rounded-[12px] text-[15px] font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-60";
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={Boolean(busy)} onClick={() => go("apple")} className={cn(base, "bg-white text-black hover:bg-white/90")}>
        <AppleLogo /> {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
      </button>
      <button type="button" disabled={Boolean(busy)} onClick={() => go("google")} className={cn(base, "border border-[var(--line-strong)] bg-ink-850 text-fg hover:bg-ink-800")}>
        <GoogleLogo /> {busy === "google" ? "Opening Google…" : "Continue with Google"}
      </button>
    </div>
  );
}
