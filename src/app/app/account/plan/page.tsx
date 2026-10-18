"use client";

import { CalendarClock, Check, ChevronLeft, PauseCircle, PlayCircle, TimerReset, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice, PAUSE_OPTIONS } from "@/config/product";
import { subscription, useAccount } from "@/lib/store";
import type { AccountData } from "@/lib/types";
import { addMonths, cn, daysUntil, formatDate, formatLongDate, nowIso } from "@/lib/util";
import { Badge, Button, Chip, IconButton } from "@/components/ui/primitives";
import { Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

function memoryCounts(d: AccountData) {
  return {
    people: d.people.length,
    items: d.self.length + d.people.reduce((n, p) => n + p.facts.length + p.reads.length, 0),
    chats: d.threads.length,
  };
}

export default function PlanPage() {
  const { data, mutate } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const s = data.subscription;
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const counts = memoryCounts(data);

  return (
    <Page>
      <div className="pt-safe flex items-center pt-3 md:pt-8">
        <IconButton label="Back" onClick={() => router.push("/app/account")} className="-ml-2">
          <ChevronLeft size={21} strokeWidth={1.6} />
        </IconButton>
      </div>
      <header className="pb-6 pt-2">
        <h1 className="display text-[26px] leading-none">Your plan</h1>
        <p className="mt-2.5 text-[14px] text-fg-subtle">Demo billing — no payment details are collected in this preview.</p>
      </header>

      <div className="flex flex-col gap-6 pb-10">
        {/* Current state */}
        <section className="card bronze-edge px-5 py-5">
          {s.status === "active" && (
            <>
              <div className="flex items-center justify-between">
                <Badge tone="ok">Active</Badge>
                <span className="text-[13px] text-fg-subtle">{formatPrice(s.price)} / month</span>
              </div>
              <p className="mt-4 text-[16px] leading-relaxed text-fg">Renews on {formatLongDate(s.periodEnd)}.</p>
              <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">Your coach keeps and updates your personal memory.</p>
            </>
          )}
          {s.status === "paused" && (
            <>
              <div className="flex items-center justify-between">
                <Badge tone="sapphire">Paused</Badge>
                <span className="text-[13px] text-fg-subtle">No billing while paused</span>
              </div>
              <p className="mt-4 text-[16px] leading-relaxed text-fg">Paused until {formatLongDate(s.resumeOn!)}.</p>
              <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
                Your memory is preserved — {counts.people} people, {counts.items} saved items, {counts.chats} conversations. New coaching is off until you resume.
              </p>
              <Button
                variant="bronze"
                className="mt-5 w-full"
                onClick={() => {
                  mutate((d) => subscription.resume(d));
                  toast("Welcome back — everything is where you left it");
                }}
              >
                <PlayCircle size={17} strokeWidth={1.7} /> Resume now
              </Button>
            </>
          )}
          {s.status === "canceled" && (
            <>
              <div className="flex items-center justify-between">
                <Badge tone="warn">Canceled</Badge>
                <span className="text-[13px] text-fg-subtle">{daysUntil(s.periodEnd)} days of access left</span>
              </div>
              <p className="mt-4 text-[16px] leading-relaxed text-fg">You have full access until {formatLongDate(s.periodEnd)}.</p>
              <p className="mt-1 text-[14px] leading-relaxed text-warn/90">
                On that date your personal memory resets: {counts.people} people, {counts.items} saved items and {counts.chats} conversations are permanently deleted.
              </p>
              <Button
                variant="bronze"
                className="mt-5 w-full"
                onClick={() => {
                  mutate((d) => subscription.undoCancel(d));
                  toast("Cancellation undone — your plan continues");
                }}
              >
                Keep my plan
              </Button>
            </>
          )}
        </section>

        {/* What each state means */}
        <section>
          <h2 className="eyebrow mb-3 px-1">How it works</h2>
          <div className="card divide-y divide-[var(--line)]">
            {[
              { icon: PlayCircle, title: "Active", body: "Billing monthly. Your coach remembers your goals, the people you're dating and every update.", tone: "text-ok" },
              { icon: PauseCircle, title: "Paused", body: "Billing and new coaching stop. Everything your coach remembers is kept, so you continue with the same context when you resume.", tone: "text-sapphire-300" },
              { icon: TimerReset, title: "Canceled", body: "Renewal stops. You keep access until the end of the period you paid for. Then your personal dating memory resets — if you return later, you start fresh.", tone: "text-warn" },
            ].map((r) => (
              <div key={r.title} className="flex gap-3.5 px-4 py-4">
                <r.icon size={18} strokeWidth={1.6} className={cn("mt-0.5 shrink-0", r.tone)} />
                <div>
                  <p className="text-[14.5px] text-fg">{r.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-fg-subtle">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {s.status === "active" && (
          <section className="grid gap-2.5 sm:grid-cols-2">
            <Button variant="secondary" size="lg" onClick={() => setPauseOpen(true)}>
              <PauseCircle size={17} strokeWidth={1.6} /> Pause instead
            </Button>
            <Button variant="ghost" size="lg" className="text-fg-subtle" onClick={() => setCancelOpen(true)}>
              <XCircle size={17} strokeWidth={1.6} /> Cancel subscription
            </Button>
          </section>
        )}

        {/* Demo-only controls */}
        <section className="rounded-[14px] border border-dashed border-[var(--line-strong)] px-4 py-4">
          <p className="eyebrow mb-2">Preview controls</p>
          <p className="mb-3 text-[13px] leading-relaxed text-fg-subtle">Simulate time passing to see each state. Not part of the real product.</p>
          <div className="flex flex-wrap gap-2">
            {s.status === "canceled" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  mutate((d) => subscription.end(d));
                  router.push("/app");
                }}
              >
                Skip to access end (resets memory)
              </Button>
            )}
            {s.status === "paused" && (
              <Button size="sm" variant="secondary" onClick={() => mutate((d) => subscription.resume(d))}>
                Skip to resume date
              </Button>
            )}
          </div>
        </section>
      </div>

      <PauseSheet
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        counts={counts}
        onConfirm={(months) => {
          mutate((d) => subscription.pause(d, months));
          setPauseOpen(false);
          toast("Plan paused — memory preserved");
        }}
      />
      <CancelSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        endsAt={s.periodEnd}
        counts={counts}
        onPause={() => {
          setCancelOpen(false);
          setPauseOpen(true);
        }}
        onConfirm={() => {
          mutate((d) => subscription.cancel(d));
          setCancelOpen(false);
          toast("Subscription canceled");
        }}
      />
    </Page>
  );
}

