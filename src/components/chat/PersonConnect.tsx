"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Plus, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/store";
import { stageLabel } from "@/lib/types";
import { cn, relativeTime } from "@/lib/util";
import { PersonAvatar } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

const spring = { type: "spring", stiffness: 520, damping: 30, mass: 0.7 } as const;

/** The person chip inside the composer: connect, switch or disconnect. */
export function PersonChip({ personId, onOpen, onClear, compact }: { personId?: string; onOpen: () => void; onClear: () => void; compact?: boolean }) {
  const { data } = useAccount();
  const person = data.people.find((p) => p.id === personId);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {person ? (
        <motion.div
          key={person.id}
          layout
          initial={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.7, filter: "blur(4px)" }}
          transition={spring}
          className="flex h-8 items-center rounded-full border border-[var(--line-strong)] bg-ink-800 pl-1 pr-0.5"
        >
          <button type="button" onClick={onOpen} className="flex items-center gap-1.5 pr-1" aria-label={`Connected to ${person.name}. Change`}>
            <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.05 }}>
              <PersonAvatar id={person.id} name={person.name} size={22} />
            </motion.span>
            <span className="text-[12.5px] font-medium text-fg">{person.name}</span>
          </button>
          <button type="button" onClick={onClear} aria-label="Disconnect" className="flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle hover:bg-white/[0.06] hover:text-fg">
            <X size={12} strokeWidth={2.2} />
          </button>
        </motion.div>
      ) : (
        <motion.button
          key="connect"
          layout
          type="button"
          onClick={onOpen}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring}
          className="focus-ring flex h-8 items-center gap-1.5 rounded-full border border-dashed border-[var(--line-strong)] px-2.5 text-[12.5px] text-fg-subtle transition-colors hover:border-white/25 hover:text-fg"
        >
          <UserPlus size={14} strokeWidth={1.9} />
          {!compact && "Connect person"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** Choose which of your people this conversation is about. New people are set up in their own flow. */
export function PersonSheet({
  open,
  onClose,
  selected,
  onSelect,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  selected?: string;
  onSelect: (id: string | undefined) => void;
  returnTo: string;
}) {
  const { data } = useAccount();
  const router = useRouter();
  const people = data.people.filter((p) => p.stage !== "ended");

  return (
    <Sheet open={open} onClose={onClose} title="Connect a person" subtitle="Your coach brings in everything it knows about her — no need to explain again.">
      {people.length > 0 && (
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          {people.map((p, i) => {
            const active = selected === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                onClick={() => {
                  if ("vibrate" in navigator) navigator.vibrate?.(8);
                  onSelect(p.id);
                }}
                className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors", active ? "bg-ink-800" : "hover:bg-ink-850")}
              >
                <PersonAvatar id={p.id} name={p.name} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-fg">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-fg-subtle">
                    {stageLabel(p.stage)}
                    {p.profile?.concerns[0] ? ` · ${p.profile.concerns[0]}` : ""} · {relativeTime(p.updatedAt)}
                  </span>
                </span>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border transition-colors", active ? "border-white bg-white text-black" : "border-[var(--line-strong)]")}>
                  {active && <Check size={12} strokeWidth={3} />}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {people.length === 0 && (
        <div className="card px-4 py-6 text-center">
          <p className="text-[14.5px] font-medium text-fg">No one set up yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-subtle">Add her once — stage, what you want, what&apos;s on your mind — and connect her to any chat.</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push(`/app/people/new?return=${encodeURIComponent(returnTo)}`)}
        className="card mt-2.5 flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink-850"
      >
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white text-black">
          <Plus size={18} strokeWidth={2.2} />
        </span>
        <span className="flex-1">
          <span className="block text-[14.5px] font-medium text-fg">Set up someone new</span>
          <span className="block text-[12.5px] text-fg-subtle">A few quick questions, then she&apos;s connected</span>
        </span>
        <ChevronRight size={16} className="text-fg-faint" />
      </button>
    </Sheet>
  );
}
