import Link from "next/link";
import { Orb } from "@/components/orb/Orb";
import { Wordmark } from "@/components/ui/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[460px] flex-col px-5">
      <header className="pt-safe flex h-16 items-center justify-center pt-4">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <Orb className="mx-auto -mb-10 -mt-4 w-[min(56vw,220px)]" />
      {children}
    </div>
  );
}
