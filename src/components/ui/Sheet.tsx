"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/util";
import { IconButton } from "./primitives";

/**
 * Bottom sheet on phones (drag down to close), centred panel on larger screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "full";
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissible && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panel.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose, dismissible]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-t-[18px] border border-[var(--line-strong)] outline-none md:rounded-[18px]",
              size === "md" && "max-h-[88dvh] md:max-w-[520px]",
              size === "lg" && "max-h-[92dvh] md:max-w-[640px]",
              size === "full" && "h-[94dvh] md:h-[86dvh] md:max-w-[680px]",
            )}
            style={{ background: "#121214" }}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 38, stiffness: 420, mass: 0.8 }}
            drag={dismissible ? "y" : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="shrink-0 touch-none pt-2.5 md:pt-0" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1 w-10 rounded-full bg-white/15 md:hidden" />
              {(title || dismissible) && (
                <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 md:px-6 md:pt-5">
                  <div className="min-w-0">
                    {title && <h2 className="display text-[19px] leading-tight text-fg">{title}</h2>}
                    {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-subtle">{subtitle}</p>}
                  </div>
                  {dismissible && (
                    <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
                      <X size={18} strokeWidth={1.6} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 md:px-6 md:pb-6">{children}</div>
            {footer && <div className="shrink-0 border-t border-[var(--line)] px-4 pt-3 md:px-6" style={{ paddingBottom: "calc(var(--safe-bottom) + 14px)" }}>{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
