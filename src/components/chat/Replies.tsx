"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ClipboardPaste, Copy, ImagePlus, Loader2, MessageSquareOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCoachActions } from "@/lib/actions";
import { coach } from "@/lib/coach/engine";
import { useAccount } from "@/lib/store";
import { RECOMMENDATION_LABEL, type CoachMessage, type CoachReply, type Person, type Tone, type UserMessage } from "@/lib/types";
import { cn } from "@/lib/util";
import { Badge, Chip } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/Wordmark";
import { useToast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Streaming ──────────────────────────────────────────────── */

/** Every piece of text in a reply, in the order it is written. */
function segmentsOf(reply: CoachReply): string[] {
  switch (reply.kind) {
    case "analysis":
      return [
        ...reply.happening,
        ...reply.explanations,
        RECOMMENDATION_LABEL[reply.next.type],
        reply.next.text,
        reply.why,
        reply.say?.text ?? reply.noMessage ?? "No message needed right now.",
      ];
    case "draft":
      return [reply.intro, reply.text];
    default:
      return [reply.text];
  }
}

/**
 * Reveals text at a realistic model speed (~280 characters a second, a little
 * uneven), segment after segment. `part(i)` is null until segment i starts.
 */
function useStream(segments: string[], active: boolean, onProgress?: () => void, onDone?: () => void) {
  const total = useMemo(() => segments.reduce((n, s) => n + s.length, 0), [segments]);
  const [count, setCount] = useState(active ? 0 : total);
  const progress = useRef(onProgress);
  const done = useRef(onDone);
  progress.current = onProgress;
  done.current = onDone;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let n = 0;
    let pause = 0;
    let boundary = 0;
    const ends: number[] = [];
    segments.reduce((acc, s) => (ends.push(acc + s.length), acc + s.length), 0);
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (pause > 0) pause -= dt;
      else n += (dt / 1000) * (240 + Math.random() * 120);
      // A brief beat at each section boundary, like a model starting a new thought.
      while (boundary < ends.length - 1 && n >= ends[boundary]) {
        n = ends[boundary];
        pause = 120 + Math.random() * 180;
        boundary++;
      }
      const c = Math.min(total, Math.floor(n));
      setCount(c);
      progress.current?.();
      if (c >= total) {
        done.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, segments, total]);

  const offsets = useMemo(() => {
    const o: number[] = [];
    let acc = 0;
    for (const s of segments) {
      o.push(acc);
      acc += s.length;
    }
    return o;
  }, [segments]);

  const part = (i: number) => {
    const shown = count - offsets[i];
    if (shown <= 0) return null;
    return segments[i].slice(0, shown);
  };
  const typing = (i: number) => count > offsets[i] && count < offsets[i] + segments[i].length;
  return { part, typing, done: count >= total, finish: () => setCount(total) };
}

function Typed({ text, typing, className }: { text: string | null; typing: boolean; className?: string }) {
  if (text === null) return null;
  return <span className={cn(typing && "caret", className)}>{text}</span>;
}

/* ── User message ───────────────────────────────────────────── */