function PauseSheet({ open, onClose, onConfirm, counts }: { open: boolean; onClose: () => void; onConfirm: (m: number) => void; counts: ReturnType<typeof memoryCounts> }) {
  const [months, setMonths] = useState<number>(1);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pause your plan"
      subtitle="Take a break without losing anything."
      footer={
        <Button variant="bronze" className="w-full" onClick={() => onConfirm(months)}>
          Pause until {formatDate(addMonths(nowIso(), months), { month: "long", day: "numeric" })}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2.5 text-[13px] font-medium text-fg-muted">For how long?</p>
          <div className="flex gap-2">
            {PAUSE_OPTIONS.map((m) => (
              <Chip key={m} active={months === m} onClick={() => setMonths(m)} className="flex-1 justify-center">
                {m} month{m > 1 ? "s" : ""}
              </Chip>
            ))}
          </div>
        </div>
        <ul className="card flex flex-col gap-3 px-4 py-4 text-[14px] leading-relaxed">
          <li className="flex gap-3">
            <CalendarClock size={16} strokeWidth={1.6} className="mt-1 shrink-0 text-sapphire-300" />
            <span className="text-fg-muted">
              <span className="text-fg">Billing pauses.</span> You won&apos;t be charged until you resume.
            </span>
          </li>
          <li className="flex gap-3">
            <PauseCircle size={16} strokeWidth={1.6} className="mt-1 shrink-0 text-sapphire-300" />
            <span className="text-fg-muted">
              <span className="text-fg">New coaching pauses.</span> You can still read and delete what&apos;s saved.
            </span>
          </li>
          <li className="flex gap-3">
            <PlayCircle size={16} strokeWidth={1.6} className="mt-1 shrink-0 text-ok" />
            <span className="text-fg-muted">
              <span className="text-fg">Memory is preserved</span> — {counts.people} people, {counts.items} saved items, {counts.chats} conversations. Resume any time, early if you like.
            </span>
          </li>
        </ul>
      </div>
    </Sheet>
  );
}

function CancelSheet({
  open,
  onClose,
  onConfirm,
  onPause,
  endsAt,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPause: () => void;
  endsAt: string;
  counts: ReturnType<typeof memoryCounts>;
}) {
  const [ack, setAck] = useState(false);
  const date = formatLongDate(endsAt);
  return (
    <Sheet
      open={open}
      onClose={() => {
        setAck(false);
        onClose();
      }}
      title="Before you cancel"
      subtitle="Here's exactly what happens and when."
      footer={
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setAck(!ack)} className="flex items-start gap-3 rounded-[11px] px-1 py-1.5 text-left">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", ack ? "border-bronze-300 bg-bronze-400" : "border-[var(--line-strong)]")}>
              {ack && <Check size={13} strokeWidth={2.4} className="text-ink-950" />}
            </span>
            <span className="text-[14px] leading-snug text-fg">I understand my memory resets on {formatDate(endsAt, { month: "long", day: "numeric" })}.</span>
          </button>
          <Button variant="danger" className="w-full" disabled={!ack} onClick={onConfirm}>
            Cancel subscription
          </Button>
          <Button variant="ghost" className="w-full" onClick={onPause}>
            Pause instead and keep my memory
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="card px-4 py-4">
          <p className="eyebrow mb-2">Today</p>
          <p className="text-[14.5px] leading-relaxed text-fg-muted">Renewal stops. You won&apos;t be charged again. Everything keeps working.</p>
        </div>
        <div className="card border-warn/30 px-4 py-4">
          <p className="eyebrow mb-2 !text-warn">{date}</p>
          <p className="text-[14.5px] leading-relaxed text-fg">
            Your paid access ends and your personal dating memory resets. This permanently deletes:
          </p>
          <ul className="mt-2.5 flex flex-col gap-1 text-[14px] text-fg-muted">
            <li>· {counts.people} people and their timelines</li>
            <li>· {counts.items} saved facts, reads and preferences</li>
            <li>· {counts.chats} conversations and screenshot previews</li>
          </ul>
          <p className="mt-3 text-[13.5px] leading-relaxed text-fg-subtle">If you come back afterward, your coach starts fresh. Download your data from Account first if you want a copy.</p>
        </div>
      </div>
    </Sheet>
  );
}
