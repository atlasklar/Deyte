import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/config/product";
import { Wordmark } from "@/components/ui/Wordmark";

/** Plain, readable layout for the privacy policy and terms. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[720px] px-5 pb-20">
      <header className="pt-safe flex h-16 items-center justify-between pt-3">
        <Link href="/" className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13.5px] text-fg-subtle hover:text-fg">
          <ChevronLeft size={16} /> Back
        </Link>
        <Link href="/">
          <Wordmark size="sm" />
        </Link>
        <span className="w-14" />
      </header>
      <h1 className="display mt-6 text-[30px] leading-tight text-fg">{title}</h1>
      <p className="mt-2 text-[13px] text-fg-subtle">Last updated {BRAND.legalUpdated}</p>
      <div className="legal mt-8 flex flex-col gap-4 text-[15px] leading-relaxed text-fg-muted">{children}</div>
      <footer className="mt-14 flex gap-4 border-t border-[var(--line)] pt-6 text-[13px] text-fg-subtle">
        <Link href="/privacy" className="hover:text-fg">Privacy</Link>
        <Link href="/terms" className="hover:text-fg">Terms</Link>
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
      </footer>
    </div>
  );
}

export function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-[17px] font-semibold tracking-[-0.01em] text-fg">{children}</h2>;
}

export function Contact() {
  return BRAND.supportEmail ? (
    <a href={`mailto:${BRAND.supportEmail}`} className="text-fg underline underline-offset-2">
      {BRAND.supportEmail}
    </a>
  ) : (
    <span>us through Account → Help &amp; FAQ</span>
  );
}
