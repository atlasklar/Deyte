"use client";

import Link from "next/link";
import { forwardRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { cn, initials, personHue } from "@/lib/util";

/* ── Buttons ────────────────────────────────────────────────── */

type Variant = "bronze" | "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // "bronze" is the one primary action on a screen: solid white, like most serious tools.
  bronze: "bg-white text-black hover:bg-white/90 active:bg-white/80",
  primary: "bg-white text-black hover:bg-white/90 active:bg-white/80",
  secondary: "bg-ink-800 text-fg border border-[var(--line-strong)] hover:bg-ink-700",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.05]",
  danger: "text-danger border border-danger/25 bg-danger/[0.06] hover:bg-danger/[0.1]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[9px]",
  md: "h-10 px-4 text-[14px] gap-2 rounded-[10px]",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-[12px]",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "focus-ring inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", onClick, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (variant === "bronze" || variant === "primary") haptic("light");
        onClick?.(e);
      }}
      {...props}
    />
  );
});

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({ className, label, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-fg-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

/* ── Chips ──────────────────────────────────────────────────── */

export function Chip({
  active,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(e) => {
        haptic("selection");
        onClick?.(e);
      }}
      className={cn(
        "focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors duration-150",
        active
          ? "border-white/80 bg-white text-black"
          : "border-[var(--line-strong)] bg-ink-850 text-fg-muted hover:border-white/20 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "bronze" | "sapphire" | "ok" | "warn" | "danger" }) {
  const tones = {
    neutral: "text-fg-muted border-[var(--line-strong)] bg-white/[0.03]",
    bronze: "text-bronze-200 border-bronze-300/30 bg-bronze-400/10",
    sapphire: "text-sapphire-200 border-sapphire-300/30 bg-sapphire-400/10",
    ok: "text-ok border-ok/30 bg-ok/10",
    warn: "text-warn border-warn/30 bg-warn/10",
    danger: "text-danger border-danger/30 bg-danger/10",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-[3px] text-[11px] font-medium leading-none", tones[tone], className)}
      {...props}
    />
  );
}

/* ── Fields ─────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-[10px] border border-[var(--line-strong)] bg-ink-900 px-3.5 text-fg placeholder:text-fg-faint transition-colors duration-150 focus:border-white/25 focus:outline-none focus:ring-4 focus:ring-white/[0.04]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-24 resize-none py-3 leading-relaxed", className)} {...props} />;
});

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-fg-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12.5px] text-fg-subtle">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic("selection");
        onChange(!checked);
      }}
      className="focus-ring flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2.5 text-left text-[14px] text-fg"
    >
      {label}
      <span className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200", checked ? "bg-bronze-400" : "bg-ink-600")}>
        <span className={cn("absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all duration-200 ease-[var(--ease-luxe)]", checked ? "left-[18px]" : "left-[2px]")} />
      </span>
    </button>
  );
}

/* ── People ─────────────────────────────────────────────────── */

export function PersonAvatar({ id, name, size = 40, className }: { id: string; name: string; size?: number; className?: string }) {
  const hue = personHue(id);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${hue} 32% 20%)`,
        color: `hsl(${hue} 70% 82%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 50% 60% / 0.18)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function Loader9({ className }: { className?: string }) {
  return (
    <div className={cn("loader-grid", className)} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${i * 75}ms` }} />
      ))}
    </div>
  );
}

/** The signed-in user's photo, or their initial on a warm gradient. */
export function UserAvatar({ name, src, size = 40, className }: { name: string; src?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff8a66] to-[#4c68e0] font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
      {src && failed !== src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(src)} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" draggable={false} />
      )}
    </span>
  );
}

/** The coach's picture (a still of the creature). */
export function CoachPic({ size = 32, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/coach.png" alt="" width={size} height={size} className={cn("shrink-0 select-none", className)} style={{ width: size, height: size }} draggable={false} />
  );
}
