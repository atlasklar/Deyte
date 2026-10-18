"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronRight, Clock, MessageSquareText, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/lib/store";
import { stageLabel, type MemorySource, type SelfCategory, type SelfMemoryItem } from "@/lib/types";
import { formatDate, nowIso, uid } from "@/lib/util";
import { Group, IconTile, RowButton, Segmented, type Tint } from "@/components/ui/List";
import { Button, Chip, PersonAvatar, Textarea } from "@/components/ui/primitives";
import { Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

const GROUPS: { id: SelfCategory; title: string; icon: typeof Target; tint: Tint }[] = [
  { id: "goal", title: "Goals", icon: Target, tint: "ember" },
  { id: "style", title: "How you communicate", icon: MessageSquareText, tint: "blue" },
  { id: "voice", title: "Your writing voice", icon: Brain, tint: "violet" },
  { id: "context", title: "Life & schedule", icon: Clock, tint: "amber" },
];

const SOURCE: Record<MemorySource, string> = {
  you: "You told me",
  onboarding: "From setup",
  approved: "You approved",
  learned: "Learned from your edits",
};

export default function MemoryPage() {
  const { data, mutate } = useAccount();
  const toast = useToast();
  const [tab, setTab] = useState<"you" | "people">("you");
  const [editing, setEditing] = useState<SelfMemoryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const s = data.subscription;
  const facts = data.people.reduce((n, p) => n + p.facts.length + p.reads.length, 0);

  const status =
    s.status === "paused" ? "Paused — kept exactly as it is until you resume." : s.status === "canceled" ? `Resets on ${formatDate(s.periodEnd, { month: "long", day: "numeric" })} when your access ends.` : "Private to you. Never used to coach anyone else.";

  return (
    <Page>
      <header className="pt-safe pb-4 pt-5 md:pt-9">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">Memory</h1>
      </header>

      {/* Highlight */}
      <section className="overflow-hidden rounded-[18px] border border-[#ff6b47]/15 bg-[linear-gradient(160deg,#1d1512,#121112_60%)] px-5 pb-5 pt-6 text-center">
        <p className="text-[21px] font-semibold leading-tight tracking-[-0.03em] text-fg">Your coach knows your story</p>
        <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-fg-muted">Goals, how you text, the people in your life — so you never have to explain twice.</p>
        <Button variant="bronze" className="mt-5 w-full" onClick={() => setAdding(true)}>
          Add to memory
        </Button>
        <div className="mt-4 grid grid-cols-3 gap-2 text-left">
          {[
            ["About you", data.self.length],
            ["People", data.people.length],
            ["Saved facts", facts],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[11px] bg-white/[0.04] px-3 py-2.5">
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-fg">{v}</p>
              <p className="text-[11.5px] text-fg-subtle">{k}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-3 px-1 text-[12px] text-fg-faint">{status}</p>

      <div className="mt-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "you", label: "About you" },
            { id: "people", label: "People" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "you" ? (
          <motion.div key="you" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="mt-5 flex flex-col gap-5">
            {GROUPS.map((g) => {
              const items = data.self.filter((x) => x.category === g.id);
              return (
                <Group key={g.id} title={`${g.title}${items.length ? ` (${items.length})` : ""}`}>
                  {items.length === 0 ? (
                    <RowButton onClick={() => setAdding(true)} icon={<IconTile icon={g.icon} tint="gray" />} label={<span className="text-fg-subtle">Nothing yet</span>} sub="Tap to add" />
                  ) : (
                    items.map((it) => (
                      <RowButton key={it.id} onClick={() => setEditing(it)} icon={<IconTile icon={g.icon} tint={g.tint} />} label={<span className="whitespace-normal">{it.text}</span>} sub={`${SOURCE[it.source]} · ${formatDate(it.createdAt)}`} />
                    ))
                  )}
                </Group>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="people" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="mt-5 flex flex-col gap-2.5">
            {data.people.length === 0 && (
              <div className="card px-4 py-8 text-center">
                <p className="text-[14.5px] font-medium text-fg">No one yet</p>
                <p className="mt-1 text-[13px] text-fg-subtle">Set someone up and the coach keeps her history here.</p>
                <Link href="/app/people/new" className="mt-4 inline-flex h-9 items-center rounded-[10px] bg-white px-4 text-[13.5px] font-medium text-black">
                  Add someone
                </Link>
              </div>
            )}
            {data.people.map((p) => (
              <Link key={p.id} href={`/app/people/${p.id}`} className="card block px-4 py-3.5 transition-colors hover:bg-ink-850">
                <div className="flex items-center gap-3">
                  <PersonAvatar id={p.id} name={p.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-fg">{p.name}</p>
                    <p className="text-[12px] text-fg-subtle">
                      {stageLabel(p.stage)} · {p.facts.length} facts · {p.reads.length} reads
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-fg-faint" />
                </div>
                {(p.facts.length > 0 || p.profile?.concerns.length) && (
                  <ul className="mt-3 flex flex-col gap-1 border-t border-[var(--line)] pt-3">
                    {p.facts.slice(0, 2).map((f) => (
                      <li key={f.id} className="flex gap-2 text-[13px] leading-snug text-fg-muted">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fg-subtle" />
                        {f.text}
                      </li>
                    ))}
                    {p.profile?.concerns[0] && (
                      <li className="flex gap-2 text-[13px] leading-snug text-fg-muted">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-bronze-400" />
                        On your mind: {p.profile.concerns[0].toLowerCase()}
                      </li>
                    )}
                  </ul>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pb-10">
        <Group>
          <RowButton onClick={() => setConfirm(true)} icon={<IconTile icon={Trash2} tint="red" />} label="Delete all memory" danger />
        </Group>
      </div>

      <EditSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(text) => {
          mutate((d) => (d.self = d.self.map((x) => (x.id === editing?.id ? { ...x, text } : x))));
          setEditing(null);
          toast("Memory updated");
        }}
        onDelete={() => {
          mutate((d) => (d.self = d.self.filter((x) => x.id !== editing?.id)));
          setEditing(null);
          toast("Deleted from memory");
        }}
      />

      <AddSheet
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(category, text) => {
          mutate((d) => d.self.push({ id: uid("mem"), category, text, source: "you", createdAt: nowIso() }));
          setAdding(false);
          setTab("you");
          toast("Added to memory");
        }}
      />

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete all memory?"
        subtitle={`Removes ${data.self.length} notes about you, ${data.people.length} people (${facts} saved items) and ${data.threads.length} conversations. Your account and plan stay. This can't be undone.`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                mutate((d) => {
                  d.self = [];
                  d.people = [];
                  d.threads = [];
                });
                setConfirm(false);
                toast("All memory deleted");
              }}
            >
              Delete everything
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </Page>
  );
}

function EditSheet({ item, onClose, onSave, onDelete }: { item: SelfMemoryItem | null; onClose: () => void; onSave: (t: string) => void; onDelete: () => void }) {
  const [text, setText] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (item && item.id !== lastId) {
    setLastId(item.id);
    setText(item.text);
  }
  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      title="Edit memory"
      subtitle={item ? `${SOURCE[item.source]} · ${formatDate(item.createdAt, { month: "long", day: "numeric" })}` : undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={15} /> Delete
          </Button>
          <Button variant="bronze" className="flex-1" disabled={!text.trim()} onClick={() => onSave(text.trim())}>
            Save
          </Button>
        </div>
      }
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={240} autoFocus />
    </Sheet>
  );
}

function AddSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (c: SelfCategory, t: string) => void }) {
  const [category, setCategory] = useState<SelfCategory>("goal");
  const [text, setText] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add to memory"
      subtitle="Something your coach should always keep in mind."
      footer={
        <Button
          variant="bronze"
          className="w-full"
          disabled={!text.trim()}
          onClick={() => {
            onAdd(category, text.trim());
            setText("");
          }}
        >
          Save to memory
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <Chip key={g.id} active={category === g.id} onClick={() => setCategory(g.id)}>
              {g.title}
            </Chip>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. I work late on weekdays, so weekend plans work best." maxLength={240} />
      </div>
    </Sheet>
  );
}
