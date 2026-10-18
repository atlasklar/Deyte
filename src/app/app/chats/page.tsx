"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MessagesSquare, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { previewOf, useCoachActions } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { useAccount } from "@/lib/store";
import { stageLabel, type Thread } from "@/lib/types";
import { cn, formatDate } from "@/lib/util";
import { ButtonLink, PersonAvatar } from "@/components/ui/primitives";
import { Empty, Page } from "@/components/ui/PageHeader";
import { LogoMark } from "@/components/ui/Wordmark";

const DAY = 86_400_000;

function bucket(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (diff <= 0) return "Today";
  if (diff <= DAY) return "Yesterday";
  if (diff < 7 * DAY) return "Previous 7 days";
  if (diff < 30 * DAY) return "Previous 30 days";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString() ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : formatDate(iso);
}

export default function ChatsPage() {
  const { data } = useAccount();
  const router = useRouter();
  const { startThread } = useCoachActions();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [who, setWho] = useState<string>("all");
  const person = data.people.find((p) => p.id === who);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...data.threads]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((t) => {
        if (who !== "all" && t.personId !== who) return false;
        if (!needle) return true;
        const p = data.people.find((x) => x.id === t.personId);
        const hay = [t.title, p?.name, ...t.messages.map((m) => (m.role === "user" ? m.text : ""))].join(" ").toLowerCase();
        return hay.includes(needle);
      });
    const out: { label: string; items: Thread[] }[] = [];
    for (const t of list) {
      const label = bucket(t.updatedAt);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(t);
      else out.push({ label, items: [t] });
    }
    return out;
  }, [data.threads, data.people, q, who]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const countFor = (id: string) => data.threads.filter((t) => t.personId === id).length;

  return (
    <Page>
      <header className="pt-safe flex items-center justify-between gap-3 pb-4 pt-5 md:pt-9">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">Chats</h1>
        <button
          type="button"
          onClick={() => {
            setSearching((v) => !v);
            setQ("");
          }}
          aria-label={searching ? "Close search" : "Search"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-fg-muted transition-colors hover:text-fg"
        >
          {searching ? <X size={16} /> : <Search size={16} />}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {searching && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <label className="mb-4 flex h-10 items-center gap-2 rounded-[11px] bg-ink-800 px-3">
              <Search size={15} className="shrink-0 text-fg-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-faint focus:outline-none" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter by person, story-style */}
      {data.people.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-3.5 overflow-x-auto px-4">
          {[{ id: "all", name: "All" }, ...data.people].map((p) => {
            const active = who === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (who !== p.id) haptic("selection");
                  setWho(p.id);
                }} className="flex w-[60px] shrink-0 flex-col items-center gap-1.5">
                <span className={cn("rounded-full p-[2px] transition-colors duration-200", active ? "bg-white" : "bg-transparent")}>
                  <span className="block rounded-full border-2 border-void">
                    {p.id === "all" ? (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-700">
                        <MessagesSquare size={18} className="text-fg" />
                      </span>
                    ) : (
                      <PersonAvatar id={p.id} name={p.name} size={48} />
                    )}
                  </span>
                </span>
                <span className={cn("max-w-full truncate text-[11.5px]", active ? "font-medium text-fg" : "text-fg-subtle")}>{p.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {person && (
          <motion.div key={person.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Link href={`/app/people/${person.id}`} className="card mb-5 flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-ink-850">
              <PersonAvatar id={person.id} name={person.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-fg">{person.name}</span>
                <span className="block truncate text-[12px] text-fg-subtle">
                  {stageLabel(person.stage)} · {countFor(person.id)} chat{countFor(person.id) === 1 ? "" : "s"}
                  {person.profile?.want[0] ? ` · wants ${person.profile.want[0].toLowerCase()}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-0.5 text-[12.5px] text-fg-muted">
                Profile <ChevronRight size={14} />
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5 pb-28">
        {total === 0 ? (
          <Empty
            icon={<MessagesSquare size={18} strokeWidth={1.75} />}
            title={data.threads.length ? "Nothing here" : "No conversations yet"}
            body={data.threads.length ? (person ? `No chats about ${person.name} yet.` : "Try another word.") : "Ask your coach anything, or upload a screenshot."}
            action={<ButtonLink href="/app" variant="bronze">Talk to your coach</ButtonLink>}
          />
        ) : (
          groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-1.5 px-1 text-[12.5px] font-medium text-fg-subtle">{g.label}</h2>
              <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
                {g.items.map((t) => {
                  const p = data.people.find((x) => x.id === t.personId);
                  return (
                    <Link key={t.id} href={`/app/chat/${t.id}`} className="group/row flex items-center gap-3 pl-3.5 transition-colors duration-100 active:bg-ink-800 hover:bg-ink-850">
                      {p ? (
                        <PersonAvatar id={p.id} name={p.name} size={36} />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700">
                          <LogoMark size={16} />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-[var(--line)] py-3 pr-3.5 group-last/row:border-0">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium text-fg">{t.title}</span>
                          <span className="block truncate text-[12.5px] text-fg-subtle">
                            {p && who === "all" ? <span className="text-fg-muted">{p.name} · </span> : null}
                            {previewOf(t)}
                          </span>
                        </span>
                        <span className="shrink-0 self-start pt-0.5 text-[11.5px] text-fg-faint">{timeLabel(t.updatedAt)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* New chat */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => (haptic("light"), person ? router.push(`/app/chat/${startThread({ intent: "open", personId: person.id })}`) : router.push("/app"))}
        aria-label={person ? `New chat about ${person.name}` : "New chat"}
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] md:right-8"
        style={{ bottom: "calc(var(--safe-bottom) + 76px)" }}
      >
        <Plus size={24} strokeWidth={2.2} />
      </motion.button>
    </Page>
  );
}
