"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { LIMITS } from "@/config/product";
import { useCoachActions } from "@/lib/actions";
import { useAccount } from "@/lib/store";
import { stageLabel, STAGES, type StageId } from "@/lib/types";
import { cn } from "@/lib/util";
import { Button, Chip, Field, Input, PersonAvatar, Textarea } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

export function PasteSheet({ open, onClose, onReview }: { open: boolean; onClose: () => void; onReview: (text: string) => void }) {
  const [text, setText] = useState("");
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const tooMany = lines > LIMITS.pastedLines;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Paste the messages"
      subtitle="Any format works. Lines like “Me: …” and “Her: …” are sorted automatically — you'll confirm who said what next."
      footer={
        <Button
          variant="bronze"
          className="w-full"
          disabled={!text.trim() || tooMany}
          onClick={() => {
            onReview(text);
            setText("");
          }}
        >
          Review the conversation
        </Button>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        placeholder={"Her: haha okay that's fair\nMe: told you\nHer: so what are you up to this weekend?"}
        className="min-h-56 font-[350]"
      />
      <p className={cn("mt-2 text-[12.5px]", tooMany ? "text-danger" : "text-fg-subtle")}>
        {lines} of {LIMITS.pastedLines} lines{tooMany ? " — trim it to the part that matters" : ""}
      </p>
    </Sheet>
  );
}

/** Choose who a conversation is about, or create a private profile on the spot. */
export function PersonPicker({
  open,
  onClose,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selected?: string;
  onSelect: (personId: string | undefined) => void;
}) {
  const { data } = useAccount();
  const { createPerson } = useCoachActions();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<StageId>("talking");

  return (
    <Sheet open={open} onClose={onClose} title="Who is this about?" subtitle="The coach keeps each person's history separate and private to you.">
      {!creating ? (
        <div className="flex flex-col gap-1.5">
          {data.people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex items-center gap-3 rounded-[11px] border px-3 py-3 text-left transition-colors",
                selected === p.id ? "border-[var(--line-strong)] bg-ink-800" : "border-transparent hover:bg-white/[0.04]",
              )}
            >
              <PersonAvatar id={p.id} name={p.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-fg">{p.name}</p>
                <p className="text-[12.5px] text-fg-subtle">
                  {stageLabel(p.stage)}
                  {p.metVia ? ` · ${p.metVia}` : ""}
                </p>
              </div>
              {selected === p.id && <Check size={16} className="text-fg" />}
            </button>
          ))}
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-3 rounded-[11px] px-3 py-3 text-left text-fg-muted hover:bg-white/[0.04] hover:text-fg">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--line-strong)]">
              <Plus size={17} strokeWidth={1.6} />
            </span>
            New person
          </button>
          {selected && (
            <Button variant="ghost" className="mt-2" onClick={() => onSelect(undefined)}>
              Not about anyone specific
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Field label="Name or nickname">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} placeholder="e.g. Maya" />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-muted">Relationship stage</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Chip key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Back
            </Button>
            <Button
              variant="bronze"
              className="flex-1"
              disabled={!name.trim()}
              onClick={() => {
                const id = createPerson({ name, stage });
                setCreating(false);
                setName("");
                onSelect(id);
              }}
            >
              Create profile
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
