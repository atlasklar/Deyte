import Link from "next/link";
import { cn } from "@/lib/util";

/** Shown when the Supabase keys haven't been added to the deployment yet. */
export function CloudSetup({ inline = false }: { inline?: boolean }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[440px] flex-col", inline ? "pb-10 pt-8" : "min-h-dvh justify-center px-6")}>
      <div className="card px-5 py-6">
        <p className="text-[16px] font-semibold tracking-[-0.02em] text-fg">Sign-in isn&apos;t connected yet</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          Accounts live in the cloud. Add your Supabase project&apos;s <span className="mono text-fg">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="mono text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to the deployment, then redeploy.
        </p>
        <p className="mt-3 text-[12.5px] text-fg-subtle">Step-by-step setup is in the project README under “Accounts &amp; cloud”.</p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-ink-800 px-4 text-[13.5px] text-fg hover:bg-ink-700">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
