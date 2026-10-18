"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCoachActions } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { CONCERNS, HER, HOW_LONG, MET, WANT } from "@/lib/personOptions";
import { STAGES, type StageId } from "@/lib/types";
import { cn } from "@/lib/util";
import { Button, Chip, IconButton, Input, PersonAvatar, Textarea } from "@/components/ui/primitives";

const ease = [0.22, 1, 0.36, 1] as const;

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function NewPersonPage() {
  return (
    <Suspense fallback={null}>
      <NewPerson />
    </Suspense>
  );
}

function NewPerson() {
  const router = useRouter();
  const params = useSearchParams();
  const back = params.get("return");
  const { createPerson } = useCoachActions();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [metVia, setMetVia] = useState("");
  const [stage, setStage] = useState<StageId | null>(null);
  const [howLong, setHowLong] = useState("");
  const [want, setWant] = useState<string[]>([]);
  const [wantOther, setWantOther] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [concernOther, setConcernOther] = useState("");
  const [her, setHer] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const who = name.trim() || "her";
  const steps = [
    { q: "Who is she?", sub: "A first name or nickname is enough. Only you will see this.", ok: name.trim().length > 0 },
    { q: `Where are things with ${who}?`, sub: "The coach adjusts every read to the stage.", ok: Boolean(stage) },
    { q: "What do you want from this?", sub: "Pick what fits. Be honest — it changes the advice.", ok: want.length > 0 || wantOther.trim().length > 0 },
    { q: "What's on your mind?", sub: "What you're unsure or worried about right now.", ok: true },
    { q: `What's ${who} like?`, sub: "Anything that helps read her messages in context.", ok: true },
    { q: `Meet ${who}'s profile`, sub: "Here's what your coach will remember. You can edit it any time.", ok: true },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  const go = (d: number) => {
    setDir(d);
    setStep((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  };

  const finish = () => {
    const id = createPerson({
      name,
      stage: stage ?? "talking",
      metVia,
      profile: {
        howLong: howLong || undefined,
        want: [...want, ...(wantOther.trim() ? [wantOther.trim()] : [])],
        concerns: [...concerns.filter((c) => c !== "Nothing yet"), ...(concernOther.trim() ? [concernOther.trim()] : [])],
        her,
        notes: notes.trim() || undefined,
      },
    });
    setCreated(id);
    haptic("success");
    setTimeout(() => {
      if (back) router.replace(`${back}${back.includes("?") ? "&" : "?"}with=${id}`);
      else router.replace(`/app/people/${id}`);
    }, 1100);
  };

  const summary = [
    ["Stage", [STAGES.find((x) => x.id === stage)?.label, howLong].filter(Boolean).join(" · ")],
    ["Met", metVia],
    ["You want", [...want, wantOther.trim()].filter(Boolean).join(", ")],
    ["On your mind", [...concerns, concernOther.trim()].filter((c) => c && c !== "Nothing yet").join(", ")],
    ["She's", her.join(", ")],
    ["Notes", notes.trim()],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-4">
      <header className="pt-safe flex h-14 items-center gap-2">
        <IconButton label={step === 0 ? "Close" : "Back"} onClick={() => (step === 0 ? router.back() : go(-1))} className="-ml-2">
          {step === 0 ? <X size={19} /> : <ChevronLeft size={20} />}
        </IconButton>
        <div className="flex flex-1 gap-1">
          {steps.map((_, i) => (
            <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink-700">
              <motion.span className="block h-full bg-white" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4, ease }} />
            </span>
          ))}
        </div>
        <span className="w-9" />
      </header>

      <div className="relative flex-1">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.main
            key={step}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 40, filter: "blur(4px)" }),
              center: { opacity: 1, x: 0, filter: "blur(0px)" },
              exit: (d: number) => ({ opacity: 0, x: d * -40, filter: "blur(4px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease }}
            className="pb-32 pt-6"
          >
            <h1 className="display text-[26px] leading-[1.15] text-fg">{s.q}</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-fg-subtle">{s.sub}</p>

            <div className="mt-7">
              {step === 0 && (
                <div className="flex flex-col gap-6">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Her name" autoFocus maxLength={30} className="h-12 text-[17px]" onKeyDown={(e) => e.key === "Enter" && s.ok && go(1)} />
                  <div>
                    <p className="eyebrow mb-2.5">Where you met</p>
                    <div className="flex flex-wrap gap-2">
                      {MET.map((m) => (
                        <Chip key={m} active={metVia === m} onClick={() => setMetVia(metVia === m ? "" : m)}>
                          {m}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div className="card divide-y divide-[var(--line)] overflow-hidden">
                    {STAGES.filter((x) => x.id !== "ended").map((x) => (
                      <button key={x.id} type="button" onClick={() => setStage(x.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-850">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-medium text-fg">{x.label}</span>
                          <span className="block text-[12.5px] text-fg-subtle">{x.hint}</span>
                        </span>
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border transition-colors", stage === x.id ? "border-white bg-white text-black" : "border-[var(--line-strong)]")}>
                          {stage === x.id && <Check size={12} strokeWidth={3} />}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="eyebrow mb-2.5">How long</p>
                    <div className="flex flex-wrap gap-2">
                      {HOW_LONG.map((m) => (
                        <Chip key={m} active={howLong === m} onClick={() => setHowLong(howLong === m ? "" : m)}>
                          {m}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {WANT.map((m) => (
                      <Chip key={m} active={want.includes(m)} onClick={() => setWant(toggle(want, m))}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                  <Input value={wantOther} onChange={(e) => setWantOther(e.target.value)} placeholder="Something else? Say it in your words" maxLength={120} />
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {CONCERNS.map((m) => (
                      <Chip key={m} active={concerns.includes(m)} onClick={() => setConcerns(m === "Nothing yet" ? ["Nothing yet"] : toggle(concerns.filter((c) => c !== "Nothing yet"), m))}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                  <Textarea value={concernOther} onChange={(e) => setConcernOther(e.target.value)} placeholder="What's the problem, in a sentence or two?" maxLength={280} />
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {HER.map((m) => (
                      <Chip key={m} active={her.includes(m)} onClick={() => setHer(toggle(her, m))}>
                        {m}
                      </Chip>
                    ))}
                  </div>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Her job, what she's going through, how she texts — anything useful." maxLength={400} />
                </div>
              )}

              {last && (
                <div className="card overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4">
                    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                      <PersonAvatar id={name || "new"} name={name || "?"} size={44} />
                    </motion.span>
                    <div>
                      <p className="text-[16px] font-semibold tracking-[-0.02em] text-fg">{name}</p>
                      <p className="text-[12.5px] text-fg-subtle">Private profile</p>
                    </div>
                  </div>
                  <dl className="divide-y divide-[var(--line)]">
                    {summary.map(([k, v], i) => (
                      <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }} className="flex gap-4 px-4 py-2.5">
                        <dt className="w-[96px] shrink-0 text-[12.5px] text-fg-subtle">{k}</dt>
                        <dd className="text-[13.5px] leading-snug text-fg">{v}</dd>
                      </motion.div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </motion.main>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-void via-void to-transparent px-4 pt-6" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
        <div className="mx-auto max-w-[560px]">
          <Button variant="bronze" size="lg" className="w-full" disabled={!s.ok || Boolean(created)} onClick={() => (last ? finish() : go(1))}>
            {last ? `Create ${who}'s profile` : step === 3 || step === 4 ? "Continue" : "Next"}
          </Button>
          {(step === 3 || step === 4) && (
            <button type="button" onClick={() => go(1)} className="mt-2 w-full py-1.5 text-[13px] text-fg-subtle hover:text-fg">
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Created */}
      <AnimatePresence>
        {created && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/95 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 20 }} className="relative">
              <PersonAvatar id={created} name={name} size={72} />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 500, damping: 18 }}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-void bg-white text-black"
              >
                <Check size={14} strokeWidth={3} />
              </motion.span>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 text-[16px] font-semibold text-fg">
              {name} is set up
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 text-[13px] text-fg-subtle">
              {back ? "Connecting her to your chat…" : "Opening her profile…"}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
