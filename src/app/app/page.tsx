"use client";

import { ChevronRight, Compass, Eye, ImagePlus, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { previewOf, useCoachActions, type Draft } from "@/lib/actions";
import { validateScreenshots } from "@/lib/files";
import { haptic } from "@/lib/haptics";
import { accessFor, useAccount } from "@/lib/store";
import { stageLabel, type Intent } from "@/lib/types";
import { cn, partOfDay, relativeTime } from "@/lib/util";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { ReviewFlow, type ReviewInput } from "@/components/chat/ReviewFlow";
import { PersonChip, PersonSheet } from "@/components/chat/PersonConnect";
import { EndedScreen } from "@/components/account/EndedScreen";
import { Orb, type OrbState } from "@/components/orb/Orb";
import { PersonAvatar, UserAvatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { LogoMark, Wordmark } from "@/components/ui/Wordmark";

const SHORTCUTS: { intent: Intent; label: string; hint: string; icon: typeof ImagePlus }[] = [
  { intent: "upload", label: "Upload screenshots", hint: "I'll read the chat for you", icon: ImagePlus },
  { intent: "decide", label: "Help me decide", hint: "One clear next move", icon: Compass },
  { intent: "understand", label: "Understand this", hint: "What's really going on", icon: Eye },
  { intent: "respond", label: "Help me respond", hint: "In your own voice", icon: PenLine },
];

export default function LobbyPage() {
  return (
    <Suspense fallback={null}>
      <Lobby />
    </Suspense>
  );
}

function Lobby() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { data } = useAccount();
  const { startThread } = useCoachActions();
  const access = accessFor(data);
  const [orb, setOrb] = useState<OrbState>("idle");
  const [review, setReview] = useState<ReviewInput | null>(null);
  const [pendingIntent, setPendingIntent] = useState<Intent>("upload");
  const filePick = useRef<HTMLInputElement>(null);
  const [connected, setConnected] = useState<string | undefined>(() => params.get("with") ?? undefined);
  const [picking, setPicking] = useState(false);

  // Arriving back from setting up a new person: keep her connected, tidy the URL.
  useEffect(() => {
    const w = params.get("with");
    if (w) {
      setConnected(w);
      router.replace("/app", { scroll: false });
    }
  }, [params, router]);

  useEffect(() => {
    if (!data.onboarded && data.subscription.status !== "ended") router.replace("/onboarding");
  }, [data.onboarded, data.subscription.status, router]);

  const onActive = useCallback((active: boolean) => setOrb(active ? "listening" : "idle"), []);

  if (data.subscription.status === "ended") return <EndedScreen />;

  const go = (opts: { intent: Intent; personId?: string; draft?: Draft }) => {
    const id = startThread(opts);
    router.push(`/app/chat/${id}`);
  };

  /** Link the conversation when the message names someone the coach already knows. */
  const mentionedPerson = (text: string) =>
    data.people.find((p) => new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text))?.id;

  const onSubmit = ({ text, files, reviewPaste }: ComposerSubmit) => {
    if (files.length || reviewPaste) {
      setPendingIntent(files.length ? "upload" : "understand");
      const personId = connected ?? mentionedPerson(text);
      setReview(reviewPaste ? { files: [], pasted: text, personId } : { files, text: text || undefined, personId });
      return;
    }
    go({ intent: "open", personId: connected ?? mentionedPerson(text), draft: { text } });
  };

  const onShortcut = (intent: Intent) => {
    haptic("selection");
    if (!access.canUseAI) return toast(access.reason!, "info");
    if (intent === "upload") return filePick.current?.click();
    go({ intent, personId: connected });
  };

  const recent = data.threads.slice(0, 4);
  const people = data.people.filter((p) => p.stage !== "ended").slice(0, 6);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[720px] flex-col px-4 md:px-8">
      <header className="pt-safe flex h-14 items-center justify-between md:h-16">
        <span className="md:invisible">
          <Wordmark size="sm" />
        </span>
        <Link
          href="/app/account"
          aria-label="Account"
          className="rounded-full transition-opacity active:opacity-70"
        >
          <UserAvatar name={data.profile.name} src={data.profile.avatarUrl} size={32} />
        </Link>
      </header>

      <section className="flex flex-col items-center pt-1 text-center">
        <Orb state={orb} className="-my-4 w-[min(52vw,210px)] md:w-[240px]" />
        <p className="mt-1 text-[13px] text-fg-subtle">
          {partOfDay()}, {data.profile.name}
        </p>
        <h1 className="display mt-1.5 max-w-[440px] text-[25px] leading-[1.15] text-fg md:text-[30px]">What&apos;s going on in your dating life?</h1>
      </section>

      <div className="mt-5">
        <Composer
          variant="hero"
          placeholder={connected ? `What's happening with ${data.people.find((p) => p.id === connected)?.name ?? "her"}?` : "Describe it, ask, or paste the messages…"}
          disabledReason={access.reason}
          onSubmit={onSubmit}
          onActiveChange={onActive}
          leading={<PersonChip personId={connected} onOpen={() => setPicking(true)} onClear={() => setConnected(undefined)} />}
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
          if (accepted.length) {
            setPendingIntent("upload");
            setReview({ files: accepted, personId: connected });
          }
        }}
      />

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {SHORTCUTS.map((s) => (
          <button
            key={s.intent}
            type="button"
            onClick={() => onShortcut(s.intent)}
            className="focus-ring card flex flex-col items-start gap-2.5 rounded-[13px] p-3 text-left transition-colors duration-150 hover:bg-ink-850 active:bg-ink-800"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink-700 text-fg">
              <s.icon size={16} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[13.5px] font-medium leading-tight text-fg">{s.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-subtle">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {(
        <section className="mt-7">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="eyebrow">Talk about</h2>
            <Link href="/app/people" className="text-[12px] text-fg-subtle hover:text-fg">
              See all
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  haptic("selection");
                  setConnected(connected === p.id ? undefined : p.id);
                }}
                className={cn(
                  "card flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 transition-colors duration-150",
                  connected === p.id ? "border-white/30 bg-ink-800" : "hover:bg-ink-850",
                )}
              >
                <PersonAvatar id={p.id} name={p.name} size={28} />
                <span className="text-[13px] font-medium text-fg">{p.name}</span>
                <span className="text-[11.5px] text-fg-subtle">{stageLabel(p.stage)}</span>
              </button>
            ))}
            <Link href="/app/people/new?return=/app" className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[var(--line-strong)] px-3.5 text-[13px] text-fg-subtle hover:text-fg">
              <Plus size={14} /> Add someone
            </Link>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-6 pb-6">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="eyebrow">Recent</h2>
            <Link href="/app/chats" className="text-[12px] text-fg-subtle hover:text-fg">
              All chats
            </Link>
          </div>
          <div className="card divide-y divide-[var(--line)] overflow-hidden">
            {recent.map((t) => {
              const p = data.people.find((x) => x.id === t.personId);
              return (
                <Link key={t.id} href={`/app/chat/${t.id}`} className="flex items-center gap-3 px-3.5 py-3 transition-colors duration-100 hover:bg-ink-850">
                  {p ? <PersonAvatar id={p.id} name={p.name} size={32} /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700"><LogoMark size={16} /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-fg">{t.title}</p>
                    <p className="truncate text-[12px] text-fg-subtle">{previewOf(t)}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-fg-faint">{relativeTime(t.updatedAt)}</span>
                  <ChevronRight size={15} className="shrink-0 text-fg-faint" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <PersonSheet
        open={picking}
        onClose={() => setPicking(false)}
        selected={connected}
        returnTo="/app"
        onSelect={(id) => {
          setConnected(id);
          setPicking(false);
        }}
      />

      <ReviewFlow
        input={review}
        onClose={() => setReview(null)}
        onComplete={(draft, personId) => {
          setReview(null);
          go({ intent: pendingIntent, personId, draft });
        }}
      />
    </div>
  );
}
