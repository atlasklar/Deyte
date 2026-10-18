"use client";

import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { threadsFor } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { useAccount } from "@/lib/store";
import { stageLabel, STAGES } from "@/lib/types";
import { relativeTime } from "@/lib/util";
import { PersonAvatar } from "@/components/ui/primitives";
import { Empty, Page } from "@/components/ui/PageHeader";

export default function PeoplePage() {
  const { data } = useAccount();
  const order = (id: string) => STAGES.findIndex((s) => s.id === id);
  const active = data.people.filter((p) => p.stage !== "ended").sort((a, b) => order(b.stage) - order(a.stage) || b.updatedAt.localeCompare(a.updatedAt));
  const ended = data.people.filter((p) => p.stage === "ended");

  const list = (people: typeof active) => (
    <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
      {people.map((p) => {
        const chats = threadsFor(data, p.id).length;
        const mind = p.profile?.concerns[0];
        return (
          <Link key={p.id} href={`/app/people/${p.id}`} className="group/row flex items-center gap-3 pl-3.5 transition-colors duration-100 active:bg-ink-800 hover:bg-ink-850">
            <PersonAvatar id={p.id} name={p.name} size={42} />
            <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-[var(--line)] py-3 pr-3.5 group-last/row:border-0">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-fg">{p.name}</span>
                  <span className="rounded-md bg-ink-700 px-1.5 py-[2px] text-[11px] text-fg-muted">{stageLabel(p.stage)}</span>
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-fg-subtle">
                  {mind ? `On your mind: ${mind.toLowerCase()}` : p.metVia ? `Met on ${p.metVia}` : "No notes yet"} · {chats} chat{chats === 1 ? "" : "s"}
                </span>
              </span>
              <span className="shrink-0 self-start pt-1 text-[11.5px] text-fg-faint">{relativeTime(p.updatedAt)}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <Page>
      <header className="pt-safe pb-4 pt-5 md:pt-9">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">People</h1>
        <p className="mt-1 text-[13.5px] text-fg-subtle">Set someone up once. Connect her to any chat after.</p>
      </header>

      <div className="flex flex-col gap-5 pb-28">
        {data.people.length === 0 ? (
          <Empty
            icon={<Users size={18} strokeWidth={1.75} />}
            title="No one yet"
            body="Add someone you're talking to, dating or in a relationship with. A few quick questions and your coach knows the story."
            action={
              <Link href="/app/people/new" className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-[14px] font-medium text-black">
                Add someone
              </Link>
            }
          />
        ) : (
          <>
            <section>{list(active)}</section>
            {ended.length > 0 && (
              <section>
                <h2 className="mb-1.5 px-1 text-[12.5px] font-medium text-fg-subtle">Ended</h2>
                {list(ended)}
              </section>
            )}
          </>
        )}
      </div>

      <motion.div whileTap={{ scale: 0.92 }} className="fixed right-4 z-30 md:right-8" style={{ bottom: "calc(var(--safe-bottom) + 76px)" }}>
        <Link href="/app/people/new" onClick={() => haptic("light")} aria-label="Add someone" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)]">
          <Plus size={24} strokeWidth={2.2} />
        </Link>
      </motion.div>
    </Page>
  );
}
