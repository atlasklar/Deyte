"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/util";

/* iOS-style grouped lists: a quiet caption, then rows in one rounded box. */

const TINTS = {
  ember: "bg-[#ff6b47] text-white",
  blue: "bg-[#4c68e0] text-white",
  green: "bg-[#2fb36a] text-white",
  violet: "bg-[#8b5cf6] text-white",
  amber: "bg-[#e8a33d] text-white",
  gray: "bg-ink-500 text-white",
  red: "bg-[#e5484d] text-white",
} as const;

export type Tint = keyof typeof TINTS;

export function Group({ title, footer, children, className }: { title?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="mb-1.5 px-4 text-[12.5px] font-medium text-fg-subtle">{title}</h2>}
      <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[12px] leading-relaxed text-fg-faint">{footer}</p>}
    </section>
  );
}

export function IconTile({ icon: Icon, tint = "gray", size = 28 }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tint?: Tint; size?: number }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-[8px]", TINTS[tint])} style={{ width: size, height: size }}>
      <Icon size={size * 0.56} strokeWidth={2} />
    </span>
  );
}

type RowBase = {
  icon?: React.ReactNode;
  label: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  chevron?: boolean;
  danger?: boolean;
  className?: string;
};

function RowInner({ icon, label, sub, value, chevron, danger }: RowBase) {
  return (
    <>
      {icon}
      <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-[var(--line)] py-2.5 pr-3 group-last/row:border-0">
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[14.5px]", danger ? "text-danger" : "text-fg")}>{label}</span>
          {sub && <span className="mt-0.5 block truncate text-[12.5px] text-fg-subtle">{sub}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-[13.5px] text-fg-subtle">{value}</span>}
        {chevron && <ChevronRight size={16} className="shrink-0 text-fg-faint" />}
      </span>
    </>
  );
}

const rowClass = "group/row flex w-full min-h-[48px] items-center gap-3 pl-3.5 text-left transition-colors duration-100 active:bg-ink-800 hover:bg-ink-850";

export function RowLink({ href, ...rest }: RowBase & { href: string }) {
  return (
    <Link href={href} className={cn(rowClass, rest.className)}>
      <RowInner chevron {...rest} />
    </Link>
  );
}

export function RowButton({ onClick, ...rest }: RowBase & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(rowClass, rest.className)}>
      <RowInner {...rest} />
    </button>
  );
}

export function Row({ children, ...rest }: RowBase & { children?: React.ReactNode }) {
  return (
    <div className={cn("group/row flex w-full min-h-[48px] items-center gap-3 pl-3.5", rest.className)}>
      <RowInner {...rest} />
      {children}
    </div>
  );
}

/** Segmented control (iOS style) with a sliding thumb. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="relative grid rounded-[10px] bg-ink-800 p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        className="absolute bottom-[3px] top-[3px] rounded-[8px] bg-ink-600 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-[var(--ease-luxe)]"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${i * 100}%)`, left: 3 }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn("relative z-10 h-8 rounded-[8px] text-[13px] font-medium transition-colors duration-200", value === o.id ? "text-fg" : "text-fg-subtle")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A setting with a description and an iOS switch. */
export function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="group/row flex w-full items-center gap-3 px-4 text-left active:bg-ink-800">
      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-[var(--line)] py-3 group-last/row:border-0">
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] text-fg">{label}</span>
          {sub && <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-subtle">{sub}</span>}
        </span>
        <span className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200", checked ? "bg-[#2fb36a]" : "bg-ink-600")}>
          <span className={cn("absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 ease-[var(--ease-luxe)]", checked ? "left-[20px]" : "left-[2px]")} />
        </span>
      </span>
    </button>
  );
}
