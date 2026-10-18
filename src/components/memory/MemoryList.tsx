"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { MemoryItem, MemorySource } from "@/lib/types";
import { formatDate } from "@/lib/util";
import { Input } from "@/components/ui/primitives";

const SOURCE: Record<MemorySource, string> = {
  you: "You told me",
  onboarding: "From setup",
  approved: "You approved",
  learned: "Learned from your edits",
};

/** A reviewable, editable, deletable list of remembered items. */
export function MemoryList<T extends MemoryItem>({
  items,
  onEdit,
  onDelete,
  onAdd,
  addLabel = "Add",
  empty,
  extra,
  tone = "fact",
}: {
  items: T[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAdd?: (text: string) => void;
  addLabel?: string;
  empty?: string;
  extra?: (item: T) => React.ReactNode;
  tone?: "fact" | "read";
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col">
      {items.length === 0 && !adding && empty && <p className="px-1 py-3 text-[13.5px] text-fg-subtle">{empty}</p>}
      {items.map((item) => (
        <div key={item.id} className="group flex items-start gap-3 border-b border-[var(--line)] py-3 last:border-0">
          <span className={tone === "read" ? "mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full border border-sapphire-300/70" : "mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-bronze-300/80"} />
          {editing === item.id ? (
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) onEdit(item.id, value.trim());
                setEditing(null);
              }}
            >
              <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus className="h-10" maxLength={240} />
              <button type="submit" aria-label="Save" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-fg">
                <Check size={15} />
              </button>
              <button type="button" aria-label="Cancel" onClick={() => setEditing(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-subtle">
                <X size={15} />
              </button>
            </form>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className={tone === "read" ? "text-[14.5px] italic leading-relaxed text-fg-muted" : "text-[14.5px] leading-relaxed text-fg"}>{item.text}</p>
                <p className="mt-0.5 text-[11.5px] text-fg-faint">
                  {SOURCE[item.source]} · {formatDate(item.createdAt)}
                </p>
                {extra?.(item)}
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(item.id);
                    setValue(item.text);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-white/[0.05] hover:text-fg"
                >
                  <Pencil size={13.5} strokeWidth={1.6} />
                </button>
                <button type="button" aria-label="Delete" onClick={() => onDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={13.5} strokeWidth={1.6} />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      {onAdd &&
        (adding ? (
          <form
            className="flex items-center gap-2 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onAdd(draft.trim());
              setDraft("");
              setAdding(false);
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus placeholder="Something worth remembering" className="h-10" maxLength={240} />
            <button type="submit" aria-label="Add" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-fg">
              <Check size={15} />
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="mt-1 flex items-center gap-2 self-start rounded-full px-1 py-2 text-[13px] text-fg-subtle hover:text-fg">
            <Plus size={14} strokeWidth={1.8} /> {addLabel}
          </button>
        ))}
    </div>
  );
}
