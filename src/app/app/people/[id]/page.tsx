"use client";

import { ChevronLeft, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { previewOf, threadsFor, useCoachActions } from "@/lib/actions";
import { useAccount } from "@/lib/store";
import { stageLabel, STAGES, type MemoryItem, type Person } from "@/lib/types";
import { cn, formatDate, nowIso, relativeTime, uid } from "@/lib/util";
import { MemoryList } from "@/components/memory/MemoryList";
import { Button, ButtonLink, Chip, Field, IconButton, Input, PersonAvatar, SectionTitle } from "@/components/ui/primitives";
import { Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, mutate } = useAccount();
  const { startThread } = useCoachActions();
  const person = data.people.find((p) => p.id === id);
  const [stageOpen, setStageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!person) {
    return (
      <Page className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="display text-[22px]">Profile not found</p>
        <ButtonLink href="/app/people">Back to people</ButtonLink>
      </Page>
    );
  }

  const edit = (fn: (p: Person) => void) =>
    mutate((d) => {
      const p = d.people.find((x) => x.id === person.id);
      if (p) {
        fn(p);
        p.updatedAt = nowIso();
      }
    });

  const listOps = (key: "facts" | "reads") => ({
    onEdit: (itemId: string, text: string) => edit((p) => (p[key] = p[key].map((i) => (i.id === itemId ? { ...i, text } : i)))),
    onDelete: (itemId: string) => {
      edit((p) => (p[key] = p[key].filter((i) => i.id !== itemId)));
      toast("Deleted from memory");
    },
  });

  const chats = threadsFor(data, person.id);
  const timeline = [...person.timeline].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Page>
      <div className="pt-safe flex items-center justify-between pt-3 md:pt-8">
        <IconButton label="Back" onClick={() => router.push("/app/people")} className="-ml-2">
          <ChevronLeft size={21} strokeWidth={1.6} />
        </IconButton>
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      <section className="flex flex-col items-center pb-8 pt-2 text-center">
        <PersonAvatar id={person.id} name={person.name} size={84} />
        <h1 className="display mt-3 text-[26px] leading-none">{person.name}</h1>
        <button type="button" onClick={() => setStageOpen(true)} className="mt-2.5 rounded-full border border-[var(--line-strong)] bg-ink-800 px-3 py-1 text-[12.5px] text-fg">
          {stageLabel(person.stage)} · change
        </button>
        <p className="mt-3 text-[13px] text-fg-subtle">
          {person.metVia ? `${person.metVia} · ` : ""}Since {formatDate(person.createdAt, { month: "long", day: "numeric" })}
        </p>
        {person.note && <p className="mt-2 max-w-[420px] text-[14px] leading-relaxed text-fg-muted">{person.note}</p>}
        <Button
          variant="bronze"
          className="mt-6"
          onClick={() => router.push(`/app/chat/${startThread({ intent: "open", personId: person.id })}`)}
        >
          <MessageCircle size={16} strokeWidth={1.7} />
          New update about {person.name}
        </Button>
      </section>

      <div className="flex flex-col gap-8 pb-10">
        <section>
          <SectionTitle>Facts you&apos;ve confirmed</SectionTitle>
          <div className="card px-4 py-1.5">
            <MemoryList
              items={person.facts}
              {...listOps("facts")}
              onAdd={(text) => edit((p) => p.facts.push({ id: uid("mem"), text, source: "you", createdAt: nowIso() }))}
              addLabel="Add a fact"
              empty="Nothing saved yet. Facts you approve after a review show up here."
            />
          </div>
        </section>

        <section>
          <SectionTitle>Unconfirmed reads</SectionTitle>
          <div className="card px-4 py-1.5">
            <MemoryList<MemoryItem>
              tone="read"
              items={person.reads}
              {...listOps("reads")}
              empty="No interpretations saved. These are kept apart from facts on purpose."
              extra={(item) => (
                <button
                  type="button"
                  onClick={() => {
                    edit((p) => {
                      p.reads = p.reads.filter((r) => r.id !== item.id);
                      p.facts.push({ ...item, source: "approved", createdAt: nowIso() });
                    });
                    toast("Moved to facts");
                  }}
                  className="mt-1.5 text-[12px] text-sapphire-200 hover:text-sapphire-300"
                >
                  She confirmed this — make it a fact
                </button>
              )}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Timeline</SectionTitle>
          <ol className="card relative px-4 py-3">
            {timeline.map((ev, i) => {
              const inner = (
                <>
                  <span className={cn("absolute left-[22px] top-0 w-px bg-[var(--line-strong)]", i === 0 ? "top-5" : "", i === timeline.length - 1 ? "h-5" : "h-full")} />
                  <span className={cn("relative z-10 mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full border", ev.kind === "review" ? "border-bronze-400 bg-bronze-400" : "border-fg-subtle bg-ink-850")} />
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-[14.5px] text-fg">{ev.title}</p>
                    {ev.detail && <p className="text-[13px] text-fg-subtle">{ev.detail}</p>}
                  </div>
                  <span className="shrink-0 text-[11.5px] text-fg-faint">{formatDate(ev.at)}</span>
                </>
              );
              return (
                <li key={ev.id} className="relative">
                  {ev.threadId && data.threads.some((t) => t.id === ev.threadId) ? (
                    <Link href={`/app/chat/${ev.threadId}`} className="relative flex gap-3.5 rounded-xl py-2.5 pl-1.5 hover:bg-white/[0.02]">
                      {inner}
                    </Link>
                  ) : (
                    <div className="relative flex gap-3.5 py-2.5 pl-1.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {chats.length > 0 && (
          <section>
            <SectionTitle>Conversations</SectionTitle>
            <div className="flex flex-col gap-2">
              {chats.map((t) => (
                <Link key={t.id} href={`/app/chat/${t.id}`} className="card flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 hover:border-[var(--line-strong)]">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] text-fg">{t.title}</p>
                    <p className="truncate text-[12.5px] text-fg-subtle">{previewOf(t)}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-fg-faint">{relativeTime(t.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="card px-4 py-4">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2.5 text-[14px] text-danger">
              <Trash2 size={15} strokeWidth={1.6} /> Delete {person.name} and her history
            </button>
          ) : (
            <div>
              <p className="text-[14px] leading-relaxed text-fg">
                This permanently deletes {person.name}&apos;s profile, {person.facts.length + person.reads.length} saved items and {chats.length} conversation{chats.length === 1 ? "" : "s"}. It can&apos;t be undone.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    mutate((d) => {
                      d.people = d.people.filter((p) => p.id !== person.id);
                      d.threads = d.threads.filter((t) => t.personId !== person.id);
                    });
                    toast(`${person.name} deleted`);
                    router.replace("/app/people");
                  }}
                >
                  Delete permanently
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Sheet open={stageOpen} onClose={() => setStageOpen(false)} title="Where are things?" subtitle="The coach adjusts its advice to the stage.">
        <div className="flex flex-col gap-1">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id !== person.stage) edit((p) => {
                  p.stage = s.id;
                  p.timeline.push({ id: uid("ev"), at: nowIso(), kind: "stage", title: `Stage → ${s.label}` });
                });
                setStageOpen(false);
              }}
              className={cn("flex items-center justify-between rounded-[11px] px-4 py-3 text-left transition-colors", person.stage === s.id ? "bg-ink-800 text-fg" : "hover:bg-white/[0.04]")}
            >
              <span>
                <span className="block text-[15px]">{s.label}</span>
                <span className="block text-[12.5px] text-fg-subtle">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      <EditSheet open={editOpen} onClose={() => setEditOpen(false)} person={person} onSave={(patch) => edit((p) => Object.assign(p, patch))} />
    </Page>
  );
}

function EditSheet({ open, onClose, person, onSave }: { open: boolean; onClose: () => void; person: Person; onSave: (p: Partial<Person>) => void }) {
  const [name, setName] = useState(person.name);
  const [metVia, setMetVia] = useState(person.metVia ?? "");
  const [note, setNote] = useState(person.note ?? "");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <Button
          variant="bronze"
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            onSave({ name: name.trim(), metVia: metVia.trim() || undefined, note: note.trim() || undefined });
            onClose();
          }}
        >
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Name or nickname">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Where you met">
          <div className="flex flex-col gap-2">
            <Input value={metVia} onChange={(e) => setMetVia(e.target.value)} placeholder="Hinge, a friend's party…" maxLength={40} />
            <div className="flex flex-wrap gap-1.5">
              {["Hinge", "Bumble", "Tinder", "Raya", "In person", "Through friends"].map((m) => (
                <Chip key={m} active={metVia === m} onClick={() => setMetVia(m)} className="min-h-8 py-1 text-[12.5px]">
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </Field>
        <Field label="Short note" hint="What matters about her, in your words.">
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
        </Field>
      </div>
    </Sheet>
  );
}
