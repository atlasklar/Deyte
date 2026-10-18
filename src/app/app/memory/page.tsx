"use client";

import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/lib/store";
import type { SelfCategory } from "@/lib/types";
import { formatDate, nowIso, uid } from "@/lib/util";
import { MemoryList } from "@/components/memory/MemoryList";
import { Button, PersonAvatar, SectionTitle } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

const GROUPS: { id: SelfCategory; title: string; empty: string; add: string }[] = [
  { id: "goal", title: "Your goals", empty: "No goals saved.", add: "Add a goal" },
  { id: "style", title: "How you communicate", empty: "Nothing saved about your style.", add: "Add a note" },
  { id: "voice", title: "Your writing voice", empty: "Suggested replies learn from your corrections. Nothing yet.", add: "Add a preference" },
  { id: "context", title: "Your life & schedule", empty: "Nothing saved.", add: "Add context" },
];

export default function MemoryPage() {
  const { data, mutate } = useAccount();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const s = data.subscription;
  const totalPeopleItems = data.people.reduce((n, p) => n + p.facts.length + p.reads.length, 0);

  const status =
    s.status === "active"
      ? "Active — your coach keeps and updates this memory."
      : s.status === "paused"
        ? `Paused — preserved exactly as it is until you resume.`
        : s.status === "canceled"
          ? `Canceled — this memory resets on ${formatDate(s.periodEnd, { month: "long", day: "numeric" })}.`
          : "Reset.";

  return (
    <Page>
      <PageHeader title="Memory" subtitle="What your coach remembers about you. Review it, correct it, or delete it." />

      <div className="card mb-8 flex items-start gap-3 px-4 py-3.5">
        <ShieldCheck size={18} strokeWidth={1.6} className="mt-0.5 shrink-0 text-sapphire-300" />
        <div className="text-[13.5px] leading-relaxed">
          <p className="text-fg">Private to this account. Never shared with other users or used to coach anyone else.</p>
          <p className="mt-0.5 text-fg-subtle">{status}</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 pb-10">
        {GROUPS.map((g) => (
          <section key={g.id}>
            <SectionTitle>{g.title}</SectionTitle>
            <div className="card px-4 py-1.5">
              <MemoryList
                items={data.self.filter((x) => x.category === g.id)}
                empty={g.empty}
                addLabel={g.add}
                onAdd={(text) => mutate((d) => d.self.push({ id: uid("mem"), category: g.id, text, source: "you", createdAt: nowIso() }))}
                onEdit={(id, text) => mutate((d) => (d.self = d.self.map((x) => (x.id === id ? { ...x, text } : x))))}
                onDelete={(id) => {
                  mutate((d) => (d.self = d.self.filter((x) => x.id !== id)));
                  toast("Deleted from memory");
                }}
              />
            </div>
          </section>
        ))}

        <section>
          <SectionTitle>People</SectionTitle>
          <div className="card px-2 py-1.5">
            {data.people.length === 0 && <p className="px-2 py-3 text-[13.5px] text-fg-subtle">No profiles yet.</p>}
            {data.people.map((p) => (
              <Link key={p.id} href={`/app/people/${p.id}`} className="flex items-center gap-3 rounded-[11px] px-2 py-2.5 hover:bg-white/[0.03]">
                <PersonAvatar id={p.id} name={p.name} size={34} />
                <span className="flex-1 text-[14.5px] text-fg">{p.name}</span>
                <span className="text-[12px] text-fg-subtle">
                  {p.facts.length} facts · {p.reads.length} reads
                </span>
                <ChevronRight size={16} strokeWidth={1.6} className="text-fg-faint" />
              </Link>
            ))}
          </div>
        </section>

        <section className="card px-4 py-4">
          <h3 className="text-[15px] text-fg">Delete all memory</h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg-subtle">
            Removes {data.self.length} notes about you, {data.people.length} people ({totalPeopleItems} saved items) and {data.threads.length} conversations. Your account and plan stay.
          </p>
          {!confirm ? (
            <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirm(true)}>
              Delete all memory
            </Button>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-fg-muted">This can&apos;t be undone.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
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
                Yes, delete everything
              </Button>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
