"use client";

import { useRouter } from "next/navigation";
import { formatPrice } from "@/config/product";
import { subscription, useAccount } from "@/lib/store";
import { Orb } from "@/components/orb/Orb";
import { Button } from "@/components/ui/primitives";

/** Shown after a canceled plan's access window closes: memory has been reset. */
export function EndedScreen() {
  const { data, mutate } = useAccount();
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center px-6 text-center">
      <Orb className="w-[220px]" mix={0.8} />
      <h1 className="display mt-2 text-[26px] leading-tight text-fg">Welcome back, {data.profile.name}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
        Your subscription ended, so your personal memory was reset as described when you canceled. Nothing from before is kept — you start fresh.
      </p>
      <Button
        variant="bronze"
        size="lg"
        className="mt-6 w-full"
        onClick={() => {
          mutate((d) => subscription.restart(d));
          router.push("/onboarding");
        }}
      >
        Start again · {formatPrice(data.subscription.price)}/month
      </Button>
      <p className="mt-3 text-[12px] text-fg-subtle">Demo billing — no payment is taken.</p>
    </div>
  );
}