export function UserBubble({ message, person }: { message: UserMessage; person?: Person }) {
  const [open, setOpen] = useState(false);
  const lines = message.extracted ?? [];
  const bg = message.background;
  const bgChips = [bg?.metInPerson && "Met in person", bg?.planExists && "Plan on the calendar", bg?.disagreement && "Tension"].filter(Boolean) as string[];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease }} className="flex flex-col items-end gap-1.5">
      {lines.length > 0 && (
        <div className="w-[min(88%,420px)] overflow-hidden rounded-[14px] border border-[var(--line)] bg-ink-900">
          <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
            {message.attachments?.some((a) => a.thumb) && (
              <div className="flex -space-x-2.5">
                {message.attachments.slice(0, 3).map((a) =>
                  a.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.id} src={a.thumb} alt="" className="h-9 w-6 rounded-[5px] border border-ink-900 object-cover" />
                  ) : null,
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">Conversation{person ? ` with ${person.name}` : ""}</p>
              <p className="text-[11.5px] text-fg-subtle">
                {lines.length} messages{message.attachments?.length ? ` · ${message.attachments.length} screenshot${message.attachments.length > 1 ? "s" : ""}` : " · pasted"} · checked by you
              </p>
            </div>
            <ChevronDown size={15} className={cn("text-fg-subtle transition-transform duration-200", open && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                <div className="flex flex-col gap-1 border-t border-[var(--line)] px-2.5 py-2.5">
                  {lines.map((l) => (
                    <div
                      key={l.id}
                      className={cn(
                        "max-w-[85%] rounded-[12px] px-2.5 py-1.5 text-[13px] leading-snug",
                        l.from === "me" ? "self-end bg-ink-600 text-fg" : "self-start bg-ink-800 text-fg-muted",
                      )}
                    >
                      {l.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {message.text && (
        <div className="max-w-[85%] whitespace-pre-wrap rounded-[16px] rounded-br-[5px] bg-ink-700 px-3.5 py-2.5 text-[14.5px] leading-relaxed text-fg">{message.text}</div>
      )}
      {(bgChips.length > 0 || bg?.notes) && (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1">
          {bgChips.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
          {bg?.notes && <p className="w-full text-right text-[12px] leading-snug text-fg-subtle">“{bg.notes}”</p>}
        </div>
      )}
    </motion.div>
  );
}

/* ── Coach replies ──────────────────────────────────────────── */

type ReplyProps = {
  threadId: string;
  message: CoachMessage;
  person?: Person;
  latest: boolean;
  /** Write this reply out live (only for the reply that just arrived). */
  stream?: boolean;
  onStreamProgress?: () => void;
  onStreamDone?: () => void;
  stopSignal?: number;
  onOption: (text: string) => void;
  onUpload: () => void;
  onPaste: () => void;
};

export function CoachMark() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-700" aria-hidden>
      <LogoMark size={14} />
    </span>
  );
}

export function CoachReplyView(props: ReplyProps) {
  const { reply } = props.message;
  const segments = useMemo(() => segmentsOf(reply), [reply]);
  const s = useStream(segments, Boolean(props.stream), props.onStreamProgress, props.onStreamDone);
  const finish = s.finish;

  useEffect(() => {
    if (props.stopSignal) finish();
  }, [props.stopSignal, finish]);

  const showExtras = s.done && props.latest;

  return (
    <div className="flex gap-2.5">
      <CoachMark />
      <div className="min-w-0 flex-1">
        {reply.kind === "analysis" && <AnalysisCard {...props} s={s} showExtras={s.done} />}
        {reply.kind === "clarify" && (
          <div className="pt-0.5">
            <p className="mb-1.5 text-[11.5px] font-medium text-sapphire-300">One question first</p>
            <p className="text-[14.5px] leading-relaxed text-fg">
              <Typed text={s.part(0)} typing={s.typing(0)} />
            </p>
            {showExtras && <Options options={reply.options} onPick={props.onOption} />}
          </div>
        )}
        {reply.kind === "note" && (
          <div className="pt-0.5">
            <p className="text-[14.5px] leading-relaxed text-fg">
              <Typed text={s.part(0)} typing={s.typing(0)} />
            </p>
            {showExtras && reply.actions && (
              <FadeUp className="mt-2.5 flex flex-wrap gap-1.5">
                {reply.actions.includes("upload") && (
                  <Chip onClick={props.onUpload}>
                    <ImagePlus size={14} strokeWidth={1.75} /> Upload screenshots
                  </Chip>
                )}
                {reply.actions.includes("paste") && (
                  <Chip onClick={props.onPaste}>
                    <ClipboardPaste size={14} strokeWidth={1.75} /> Paste messages
                  </Chip>
                )}
              </FadeUp>
            )}
            {showExtras && reply.options && <Options options={reply.options} onPick={props.onOption} />}
          </div>
        )}
        {reply.kind === "draft" && (
          <div className="pt-0.5">
            <p className="mb-2 text-[14px] text-fg-muted">
              <Typed text={s.part(0)} typing={s.typing(0)} />
            </p>
            {s.part(1) !== null && <SayBubble text={s.part(1)!} typing={s.typing(1)} />}
          </div>
        )}
      </div>
    </div>
  );
}

function FadeUp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className={className}>
      {children}
    </motion.div>
  );
}

function Options({ options, onPick }: { options: string[]; onPick: (o: string) => void }) {
  return (
    <FadeUp className="mt-2.5 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={o} onClick={() => onPick(o)}>
          {o}
        </Chip>
      ))}
    </FadeUp>
  );
}

function Row({ label, children, hint, show = true }: { label: string; children: React.ReactNode; hint?: string; show?: boolean }) {
  if (!show) return null;
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="border-t border-[var(--line)] px-3.5 py-3 first:border-t-0">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <h3 className="text-[11.5px] font-medium text-fg-subtle">{label}</h3>
        {hint && <span className="text-[11px] text-fg-faint">· {hint}</span>}
      </div>
      {children}
    </motion.section>
  );
}

type Stream = ReturnType<typeof useStream>;

function AnalysisCard({ threadId, message, person, s, showExtras }: ReplyProps & { s: Stream; showExtras: boolean }) {
  const reply = message.reply;
  const { saveSuggestion } = useCoachActions();
  if (reply.kind !== "analysis") return null;

  const h = reply.happening.length;
  const e = reply.explanations.length;
  const iLabel = h + e;
  const iNext = iLabel + 1;
  const iWhy = iNext + 1;
  const iSay = iWhy + 1;

  return (
    <div className="card overflow-hidden">
      <Row label="What's happening">
        <ul className="flex flex-col gap-1">
          {reply.happening.map((t, i) =>
            s.part(i) === null ? null : (
              <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-fg">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-fg-muted" />
                <Typed text={s.part(i)} typing={s.typing(i)} />
              </li>
            ),
          )}
        </ul>
      </Row>

      <Row label="Possible explanations" hint="interpretations, not facts" show={s.part(h) !== null}>
        <ul className="flex flex-col gap-1">
          {reply.explanations.map((t, j) =>
            s.part(h + j) === null ? null : (
              <li key={j} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-muted">
                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full border border-sapphire-300" />
                <Typed text={s.part(h + j)} typing={s.typing(h + j)} />
              </li>
            ),
          )}
        </ul>
      </Row>

      {s.part(iLabel) !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-2.5 mb-1 rounded-[11px] border border-bronze-400/25 bg-bronze-400/[0.06] px-3 py-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-bronze-400" />
            <h3 className="text-[11.5px] font-medium text-bronze-300">What to do next</h3>
          </div>
          <p className="text-[16.5px] font-semibold tracking-[-0.02em] text-fg">
            <Typed text={s.part(iLabel)} typing={s.typing(iLabel)} />
          </p>
          {s.part(iNext) !== null && (
            <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
              <Typed text={s.part(iNext)} typing={s.typing(iNext)} />
            </p>
          )}
        </motion.div>
      )}

      <Row label="Why" show={s.part(iWhy) !== null}>
        <p className="text-[13.5px] leading-relaxed text-fg-muted">
          <Typed text={s.part(iWhy)} typing={s.typing(iWhy)} />
        </p>
      </Row>

      <Row label="What to say" show={s.part(iSay) !== null}>
        {reply.say ? (
          showExtras ? <SayEditor threadId={threadId} message={message} /> : <SayBubble text={s.part(iSay) ?? ""} typing={s.typing(iSay)} />
        ) : (
          <div className="flex gap-2.5 rounded-[11px] bg-ink-850 px-3 py-2.5">
            <MessageSquareOff size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-fg-subtle" />
            <p className="text-[13.5px] leading-relaxed text-fg-muted">
              <Typed text={s.part(iSay)} typing={s.typing(iSay)} />
            </p>
          </div>
        )}
      </Row>

      {showExtras && reply.memory && reply.memory.length > 0 && (
        <Row label="Remember this?">
          <div className="flex flex-col gap-1.5">
            {reply.memory.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-[11px] border border-[var(--line)] bg-ink-850 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-fg">{m.text}</p>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                    {m.kind === "fact" ? "Fact" : "Unconfirmed read"} · {m.scope === "person" && person ? `${person.name}'s profile` : "About you"}
                  </p>
                </div>
                {m.status === "pending" ? (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => saveSuggestion(threadId, message.id, m.id, false)} className="rounded-lg px-2 py-1 text-[12px] text-fg-subtle hover:text-fg">
                      Skip
                    </button>
                    <button type="button" onClick={() => saveSuggestion(threadId, message.id, m.id, true)} className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-medium text-black hover:bg-white/90">
                      Save
                    </button>
                  </div>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-[11.5px] text-fg-subtle">
                    {m.status === "saved" && <Check size={12} />}
                    {m.status === "saved" ? "Saved" : "Skipped"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Row>
      )}
    </div>
  );
}

const TONES: { id: Tone; label: string }[] = [
  { id: "shorter", label: "Shorter" },
  { id: "warmer", label: "Warmer" },
  { id: "playful", label: "More playful" },
  { id: "direct", label: "More direct" },
];

const CORRECTIONS = [
  { label: "Too long", text: "Prefers shorter messages than suggested." },
  { label: "Too formal", text: "Writes more casually than the suggestions." },
  { label: "Too eager", text: "Doesn't want to come across as over-eager." },
  { label: "Wouldn't say it", text: "Avoids lines that sound scripted." },
];

function SayEditor({ threadId, message }: { threadId: string; message: CoachMessage }) {
  const { data } = useAccount();
  const { voiceFeedback } = useCoachActions();
  const toast = useToast();
  const [tone, setTone] = useState<Tone | null>(null);
  const [askWhy, setAskWhy] = useState(false);
  const say = message.reply.kind === "analysis" ? message.reply.say : undefined;
  if (!say) return null;
  const text = tone ? (say.variants?.[tone] ?? coach.retone(say.text, tone, data)) : say.text;

  return (
    <div>
      <SayBubble text={text} />
      <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
        {TONES.map((t) => (
          <Chip key={t.id} active={tone === t.id} onClick={() => setTone(tone === t.id ? null : t.id)} className="shrink-0 text-[12px]">
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-subtle">
        {message.voice ? (
          <span>{message.voice === "me" ? "Noted — sounds like you." : "Thanks. I'll write closer to your voice."}</span>
        ) : askWhy ? (
          <>
            <span>What&apos;s off?</span>
            {CORRECTIONS.map((c) => (
              <Chip
                key={c.label}
                className="min-h-7 px-2.5 py-0.5 text-[12px]"
                onClick={() => {
                  voiceFeedback(threadId, message.id, "not_me", c.text);
                  toast("Saved to your writing preferences");
                }}
              >
                {c.label}
              </Chip>
            ))}
          </>
        ) : (
          <>
            <span>Sound like you?</span>
            <button type="button" className="rounded-md px-1.5 py-0.5 text-fg-muted hover:text-fg" onClick={() => voiceFeedback(threadId, message.id, "me")}>
              Yes
            </button>
            <button type="button" className="rounded-md px-1.5 py-0.5 text-fg-muted hover:text-fg" onClick={() => setAskWhy(true)}>
              Not quite
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SayBubble({ text, typing }: { text: string; typing?: boolean }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-ink-850">
      <p className={cn("px-3 pb-1 pt-2.5 text-[14.5px] leading-relaxed text-fg", typing && "caret")}>{text}</p>
      <div className="flex justify-end px-1.5 pb-1.5">
        <button
          type="button"
          disabled={typing}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              /* Clipboard blocked: the text is still visible to copy by hand. */
            }
            setCopied(true);
            toast("Copied — paste it in your chat");
            setTimeout(() => setCopied(false), 1800);
          }}
          className="focus-ring flex h-7 items-center gap-1.5 rounded-[8px] px-2 text-[12px] text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-0"
        >
          {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** The coach working through the request, one step at a time. */
export function Thinking({ steps }: { steps: string[] }) {
  // Its own clock, so the rest of the thread doesn't re-render while it ticks.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - start), 120);
    return () => clearInterval(id);
  }, []);
  // Each step takes a slightly different time, so it doesn't look scripted.
  const durations = [900, 1100, 1300, 900, 1000];
  let acc = 0;
  const idx = steps.findIndex((_, i) => {
    acc += durations[i % durations.length];
    return elapsed < acc;
  });
  const current = idx === -1 ? steps.length - 1 : idx;

  return (
    <div className="flex gap-2.5">
      <CoachMark />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="shimmer-text text-[14px] font-medium">{current >= steps.length - 1 ? "Writing your read" : "Thinking"}</p>
        <ul className="mt-2 flex flex-col gap-1.5 border-l border-[var(--line-strong)] pl-3">
          {steps.slice(0, current + 1).map((step, i) => (
            <motion.li key={step} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="flex items-center gap-2 text-[12.5px]">
              {i < current ? <Check size={12} className="text-fg-subtle" /> : <Loader2 size={12} className="animate-spin text-fg-muted" />}
              <span className={i < current ? "text-fg-subtle" : "text-fg-muted"}>{step}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
