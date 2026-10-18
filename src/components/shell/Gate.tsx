"use client";

import { useRouter } from "next/navigation";
import { AccountProvider } from "@/lib/store";

/** Account context for pages outside the app shell (onboarding). */
export function Gate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <AccountProvider fallback={<div className="min-h-dvh" />} onMissing={() => router.replace("/login")}>
      {children}
    </AccountProvider>
  );
}
