"use client";

import { MessagesSquare, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { previewOf } from "@/lib/actions";
import { useAccount } from "@/lib/store";
import { cn, relativeTime } from "@/lib/util";
import { Chip, PersonAvatar } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/primitives";
import { Empty, Page, PageHeader } from "@/components/ui/PageHeader";
import { LogoMark } from "@/components/ui/Wordmark";

export default function ChatsPage() {
  const { data } = useAccount();
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string | "all">("all");

  const threads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.threads.filter((t) => {
      if (who !== "all" && t.personId !== who) return false;
      if (!needle) return true;
      const p = data.people.find((x) => x.id === t.personId);
      const hay = [t.title, p?.name, ...t.messages.map((m) => (m.role === "user" ? m.text : ""))].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [data.threads, data.people, q, who]);

  return (
    <Page>
      <PageHeader title="Chats" subtitle="Every conversation with your coach, newest first." />

      {/* Pill search (after the Uiverse search field, in the dark palette) */}
      <label className="group flex h-11 items-center gap-2.5 rounded-[11px] border border-[var(--line-strong)] bg-ink-900 pl-3.5 pr-2 transition-all duration-200 focus-within:border-white/25 focus-within:ring-4 focus-within:ring-white/[0.04]">
        <Search size={16} strokeWidth={1.6} className="shrink-0 text-fg-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-faint focus:outline-none" />
        {q && (
          <button type="button" onClick={() => setQ("")} className="rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-fg-subtle">
            Clear
          </button>
        )}
      </label>

      {data.people.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={who === "all"} onClick={() => setWho("all")}>
            Everyone
          </Chip>
          {data.people.map((p) => (
            <Chip key={p.id} active={who === p.id} onClick={() => setWho(p.id)} className="shrink-0 pl-1.5">
              <PersonAvatar id={p.id} name={p.name} size={22} />
              {p.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 pb-8">
        {threads.length === 0 ? (
          <Empty
            icon={<MessagesSquare size={20} strokeWidth={1.6} />}
            title={data.threads.length ? "Nothing matches" : "No conversations yet"}
            body={data.threads.length ? "Try another name or word." : "Start from the lobby — ask a question or upload a screenshot."}
            action={!data.threads.length && <ButtonLink href="/app" variant="bronze">Talk to your coach</ButtonLink>}
          />
        ) : (
          threads.map((t) => {
            const p = data.people.find((x) => x.id === t.personId);
            return (
              <Link key={t.id} href={`/app/chat/${t.id}`} className={cn("card flex items-center gap-3 rounded-[14px] px-4 py-3.5 transition-colors hover:border-[var(--line-strong)]")}>
                {p ? <PersonAvatar id={p.id} name={p.name} /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-700"><LogoMark size={18} /></span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[15px] text-fg">{t.title}</p>
                    <span className="shrink-0 text-[11.5px] text-fg-faint">{relativeTime(t.updatedAt)}</span>
                  </div>
                  <p className="truncate text-[13px] text-fg-subtle">
                    {p ? `${p.name} · ` : ""}
                    {previewOf(t)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Page>
  );
}
