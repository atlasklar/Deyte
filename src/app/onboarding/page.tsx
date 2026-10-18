"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "@/lib/store";
import type { Profile, SelfMemoryItem } from "@/lib/types";
import { cn, nowIso, uid } from "@/lib/util";
import { Orb } from "@/components/orb/Orb";
import { Button, Chip, IconButton, Textarea } from "@/components/ui/primitives";

const ease = [0.22, 1, 0.36, 1] as const;

const SITUATIONS = ["On the apps", "Going on dates", "Seeing someone", "In a relationship"];
const AGES = ["25–29", "30–34", "35–44", "45+"];
const GOALS = [
  "Know where I stand faster",
  "Turn good chats into dates",
  "Build more attraction",
  "Stop wasting effort on one-sided interest",
  "Find something serious",
  "Move toward exclusive",
  "Keep things strong with my girlfriend",
  "Handle disagreements better",
];
const STYLES = ["Direct", "Dry humor", "Playful", "Warm", "Few words", "Detailed"];
const EMOJI: Profile["emoji"][] = ["never", "sometimes", "often"];

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function Onboarding() {
  const { data, mutate } = useAccount();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<string[]>(data.profile.situation);
  const [age, setAge] = useState(data.profile.ageRange);
  const [goals, setGoals] = useState<string[]>(data.profile.goals);
  const [style, setStyle] = useState<string[]>(data.profile.style);
  const [emoji, setEmoji] = useState<Profile["emoji"]>(data.profile.emoji);
  const [samples, setSamples] = useState(data.profile.samples ?? "");

  const steps = [
    {
      title: "Let's set up your coach",
      body: "Two minutes. It learns what you want and how you talk, so advice fits your life. Everything stays private to your account.",
      valid: true,
    },
    { title: "Where are you right now?", body: "Pick all that apply.", valid: situation.length > 0 },
    { title: "What do you want from this?", body: "Choose up to three.", valid: goals.length > 0 },
    { title: "How do you text?", body: "Suggested replies will sound like you, not a script.", valid: style.length > 0 },
    { title: "Your coach is ready", body: "Here's what it will remember. You can edit or delete any of it in Memory.", valid: true },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  const finish = () => {
    const at = nowIso();
    const items: SelfMemoryItem[] = [
      ...goals.map((g) => ({ id: uid("mem"), category: "goal" as const, text: g, source: "onboarding" as const, createdAt: at })),
      { id: uid("mem"), category: "style", text: `${style.join(", ")}.`, source: "onboarding", createdAt: at },
      { id: uid("mem"), category: "voice", text: emoji === "never" ? "Never uses emojis." : emoji === "often" ? "Uses emojis freely." : "Uses the occasional emoji.", source: "onboarding", createdAt: at },
      ...(situation.length ? [{ id: uid("mem"), category: "context" as const, text: `Currently: ${situation.join(", ").toLowerCase()}.`, source: "onboarding" as const, createdAt: at }] : []),
    ];
    mutate((d) => {
      d.profile = { ...d.profile, situation, ageRange: age, goals, style, emoji, samples: samples.trim() || undefined };
      d.self = [...d.self.filter((x) => x.source !== "onboarding"), ...items];
      d.onboarded = true;
    });
    router.replace("/app");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-5">
      <header className="pt-safe flex h-16 items-center justify-between pt-2">
        <IconButton label="Back" onClick={() => setStep((x) => Math.max(0, x - 1))} className={cn("-ml-2", step === 0 && "invisible")}>
          <ChevronLeft size={21} strokeWidth={1.6} />
        </IconButton>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1 rounded-full transition-all duration-500", i <= step ? "w-6 bg-white" : "w-3 bg-white/10")} />
          ))}
        </div>
        <span className="w-10" />
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: 0.55, ease }}
          className="flex flex-1 flex-col pb-6"
        >
          {(step === 0 || last) && <Orb className="mx-auto -mb-4 w-[min(70vw,280px)]" state={last ? "thinking" : "idle"} />}
          <h1 className={cn("display text-[26px] leading-[1.15] text-fg", (step === 0 || last) && "text-center")}>{s.title}</h1>
          <p className={cn("mt-3 text-[15px] leading-relaxed text-fg-muted", (step === 0 || last) && "text-center")}>{s.body}</p>

          <div className="mt-8 flex flex-col gap-7">
            {step === 1 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {SITUATIONS.map((v) => (
                    <Chip key={v} active={situation.includes(v)} onClick={() => setSituation(toggle(situation, v))}>
                      {v}
                    </Chip>
                  ))}
                </div>
                <div>
                  <p className="eyebrow mb-3">Your age</p>
                  <div className="flex flex-wrap gap-2">
                    {AGES.map((v) => (
                      <Chip key={v} active={age === v} onClick={() => setAge(v)}>
                        {v}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                {GOALS.map((v) => (
                  <Chip key={v} active={goals.includes(v)} onClick={() => (goals.includes(v) || goals.length < 3) && setGoals(toggle(goals, v))}>
                    {v}
                  </Chip>
                ))}
              </div>
            )}
            {step === 3 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((v) => (
                    <Chip key={v} active={style.includes(v)} onClick={() => setStyle(toggle(style, v))}>
                      {v}
                    </Chip>
                  ))}
                </div>
                <div>
                  <p className="eyebrow mb-3">Emojis</p>
                  <div className="flex gap-2">
                    {EMOJI.map((v) => (
                      <Chip key={v} active={emoji === v} onClick={() => setEmoji(v)} className="flex-1 justify-center capitalize">
                        {v}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-3">A few messages you&apos;ve sent · optional</p>
                  <Textarea value={samples} onChange={(e) => setSamples(e.target.value)} placeholder={"ha fair. thursday works — I'll pick the place"} maxLength={800} />
                </div>
              </>
            )}
            {last && (
              <ul className="card flex flex-col gap-2.5 px-5 py-4 text-[14.5px]">
                {[...goals, style.join(", "), `Emojis: ${emoji}`, situation.join(", ")].filter(Boolean).map((v) => (
                  <li key={v} className="flex gap-2.5 text-fg">
                    <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-fg-muted" />
                    {v}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-auto pt-10" style={{ paddingBottom: "var(--safe-bottom)" }}>
            <Button variant="bronze" size="lg" className="w-full" disabled={!s.valid} onClick={() => (last ? finish() : setStep(step + 1))}>
              {step === 0 ? "Begin" : last ? "Open your coach" : "Continue"}
            </Button>
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
