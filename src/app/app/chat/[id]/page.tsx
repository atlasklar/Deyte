"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ChevronLeft, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { lastUnanswered, useCoachActions, type Draft } from "@/lib/actions";
import { coach } from "@/lib/coach/engine";
import { validateScreenshots } from "@/lib/files";
import { accessFor, useAccount } from "@/lib/store";
import { stageLabel, type Message, type Person } from "@/lib/types";
import { formatDate, sleep } from "@/lib/util";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { PersonChip, PersonSheet } from "@/components/chat/PersonConnect";
import { CoachReplyView, Thinking, UserBubble } from "@/components/chat/Replies";
import { ReviewFlow, type ReviewInput } from "@/components/chat/ReviewFlow";
import { PasteSheet } from "@/components/chat/Sheets";
import { ButtonLink, IconButton, PersonAvatar } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

/** Replies already requested, so re-renders and Strict Mode never ask twice. */
const inflight = new Set<string>();
/** Messages stopped by the user before the coach answered. */
const stopped = new Set<string>();

type RowProps = {
  threadId: string;
  message: Message;
  person?: Person;
  latest: boolean;
  streaming: boolean;
  stopSignal: number;
  onStreamDone: () => void;
  onOption: (text: string) => void;
  onUpload: () => void;
  onPaste: () => void;
};

