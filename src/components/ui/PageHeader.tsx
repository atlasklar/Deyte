import { cn } from "@/lib/util";

export function PageHeader({ title, subtitle, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("pt-safe flex items-end justify-between gap-4 pb-5 pt-5 md:pt-9", className)}>
      <div className="min-w-0">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] leading-relaxed text-fg-subtle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[720px] px-4 md:px-8", className)}>{children}</div>;
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--line)] bg-ink-850 text-fg-subtle">{icon}</span>
      <p className="text-[14.5px] font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[320px] text-[13px] leading-relaxed text-fg-subtle">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
