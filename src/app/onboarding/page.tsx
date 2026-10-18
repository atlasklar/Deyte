"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  CloudRain,
  Compass,
  Gem,
  Heart,
  HeartHandshake,
  HelpCircle,
  Scale,
  Smartphone,
  Smile,
  UserRound,
  Wine,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useAccount } from "@/lib/store";
import type { Profile, SelfMemoryItem } from "@/lib/types";
import { cn, nowIso, uid } from "@/lib/util";
import { Orb } from "@/components/orb/Orb";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Questions ─────────────────────────────────────────────── */

type Opt = { id: string; label: string; sub?: string; icon?: LucideIcon; sample?: string };

const SECTIONS = ["You", "Your dating life", "How you text", "Your coach"] as const;

const AGES: Opt[] = ["25–29", "30–34", "35–39", "40–44", "45+"].map((v) => ({ id: v, label: v }));

const SITUATIONS: Opt[] = [
  { id: "single", label: "Single, not dating much", sub: "Getting back out there", icon: UserRound },
  { id: "apps", label: "On the apps", sub: "Matching and messaging", icon: Smartphone },
  { id: "dating", label: "Going on dates", sub: "Meeting people in person", icon: Wine },
  { id: "seeing", label: "Seeing someone", sub: "Early days with one person", icon: Heart },
  { id: "relationship", label: "In a relationship", sub: "Committed to someone", icon: HeartHandshake },
  { id: "breakup", label: "Getting over someone", sub: "A recent breakup", icon: CloudRain },
];

const STRUGGLES: Record<string, string[]> = {
  single: ["Meeting women in the first place", "Starting conversations", "Turning chats into dates", "Knowing if she's interested", "Confidence"],
  apps: ["Getting good matches", "Keeping conversations going", "Turning chats into dates", "Knowing if she's interested", "My profile and photos"],
  dating: ["Knowing if she's interested", "Getting past the first few dates", "Texting between dates", "Leading and making a move", "Moving toward something exclusive"],
  seeing: ["Knowing where I stand", "Texting between dates", "Keeping the attraction", "Moving toward exclusive", "Not overthinking it"],
  relationship: ["Keeping the attraction alive", "Handling arguments", "Communicating what I need", "Trust", "Deciding about the future"],
  breakup: ["Getting over her", "Whether to reach out", "Getting back out there", "Confidence", "Understanding what went wrong"],
};

const LOOKING: Record<string, Opt[]> = {
  default: [
    { id: "serious", label: "Something serious", sub: "The right person, for the long run", icon: Gem },
    { id: "around", label: "Dating around for now", sub: "Meeting people, no rush", icon: Compass },
    { id: "unsure", label: "Not sure yet", sub: "I'll know when I know", icon: HelpCircle },
  ],
  relationship: [
    { id: "stronger", label: "A stronger relationship", sub: "Keep what we have and make it better", icon: HeartHandshake },
    { id: "decide", label: "Figure out if it's right", sub: "Get clear on where this is going", icon: HelpCircle },
  ],
};

const STYLES: Opt[] = ["Direct", "Dry humor", "Playful", "Warm", "Few words", "Detailed", "Sarcastic", "Thoughtful"].map((v) => ({ id: v, label: v }));

const EMOJI: (Opt & { id: Profile["emoji"] })[] = [
  { id: "never", label: "Never", sample: "sounds good, see you then" },
  { id: "sometimes", label: "Now and then", sample: "sounds good, see you then 🙂" },
  { id: "often", label: "All the time", sample: "sounds good!! see you then 😄🔥" },
];

const TONES: (Opt & { id: NonNullable<Profile["coachTone"]> })[] = [
  { id: "blunt", label: "Straight to the point", sub: "Tell me like it is. No sugarcoating.", icon: Zap },
  { id: "balanced", label: "Balanced", sub: "Honest, with the reasoning behind it.", icon: Scale },
  { id: "gentle", label: "Supportive", sub: "Encouraging while I figure it out.", icon: Smile },
];

const situationLabel = (id: string) => SITUATIONS.find((s) => s.id === id)?.label ?? id;

