"use client";

import { ChevronRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { threadsFor } from "@/lib/actions";
import { useAccount } from "@/lib/store";
import { stageLabel, STAGES } from "@/lib/types";
import { relativeTime } from "@/lib/util";
import { PersonPicker } from "@/components/chat/Sheets";
import { Button, PersonAvatar } from "@/components/ui/primitives";
import { Empty, Page, PageHeader } from "@/components/ui/PageHeader";

export default function PeoplePage() {
  const { data } = useAccount();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const order = (id: string) => STAGES.findIndex((s) => s.id === id);
  const people = [...data.people].sort((a, b) => (a.stage === "ended" ? 1 : 0) - (b.stage === "ended" ? 1 : 0) || order(b.stage) - order(a.stage));

  return (
    <Page>
      <PageHeader
        title="People"
        subtitle="One private profile per person. Facts, reads and history stay separate."
        action={
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
            <Plus size={15} strokeWidth={1.8} /> New
          </Button>
        }
      />
      <div className="flex flex-col gap-2 pb-8">
        {people.length === 0 ? (
          <Empty
            icon={<Users size={20} strokeWidth={1.6} />}
            title="No one yet"
            body="Add someone you're talking to, dating or in a relationship with. Only you can see it."
            action={<Button variant="bronze" onClick={() => setCreating(true)}>Add a person</Button>}
          />
        ) : (
          people.map((p) => {
            const chats = threadsFor(data, p.id).length;
            return (
              <Link key={p.id} href={`/app/people/${p.id}`} className="card flex items-center gap-3.5 rounded-[14px] px-4 py-4 transition-colors hover:border-[var(--line-strong)]">
                <PersonAvatar id={p.id} name={p.name} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] text-fg">{p.name}</p>
                  <p className="truncate text-[12.5px] text-fg-subtle">
                    {stageLabel(p.stage)}
                    {p.metVia ? ` · ${p.metVia}` : ""} · {p.facts.length} facts · {chats} chat{chats === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="hidden shrink-0 text-[11.5px] text-fg-faint sm:block">{relativeTime(p.updatedAt)}</span>
                <ChevronRight size={17} strokeWidth={1.6} className="shrink-0 text-fg-faint" />
              </Link>
            );
          })
        )}
      </div>
      <PersonPicker
        open={creating}
        onClose={() => setCreating(false)}
        onSelect={(id) => {
          setCreating(false);
          if (id) router.push(`/app/people/${id}`);
        }}
      />
    </Page>
  );
}
