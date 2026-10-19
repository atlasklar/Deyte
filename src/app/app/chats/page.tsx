"use client";

import { animate, AnimatePresence, motion, Reorder, useDragControls, useMotionValue } from "framer-motion";
import { ArrowUpDown, Check, ChevronRight, GripVertical, MessagesSquare, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { previewOf, useCoachActions } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { useAccount } from "@/lib/store";
import { DEFAULT_PREFS, stageLabel, type ChatSort, type Person, type Thread } from "@/lib/types";
import { cn, formatDate } from "@/lib/util";
import { Button, ButtonLink, CoachPic, PersonAvatar } from "@/components/ui/primitives";
import { Empty, Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

const DAY = 86_400_000;
const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

const SORTS: { id: ChatSort; label: string; sub: string }[] = [
  { id: "recent", label: "Recent", sub: "Latest activity first" },
  { id: "oldest", label: "Oldest", sub: "Oldest conversations first" },
  { id: "az", label: "A–Z", sub: "By title" },
  { id: "custom", label: "Custom", sub: "Your own order. Tap Edit, then drag" },
];

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

function compare(sort: ChatSort) {
  return (a: Thread, b: Thread) => {
    switch (sort) {
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "az":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "custom":
        // New chats (no position yet) sit on top until you move them.
        if (a.rank === undefined && b.rank === undefined) return b.updatedAt.localeCompare(a.updatedAt);
        if (a.rank === undefined) return -1;
        if (b.rank === undefined) return 1;
        return a.rank - b.rank;
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  };
}

export default function ChatsPage() {
  const { data, mutate } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const { startThread } = useCoachActions();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [who, setWho] = useState<string>("all");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const sort: ChatSort = data.prefs?.chatSort ?? "recent";
  const person = data.people.find((p) => p.id === who);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.threads.filter((t) => {
      if (who !== "all" && t.personId !== who) return false;
      if (!needle) return true;
      const p = data.people.find((x) => x.id === t.personId);
      const hay = [t.title, p?.name, ...t.messages.map((m) => (m.role === "user" ? m.text : ""))].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [data.threads, data.people, q, who]);

  const pinned = useMemo(() => filtered.filter((t) => t.pinned).sort(compare(sort)), [filtered, sort]);
  const rest = useMemo(() => filtered.filter((t) => !t.pinned).sort(compare(sort)), [filtered, sort]);
  const groups = useMemo(() => {
    if (sort !== "recent") return rest.length ? [{ label: "", items: rest }] : [];
    const out: { label: string; items: Thread[] }[] = [];
    for (const t of rest) {
      const label = bucket(t.updatedAt);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(t);
      else out.push({ label, items: [t] });
    }
    return out;
  }, [rest, sort]);

  // Custom order while dragging (committed to the account when the drag ends).
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => setOrder(rest.map((t) => t.id)), [rest]);

  const total = filtered.length;
  const countFor = (id: string) => data.threads.filter((t) => t.personId === id).length;
  const personOf = (t: Thread) => data.people.find((x) => x.id === t.personId);

  const setSort = (s: ChatSort) => {
    haptic("selection");
    mutate((d) => {
      d.prefs = { ...DEFAULT_PREFS, ...d.prefs, chatSort: s };
      // First time in Custom: start from the current recent order.
      if (s === "custom" && d.threads.some((t) => t.rank === undefined)) {
        [...d.threads].sort(compare("recent")).forEach((t, i) => (t.rank = i));
      }
    });
    setSortOpen(false);
  };

  const commitOrder = () => {
    mutate((d) => {
      order.forEach((id, i) => {
        const t = d.threads.find((x) => x.id === id);
        if (t) t.rank = i;
      });
    });
  };

  const togglePin = (ids: string[]) => {
    const pinNow = ids.some((id) => !data.threads.find((t) => t.id === id)?.pinned);
    haptic("light");
    mutate((d) => {
      for (const t of d.threads) if (ids.includes(t.id)) t.pinned = pinNow || undefined;
    });
    toast(pinNow ? (ids.length > 1 ? "Pinned" : "Pinned to the top") : "Unpinned");
  };

  const remove = (ids: string[]) => {
    haptic("success");
    mutate((d) => {
      d.threads = d.threads.filter((t) => !ids.includes(t.id));
    });
    setSelected(new Set());
    setConfirm(null);
    if (editing && ids.length === total) setEditing(false);
    toast(ids.length > 1 ? `${ids.length} chats deleted` : "Chat deleted");
  };

  const toggleSelect = (id: string) => {
    haptic("selection");
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const stopEditing = () => {
    setEditing(false);
    setSelected(new Set());
  };

  const rowProps = (t: Thread) => ({
    t,
    person: personOf(t),
    showPerson: who === "all",
    editing,
    selected: selected.has(t.id),
    onToggle: () => toggleSelect(t.id),
    onPin: () => togglePin([t.id]),
    onDelete: () => setConfirm([t.id]),
  });

  const sel = [...selected];

  return (
    <Page>
      <header className="pt-safe flex items-center justify-between gap-2 pb-4 pt-5 md:pt-9">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">Chats</h1>
        <div className="flex items-center gap-1.5">
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => setSortOpen(true)}
                aria-label="Sort chats"
                className="flex h-9 items-center gap-1.5 rounded-full bg-ink-800 px-3 text-[13px] text-fg-muted transition-colors hover:text-fg"
              >
                <ArrowUpDown size={14} /> {SORTS.find((s) => s.id === sort)?.label}
              </button>
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
            </>
          )}
          {data.threads.length > 0 && (
            <button
              type="button"
              onClick={() => (editing ? stopEditing() : (haptic("selection"), setEditing(true)))}
              className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors", editing ? "bg-white text-black" : "bg-ink-800 text-fg-muted hover:text-fg")}
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </header>

      <AnimatePresence initial={false}>
        {searching && !editing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <label className="mb-4 flex h-10 items-center gap-2 rounded-[11px] bg-ink-800 px-3">
              <Search size={15} className="shrink-0 text-fg-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-faint focus:outline-none" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter by person, story-style */}
      {data.people.length > 0 && !editing && (
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
                }}
                className="flex w-[60px] shrink-0 flex-col items-center gap-1.5"
              >
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
        {person && !editing && (
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

      {editing && (
        <div className="mb-3 flex items-center justify-between px-1 text-[12.5px] text-fg-subtle">
          <span>{sort === "custom" ? "Drag ⠿ to reorder · tap to select" : "Tap chats to select"}</span>
          <button
            type="button"
            onClick={() => (haptic("selection"), setSelected(selected.size === total ? new Set() : new Set(filtered.map((t) => t.id))))}
            className="font-medium text-fg-muted hover:text-fg"
          >
            {selected.size === total && total > 0 ? "Deselect all" : "Select all"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5 pb-36">
        {total === 0 ? (
          <Empty
            icon={<MessagesSquare size={18} strokeWidth={1.75} />}
            title={data.threads.length ? "Nothing here" : "No conversations yet"}
            body={data.threads.length ? (person ? `No chats about ${person.name} yet.` : "Try another word.") : "Ask your coach anything, or upload a screenshot."}
            action={
              <ButtonLink href="/app" variant="bronze">
                Talk to your coach
              </ButtonLink>
            }
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <section>
                <h2 className="mb-1.5 flex items-center gap-1 px-1 text-[12.5px] font-medium text-fg-subtle">
                  <Pin size={11} /> Pinned
                </h2>
                <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
                  {pinned.map((t) => (
                    <ChatRow key={t.id} {...rowProps(t)} />
                  ))}
                </div>
              </section>
            )}

            {sort === "custom" && editing ? (
              <section>
                <Reorder.Group axis="y" values={order} onReorder={setOrder} as="div" className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
                  {order.map((id) => {
                    const t = rest.find((x) => x.id === id);
                    return t ? <SortableRow key={id} id={id} onDrop={commitOrder} rowProps={rowProps(t)} /> : null;
                  })}
                </Reorder.Group>
              </section>
            ) : (
              groups.map((g) => (
                <section key={g.label || "all"}>
                  {g.label && <h2 className="mb-1.5 px-1 text-[12.5px] font-medium text-fg-subtle">{g.label}</h2>}
                  <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
                    {g.items.map((t) => (
                      <ChatRow key={t.id} {...rowProps(t)} />
                    ))}
                  </div>
                </section>
              ))
            )}

            {!editing && total > 0 && <p className="text-center text-[11.5px] text-fg-faint">Swipe a chat left to pin or delete it</p>}
          </>
        )}
      </div>

      {/* New chat, or the edit bar */}
      <AnimatePresence initial={false}>
        {editing ? (
          <motion.div
            key="bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            className="fixed inset-x-0 z-30 px-4 md:left-[232px] md:px-8"
            style={{ bottom: "calc(var(--safe-bottom) + 72px)" }}
          >
            <div className="mx-auto flex max-w-[640px] gap-2 rounded-[16px] border border-[var(--line-strong)] bg-ink-850/95 p-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <Button variant="secondary" className="flex-1" disabled={!sel.length} onClick={() => togglePin(sel)}>
                {sel.length && sel.every((id) => data.threads.find((t) => t.id === id)?.pinned) ? <PinOff size={15} /> : <Pin size={15} />}
                {sel.length && sel.every((id) => data.threads.find((t) => t.id === id)?.pinned) ? "Unpin" : "Pin"}
              </Button>
              <Button variant="danger" className="flex-1" disabled={!sel.length} onClick={() => setConfirm(sel)}>
                <Trash2 size={15} /> Delete{sel.length ? ` (${sel.length})` : ""}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            type="button"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => (haptic("light"), person ? router.push(`/app/chat/${startThread({ intent: "open", personId: person.id })}`) : router.push("/app"))}
            aria-label={person ? `New chat about ${person.name}` : "New chat"}
            className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] md:right-8"
            style={{ bottom: "calc(var(--safe-bottom) + 76px)" }}
          >
            <Plus size={24} strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort chats">
        <div className="flex flex-col gap-1.5 pb-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={cn("flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors", sort === s.id ? "border-white/60 bg-white/[0.06]" : "border-[var(--line)] hover:bg-ink-850")}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-fg">{s.label}</span>
                <span className="block text-[12.5px] text-fg-subtle">{s.sub}</span>
              </span>
              {sort === s.id && <Check size={17} className="text-fg" />}
            </button>
          ))}
          <p className="px-1 pt-1 text-[12px] text-fg-faint">Pinned chats always stay on top.</p>
        </div>
      </Sheet>

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm && confirm.length > 1 ? `Delete ${confirm.length} chats?` : "Delete this chat?"}
        subtitle="The messages and screenshot previews are removed. People, facts and your memory stay."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => confirm && remove(confirm)}>
              Delete
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </Page>
  );
}

/* ── Rows ──────────────────────────────────────────────────── */

type RowProps = {
  t: Thread;
  person?: Person;
  showPerson: boolean;
  editing: boolean;
  selected: boolean;
  onToggle: () => void;
  onPin: () => void;
  onDelete: () => void;
  handle?: React.ReactNode;
};

const ACTIONS = 148;

/** One chat. Swipe left for Pin and Delete; in edit mode, tap to select. */
function ChatRow({ t, person, showPerson, editing, selected, onToggle, onPin, onDelete, handle }: RowProps) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const dragged = useRef(false);

  useEffect(() => {
    if (editing) {
      animate(x, 0, spring);
      setOpen(false);
    }
  }, [editing, x]);

  const close = () => {
    animate(x, 0, spring);
    setOpen(false);
  };

  const inner = (
    <>
      {editing && (
        <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150", selected ? "border-white bg-white" : "border-white/25")}>
          {selected && <Check size={13} strokeWidth={3} className="text-black" />}
        </span>
      )}
      {person ? <PersonAvatar id={person.id} name={person.name} size={36} /> : <CoachPic size={36} />}
      <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-[var(--line)] py-3 pr-3.5 group-last/row:border-0">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {t.pinned && <Pin size={11} className="shrink-0 text-fg-faint" />}
            <span className="truncate text-[14.5px] font-medium text-fg">{t.title}</span>
          </span>
          <span className="block truncate text-[12.5px] text-fg-subtle">
            {person && showPerson ? <span className="text-fg-muted">{person.name} · </span> : null}
            {previewOf(t)}
          </span>
        </span>
        {handle ?? <span className="shrink-0 self-start pt-0.5 text-[11.5px] text-fg-faint">{timeLabel(t.updatedAt)}</span>}
      </span>
    </>
  );

  return (
    <div className="group/row relative overflow-hidden">
      {/* Revealed by swiping left */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS }} aria-hidden={!open}>
        <button type="button" tabIndex={open ? 0 : -1} onClick={() => (onPin(), close())} className="flex flex-1 flex-col items-center justify-center gap-1 bg-[#e8a33d] text-[11.5px] font-medium text-white">
          {t.pinned ? <PinOff size={17} /> : <Pin size={17} />}
          {t.pinned ? "Unpin" : "Pin"}
        </button>
        <button type="button" tabIndex={open ? 0 : -1} onClick={() => (close(), onDelete())} className="flex flex-1 flex-col items-center justify-center gap-1 bg-[#e5484d] text-[11.5px] font-medium text-white">
          <Trash2 size={17} />
          Delete
        </button>
      </div>

      <motion.div
        drag={editing ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -ACTIONS, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -50 || info.velocity.x < -350;
          animate(x, shouldOpen ? -ACTIONS : 0, spring);
          if (shouldOpen && !open) haptic("selection");
          setOpen(shouldOpen);
          setTimeout(() => (dragged.current = false), 60);
        }}
        className="relative bg-ink-900"
      >
        {editing ? (
          <button type="button" onClick={onToggle} aria-pressed={selected} className={cn("flex w-full items-center gap-3 pl-3.5 text-left transition-colors duration-100", selected ? "bg-white/[0.05]" : "active:bg-ink-800")}>
            {inner}
          </button>
        ) : (
          <Link
            href={`/app/chat/${t.id}`}
            draggable={false}
            onClick={(e) => {
              if (dragged.current || open) {
                e.preventDefault();
                if (open) close();
              }
            }}
            className="flex items-center gap-3 pl-3.5 transition-colors duration-100 active:bg-ink-800 hover:bg-ink-850"
          >
            {inner}
          </Link>
        )}
      </motion.div>
    </div>
  );
}

/** A row you can drag by its handle (Custom order, edit mode). */
function SortableRow({ id, onDrop, rowProps }: { id: string; onDrop: () => void; rowProps: Omit<RowProps, "handle"> }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => (haptic("selection"), onDrop())}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.8)", zIndex: 10 }}
      className="relative"
    >
      <ChatRow
        {...rowProps}
        handle={
          <span
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              haptic("selection");
              controls.start(e);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-fg-faint active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical size={18} />
          </span>
        }
      />
    </Reorder.Item>
  );
}