type Step =
  | { id: "intro"; kind: "intro" }
  | { id: "name"; kind: "text"; section: number; title: string; sub: string }
  | { id: string; kind: "single"; section: number; title: string; sub?: string; options: Opt[]; layout?: "grid" | "list" | "bubbles" }
  | { id: string; kind: "multi"; section: number; title: string; sub?: string; options: Opt[]; max: number; layout?: "grid" | "list" }
  | { id: "samples"; kind: "long"; section: number; title: string; sub: string }
  | { id: "ready"; kind: "ready" };

type Answers = { name: string; age?: string; situation?: string; struggles: string[]; looking?: string; style: string[]; emoji?: Profile["emoji"]; samples: string; tone?: Profile["coachTone"] };

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const { data, commit } = useAccount();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const editing = params.get("edit") === "1";

  // Setup happens once. Anyone who had already finished goes straight to their coach
  // (checked against the state on arrival, so finishing here doesn't skip the last screen).
  const finishedBefore = useRef(data.onboarded);
  useEffect(() => {
    if (finishedBefore.current && !editing) router.replace("/app");
  }, [editing, router]);

  const p = data.profile;
  const initialSituation = SITUATIONS.find((s) => p.situation[0]?.toLowerCase().includes(s.label.toLowerCase().split(",")[0].toLowerCase()))?.id;
  const [a, setA] = useState<Answers>({
    name: p.name,
    age: p.ageRange,
    situation: initialSituation,
    struggles: p.struggles ?? [],
    looking: p.lookingFor,
    style: p.style,
    emoji: p.emoji,
    samples: p.samples ?? "",
    tone: p.coachTone,
  });

  const steps: Step[] = useMemo(() => {
    const sit = a.situation ?? "single";
    return [
      ...(editing ? [] : [{ id: "intro", kind: "intro" } as const]),
      { id: "name", kind: "text", section: 0, title: "What should your coach call you?", sub: "First name is perfect." },
      { id: "age", kind: "single", section: 0, title: "How old are you?", sub: "Dating looks different at 27 than at 42.", options: AGES, layout: "grid" },
      { id: "situation", kind: "single", section: 1, title: "Where are you right now?", options: SITUATIONS },
      {
        id: "struggles",
        kind: "multi",
        section: 1,
        title: "What's been hardest lately?",
        sub: "Pick up to three. Your coach starts here.",
        options: STRUGGLES[sit].map((v) => ({ id: v, label: v })),
        max: 3,
      },
      { id: "looking", kind: "single", section: 1, title: sit === "relationship" ? "What do you want from it?" : "What are you looking for?", options: LOOKING[sit === "relationship" ? "relationship" : "default"] },
      { id: "style", kind: "multi", section: 2, title: "How would your friends describe your texting?", sub: "Up to three. Suggested replies will sound like you.", options: STYLES, max: 3, layout: "grid" },
      { id: "emoji", kind: "single", section: 2, title: "Emojis?", options: EMOJI, layout: "bubbles" },
      { id: "samples", kind: "long", section: 2, title: "Paste a few messages you've sent", sub: "Optional. The more your coach sees, the more replies sound like you." },
      { id: "tone", kind: "single", section: 3, title: "How should your coach talk to you?", options: TONES },
      { id: "ready", kind: "ready" },
    ];
  }, [a.situation, editing]);

  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const step = steps[Math.min(i, steps.length - 1)];
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (to: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir(to > i ? 1 : -1);
    setI(Math.max(0, Math.min(steps.length - 1, to)));
  };
  const next = () => go(i + 1);
  const back = () => (i === 0 ? editing && router.push("/app/account") : go(i - 1));

  const value = (id: string) => (a as Record<string, unknown>)[id];
  const pickSingle = (id: string, v: string) => {
    haptic("selection");
    setA((prev) => ({ ...prev, [id]: v, ...(id === "situation" && prev.situation !== v ? { struggles: [], looking: undefined } : {}) }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(next, 320);
  };
  const toggleMulti = (id: "struggles" | "style", v: string, max: number) => {
    setA((prev) => {
      const list = prev[id];
      if (list.includes(v)) return { ...prev, [id]: list.filter((x) => x !== v) };
      if (list.length >= max) return prev;
      haptic("selection");
      return { ...prev, [id]: [...list, v] };
    });
  };

  const valid =
    step.kind === "text" ? a.name.trim().length > 0 : step.kind === "multi" ? (value(step.id) as string[]).length > 0 : step.kind === "single" ? Boolean(value(step.id)) : true;

  /* ── Save ── */
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const at = nowIso();
    const name = a.name.trim();
    const sit = a.situation ? situationLabel(a.situation) : undefined;
    const looking = [...LOOKING.default, ...LOOKING.relationship].find((o) => o.id === a.looking)?.label;
    const items: SelfMemoryItem[] = [
      ...(sit ? [{ id: uid("mem"), category: "context" as const, text: `Currently: ${sit.toLowerCase()}${a.age ? `, age ${a.age}` : ""}.`, source: "onboarding" as const, createdAt: at }] : []),
      ...(looking ? [{ id: uid("mem"), category: "goal" as const, text: `Looking for: ${looking.toLowerCase()}.`, source: "onboarding" as const, createdAt: at }] : []),
      ...a.struggles.map((g) => ({ id: uid("mem"), category: "goal" as const, text: `Wants help with: ${g.toLowerCase()}.`, source: "onboarding" as const, createdAt: at })),
      ...(a.style.length ? [{ id: uid("mem"), category: "style" as const, text: `Texting style: ${a.style.join(", ").toLowerCase()}.`, source: "onboarding" as const, createdAt: at }] : []),
      {
        id: uid("mem"),
        category: "voice",
        text: a.emoji === "never" ? "Never uses emojis." : a.emoji === "often" ? "Uses emojis freely." : "Uses the occasional emoji.",
        source: "onboarding",
        createdAt: at,
      },
    ];
    await commit((d) => {
      d.profile = {
        ...d.profile,
        name: name || d.profile.name,
        ageRange: a.age,
        situation: sit ? [sit] : [],
        lookingFor: looking,
        struggles: a.struggles,
        goals: a.struggles,
        style: a.style,
        emoji: a.emoji ?? "sometimes",
        samples: a.samples.trim() || undefined,
        coachTone: a.tone ?? "balanced",
      };
      d.self = [...d.self.filter((x) => x.source !== "onboarding"), ...items];
      d.onboarded = true;
    });
    setSaved(true);
  };

  useEffect(() => {
    if (step.kind === "ready" && !saved) void save();
    // Save once, when the last screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  const section = "section" in step ? step.section : step.kind === "ready" ? SECTIONS.length : -1;
  const inSection = steps.filter((s) => "section" in s && s.section === section);
  const posInSection = inSection.findIndex((s) => s.id === step.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-5">
      {/* Top bar: back, section name, progress by section */}
      <header className="pt-safe pt-2">
        <div className="flex h-14 items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label={i === 0 && editing ? "Close" : "Back"}
            className={cn("-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:text-fg", (step.kind === "intro" || step.kind === "ready" || (i === 0 && !editing)) && "invisible")}
          >
            {i === 0 && editing ? <X size={20} strokeWidth={1.75} /> : <ChevronLeft size={22} strokeWidth={1.6} />}
          </button>
          <div className="flex-1">
            <AnimatePresence mode="wait" initial={false}>
              {section >= 0 && section < SECTIONS.length && (
                <motion.p key={section} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="mb-1.5 text-center text-[12px] font-medium text-fg-subtle">
                  {SECTIONS[section]}
                </motion.p>
              )}
            </AnimatePresence>
            {step.kind !== "intro" && (
              <div className="flex gap-1.5">
                {SECTIONS.map((_, si) => {
                  const fill = si < section ? 1 : si === section ? (posInSection + 1) / Math.max(1, inSection.length) : 0;
                  return (
                    <span key={si} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.span className="block h-full rounded-full bg-white" initial={false} animate={{ width: `${fill * 100}%` }} transition={{ duration: 0.45, ease }} />
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <span className="w-10" />
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.main
          key={step.id}
          custom={dir}
          initial={{ opacity: 0, x: dir * 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -36 }}
          transition={{ duration: 0.28, ease }}
          className="flex flex-1 flex-col pb-6"
        >
          {step.kind === "intro" && <Intro name={a.name} onStart={next} />}

          {step.kind === "ready" && <Ready name={a.name.trim() || p.name} saved={saved} editing={editing} onOpen={() => {
            if (editing) {
              toast("Saved");
              router.push("/app/account");
            } else router.replace("/app");
          }} />}

          {"section" in step && (
            <>
              <h1 className="display mt-6 text-[27px] leading-[1.12] text-fg">{step.title}</h1>
              {"sub" in step && step.sub && <p className="mt-2.5 text-[14.5px] leading-relaxed text-fg-muted">{step.sub}</p>}

              <div className="mt-7">
                {step.kind === "text" && (
                  <input
                    autoFocus
                    value={a.name}
                    onChange={(e) => setA({ ...a, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && valid && next()}
                    maxLength={40}
                    autoComplete="given-name"
                    placeholder="Your first name"
                    className="w-full border-b border-[var(--line-strong)] bg-transparent pb-3 text-[30px] font-semibold tracking-[-0.03em] text-fg placeholder:text-fg-faint focus:border-white/60 focus:outline-none"
                  />
                )}

                {step.kind === "single" && (
                  <div className={cn(step.layout === "grid" ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5")}>
                    {step.options.map((o, k) => (
                      <OptionCard key={o.id} index={k} opt={o} active={value(step.id) === o.id} onClick={() => pickSingle(step.id, o.id)} compact={step.layout === "grid"} bubble={step.layout === "bubbles"} />
                    ))}
                  </div>
                )}

                {step.kind === "multi" && (
                  <>
                    <div className={cn(step.layout === "grid" ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5")}>
                      {step.options.map((o, k) => {
                        const list = value(step.id) as string[];
                        const active = list.includes(o.id);
                        return <OptionCard key={o.id} index={k} opt={o} active={active} dim={!active && list.length >= step.max} onClick={() => toggleMulti(step.id as "struggles" | "style", o.id, step.max)} compact={step.layout === "grid"} multi />;
                      })}
                    </div>
                    <p className="mt-3 text-center text-[12.5px] text-fg-subtle">
                      {(value(step.id) as string[]).length} of {step.max} picked
                    </p>
                  </>
                )}

                {step.kind === "long" && (
                  <textarea
                    value={a.samples}
                    onChange={(e) => setA({ ...a, samples: e.target.value })}
                    maxLength={1200}
                    rows={6}
                    placeholder={"haha fair. thursday works, I'll pick the place\n\nyou're trouble. 8pm?"}
                    className="w-full resize-none rounded-[14px] border border-[var(--line-strong)] bg-ink-900 px-4 py-3.5 text-[15px] leading-relaxed text-fg placeholder:text-fg-faint focus:border-white/30 focus:outline-none"
                  />
                )}
              </div>

              {/* Single-choice questions move on by themselves; others confirm here. */}
              <div className="mt-auto pt-8" style={{ paddingBottom: "var(--safe-bottom)" }}>
                {step.kind === "single" ? (
                  value(step.id) ? (
                    <Button variant="bronze" size="lg" className="w-full" onClick={next}>
                      Continue
                    </Button>
                  ) : (
                    <p className="text-center text-[12.5px] text-fg-faint">Tap one to continue</p>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="bronze" size="lg" className="w-full" disabled={!valid} onClick={next}>
                      Continue
                    </Button>
                    {step.kind === "long" && !a.samples.trim() && (
                      <button type="button" onClick={next} className="h-10 text-[14px] text-fg-subtle hover:text-fg">
                        Skip for now
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

/* ── Pieces ────────────────────────────────────────────────── */

function OptionCard({ opt, active, onClick, index, compact, multi, dim, bubble }: { opt: Opt; active: boolean; onClick: () => void; index: number; compact?: boolean; multi?: boolean; dim?: boolean; bubble?: boolean }) {
  const Icon = opt.icon;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: dim ? 0.45 : 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: 0.04 + index * 0.035 }}
      whileTap={{ scale: 0.975 }}
      aria-pressed={active}
      className={cn(
        "relative flex w-full items-center gap-3.5 rounded-[14px] border text-left transition-colors duration-200",
        compact ? "min-h-[58px] px-4 py-3" : "min-h-[64px] px-4 py-3.5",
        active ? "border-white/70 bg-white/[0.07]" : "border-[var(--line)] bg-ink-900 hover:bg-ink-850",
      )}
    >
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200", active ? "bg-white text-black" : "bg-ink-800 text-fg-muted")}>
          <Icon size={18} strokeWidth={1.8} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block font-medium text-fg", compact ? "text-[15px]" : "text-[15.5px]")}>{opt.label}</span>
        {opt.sub && <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-subtle">{opt.sub}</span>}
        {bubble && opt.sample && (
          <span className="mt-2 inline-block rounded-[14px] rounded-br-[5px] bg-[#2f6bff] px-3 py-1.5 text-[13.5px] text-white">{opt.sample}</span>
        )}
      </span>
      <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center border transition-colors duration-200", multi ? "rounded-[7px]" : "rounded-full", active ? "border-white bg-white" : "border-white/20")}>
        <AnimatePresence>
          {active && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 26 }}>
              <Check size={14} strokeWidth={3} className="text-black" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

function Intro({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col text-center">
      <Orb className="mx-auto -mt-2 w-[min(52vw,230px)]" />
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.1 }} className="display -mt-2 text-[30px] leading-[1.1] text-fg">
        {name ? `Hey ${name}.` : "Hey."}
        <br />
        Let&apos;s get to know you.
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.2 }} className="mx-auto mt-3 max-w-[340px] text-[15px] leading-relaxed text-fg-muted">
        Nine quick questions so your coach knows your situation and how you talk. You only do this once.
      </motion.p>
      <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.32 }} className="mx-auto mt-5 flex flex-col gap-2 text-left text-[14px] text-fg-muted">
        {SECTIONS.map((s, k) => (
          <li key={s} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 text-[11.5px] font-semibold text-fg">{k + 1}</span>
            {s}
          </li>
        ))}
      </motion.ul>
      <div className="mt-auto pt-6" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <Button variant="bronze" size="lg" className="w-full" onClick={onStart}>
          Let&apos;s go
        </Button>
        <p className="mt-3 text-[12px] text-fg-faint">About 2 minutes · private to your account</p>
      </div>
    </div>
  );
}

const BUILD = ["Learning your situation", "Matching how you text", "Loading what actually works", "Setting up your memory"];

function Ready({ name, saved, editing, onOpen }: { name: string; saved: boolean; editing: boolean; onOpen: () => void }) {
  const [done, setDone] = useState(editing ? BUILD.length : 0);
  useEffect(() => {
    if (done >= BUILD.length) return;
    const t = setTimeout(() => {
      setDone((d) => d + 1);
      haptic("selection");
    }, 650);
    return () => clearTimeout(t);
  }, [done]);
  const ready = saved && done >= BUILD.length;
  useEffect(() => {
    if (ready && !editing) haptic("success");
  }, [ready, editing]);

  return (
    <div className="flex flex-1 flex-col text-center">
      <Orb className="mx-auto mt-2 w-[min(64vw,250px)]" state={ready ? "idle" : "thinking"} />
      <AnimatePresence mode="wait">
        <motion.h1 key={ready ? "ready" : "building"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="display -mt-2 text-[28px] leading-[1.15] text-fg">
          {ready ? (editing ? "All updated" : `You're all set, ${name}`) : "Building your coach…"}
        </motion.h1>
      </AnimatePresence>
      <ul className="mx-auto mt-7 flex w-full max-w-[320px] flex-col gap-3 text-left">
        {BUILD.map((b, k) => (
          <li key={b} className={cn("flex items-center gap-3 text-[14.5px] transition-colors duration-300", k < done ? "text-fg" : "text-fg-faint")}>
            <span className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-colors duration-300", k < done ? "border-[#2fb36a] bg-[#2fb36a]" : "border-white/15")}>
              {k < done ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 24 }}>
                  <Check size={13} strokeWidth={3} className="text-white" />
                </motion.span>
              ) : k === done ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              ) : null}
            </span>
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-10" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <Button variant="bronze" size="lg" className="w-full" disabled={!ready} onClick={onOpen}>
          {editing ? "Done" : "Meet your coach"}
        </Button>
      </div>
    </div>
  );
}