/** One message. Memoised so a streaming reply never re-renders the rest of the thread. */
const Row = memo(function Row(p: RowProps) {
  return p.message.role === "user" ? (
    <UserBubble message={p.message} person={p.person} />
  ) : (
    <CoachReplyView
      threadId={p.threadId}
      message={p.message}
      person={p.person}
      latest={p.latest}
      stream={p.streaming}
      stopSignal={p.stopSignal}
      onStreamDone={p.onStreamDone}
      onOption={p.onOption}
      onUpload={p.onUpload}
      onPaste={p.onPaste}
    />
  );
});

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, mutate } = useAccount();
  const { send, receive, linkPerson } = useCoachActions();
  const thread = data.threads.find((t) => t.id === id);
  const person = data.people.find((p) => p.id === thread?.personId);
  const access = accessFor(data);
  const [thinking, setThinking] = useState<string[] | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [stopSignal, setStopSignal] = useState(0);
  const [, force] = useState(0);
  const [review, setReview] = useState<ReviewInput | null>(null);
  const [paste, setPaste] = useState(false);
  const [picking, setPicking] = useState(false);
  const [menu, setMenu] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const filePick = useRef<HTMLInputElement>(null);

  const pending = thread ? lastUnanswered(thread) : null;
  const isStopped = pending ? stopped.has(pending.id) : false;

  // Coming back from setting up a new person: connect her to this chat.
  useEffect(() => {
    const w = params.get("with");
    if (w && thread && data.people.some((p) => p.id === w)) {
      linkPerson(thread.id, w);
      router.replace(`/app/chat/${thread.id}`, { scroll: false });
    }
  }, [params, thread, data.people, linkPerson, router]);

  // Ask the coach whenever the latest message is the user's.
  useEffect(() => {
    if (!thread || !pending || inflight.has(pending.id) || stopped.has(pending.id) || !access.canUseAI) return;
    inflight.add(pending.id);
    const req = { account: data, thread, message: pending, person };
    const steps = coach.thinkingSteps(req);
    setThinking(steps);
    const minThinking = 2600 + steps.length * 450 + Math.random() * 700;
    Promise.all([coach.reply(req), sleep(minThinking)])
      .then(([reply]) => {
        if (stopped.has(pending.id)) return;
        setStreamingId(receive(thread.id, reply));
      })
      .finally(() => {
        setThinking(null);
        inflight.delete(pending.id);
      });
    // Triggered by a new unanswered message only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id, isStopped]);

  /* ── Scrolling ──────────────────────────────────────────────
     Follow new content only while the reader is at the bottom; the moment
     they scroll up, stop following. Content growth (streaming, images,
     expanding cards) is handled by one ResizeObserver, never per frame. */

  const toBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useLayoutEffect(() => {
    toBottom();
  }, [toBottom, thread?.id]);

  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stick.current) toBottom();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [toBottom, thread?.id]);

  const count = thread?.messages.length ?? 0;
  const lastRole = thread?.messages[count - 1]?.role;
  useEffect(() => {
    // Your own message always brings you to the bottom.
    if (lastRole === "user") {
      stick.current = true;
      toBottom("smooth");
    }
  }, [count, lastRole, toBottom]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    stick.current = atBottom;
    setShowJump(!atBottom);
  }, []);

  /* ── Callbacks (stable, so rows stay memoised) ──────────── */

  const threadId = thread?.id ?? "";
  const canSend = access.canUseAI && !thinking && !streamingId;
  const onStreamDone = useCallback(() => setStreamingId(null), []);
  const onOption = useCallback((text: string) => canSend && send(threadId, { text }), [canSend, send, threadId]);
  const onUpload = useCallback(() => filePick.current?.click(), []);
  const onPaste = useCallback(() => setPaste(true), []);

  const firstDate = useMemo(() => (thread ? formatDate(thread.createdAt, { weekday: "short", month: "short", day: "numeric" }) : ""), [thread]);

  if (!thread) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="display text-[22px] text-fg">This conversation is gone</p>
        <p className="max-w-[300px] text-[13.5px] text-fg-subtle">It may have been deleted. Your other chats and memory are untouched.</p>
        <ButtonLink href="/app" variant="secondary" className="mt-2">
          Back to your coach
        </ButtonLink>
      </div>
    );
  }

  const busy = Boolean(thinking || streamingId);

  const stop = () => {
    if (thinking && pending) {
      stopped.add(pending.id);
      setThinking(null);
      force((x) => x + 1);
    } else if (streamingId) {
      setStopSignal((x) => x + 1);
    }
  };

  const retry = () => {
    if (!pending) return;
    stopped.delete(pending.id);
    force((x) => x + 1);
  };

  const onSubmit = ({ text, files, reviewPaste }: ComposerSubmit) => {
    if (files.length || reviewPaste) {
      setReview(reviewPaste ? { files: [], pasted: text, personId: thread.personId } : { files, text: text || undefined, personId: thread.personId });
      return;
    }
    send(thread.id, { text });
  };

  const submitDraft = (draft: Draft, personId?: string) => {
    if (personId && personId !== thread.personId) linkPerson(thread.id, personId);
    send(thread.id, draft);
  };

  const lastId = thread.messages[thread.messages.length - 1]?.id;

  return (
    <div className="mx-auto flex h-dvh max-w-[720px] flex-col">
      <header className="pt-safe z-20 shrink-0 border-b border-[var(--line)] bg-void/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-1 px-2 md:px-4">
          <IconButton label="Back" onClick={() => router.push("/app")}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </IconButton>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-[14px] font-medium text-fg">{thread.title}</p>
            {person ? (
              <Link href={`/app/people/${person.id}`} className="flex w-fit items-center gap-1.5 text-[12px] text-fg-subtle hover:text-fg-muted">
                <PersonAvatar id={person.id} name={person.name} size={14} />
                {person.name} · {stageLabel(person.stage)}
              </Link>
            ) : (
              <p className="text-[12px] text-fg-faint">No one connected</p>
            )}
          </div>
          <IconButton label="More" onClick={() => setMenu(true)}>
            <MoreHorizontal size={19} strokeWidth={1.75} />
          </IconButton>
        </div>
      </header>

      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 [overflow-anchor:none] md:px-6">
        <div ref={content}>
          <p className="py-4 text-center text-[11px] text-fg-faint">{firstDate}</p>
          <div className="flex flex-col gap-5 pb-6">
            {thread.messages.map((m) => (
              <Row
                key={m.id}
                threadId={thread.id}
                message={m}
                person={person}
                latest={m.id === lastId && !thinking}
                streaming={m.id === streamingId}
                stopSignal={m.id === streamingId ? stopSignal : 0}
                onStreamDone={onStreamDone}
                onOption={onOption}
                onUpload={onUpload}
                onPaste={onPaste}
              />
            ))}
            {thinking && <Thinking steps={thinking} />}
            {pending && !thinking && isStopped && (
              <div className="flex items-center gap-2 pl-8 text-[12.5px] text-fg-subtle">
                Stopped.
                <button type="button" onClick={retry} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-fg-muted hover:text-fg">
                  <RotateCcw size={12} /> Retry
                </button>
              </div>
            )}
            {pending && !thinking && !isStopped && !access.canUseAI && <p className="text-center text-[12.5px] text-fg-subtle">{access.reason}</p>}
          </div>
        </div>
      </div>

      <div className="relative shrink-0 px-3 pt-2 md:px-5" style={{ paddingBottom: "calc(var(--safe-bottom) + 10px)" }}>
        <AnimatePresence>
          {showJump && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              onClick={() => {
                stick.current = true;
                toBottom("smooth");
              }}
              aria-label="Jump to latest"
              className="absolute -top-11 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--line-strong)] bg-ink-800 text-fg shadow-lg"
            >
              <ArrowDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
        <Composer
          placeholder={person ? `Update on ${person.name}, or ask a follow-up…` : "Ask a follow-up or share more…"}
          disabledReason={access.reason}
          busy={busy}
          onStop={stop}
          onSubmit={onSubmit}
          leading={<PersonChip personId={thread.personId} onOpen={() => setPicking(true)} onClear={() => linkPerson(thread.id, undefined)} />}
        />
      </div>

      <input
        ref={filePick}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const { accepted, error } = validateScreenshots(Array.from(e.target.files ?? []));
          e.target.value = "";
          if (error) toast(error, "info");
          if (accepted.length) setReview({ files: accepted, personId: thread.personId });
        }}
      />

      <ReviewFlow
        input={review}
        onClose={() => setReview(null)}
        onComplete={(draft, personId) => {
          setReview(null);
          submitDraft(draft, personId);
        }}
      />
      <PasteSheet
        open={paste}
        onClose={() => setPaste(false)}
        onReview={(text) => {
          setPaste(false);
          setReview({ files: [], pasted: text, personId: thread.personId });
        }}
      />
      <PersonSheet
        open={picking}
        onClose={() => setPicking(false)}
        selected={thread.personId}
        returnTo={`/app/chat/${thread.id}`}
        onSelect={(pid) => {
          linkPerson(thread.id, pid);
          setPicking(false);
        }}
      />
      <Sheet open={menu} onClose={() => setMenu(false)} title="This conversation">
        <div className="flex flex-col gap-1">
          {person && (
            <Link href={`/app/people/${person.id}`} className="rounded-[10px] px-3 py-2.5 text-[14px] text-fg hover:bg-white/[0.04]">
              Open {person.name}&apos;s profile
            </Link>
          )}
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14px] text-danger hover:bg-danger/[0.06]"
            onClick={() => {
              mutate((d) => {
                d.threads = d.threads.filter((t) => t.id !== thread.id);
              });
              toast("Conversation deleted");
              router.replace("/app/chats");
            }}
          >
            <Trash2 size={15} strokeWidth={1.75} />
            Delete this conversation
          </button>
          <p className="px-3 pt-1 text-[12px] leading-relaxed text-fg-subtle">
            Deleting removes the messages and screenshots. Facts you saved to a profile stay until you delete them there.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
