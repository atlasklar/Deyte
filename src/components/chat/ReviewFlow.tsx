"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCoachActions, type Draft } from "@/lib/actions";
import { coach } from "@/lib/coach/engine";
import { parsePasted } from "@/lib/coach/parse";
import { makeThumb } from "@/lib/files";
import { useAccount } from "@/lib/store";
import { STAGES, type Attachment, type ChatLine, type StageId } from "@/lib/types";
import { cn, sleep, uid } from "@/lib/util";
import { Button, Chip, Input, Loader9, PersonAvatar, Textarea, Toggle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

export type ReviewInput = { files: File[]; pasted?: string; text?: string; personId?: string };

type Step = "reading" | "review" | "context";

/**
 * Screenshot / paste review: the coach shows what it read, the user corrects
 * text and senders, then adds the background that matters before analysis.
 */
export function ReviewFlow({
  input,
  onClose,
  onComplete,
}: {
  input: ReviewInput | null;
  onClose: () => void;
  onComplete: (draft: Draft, personId?: string) => void;
}) {
  const { data, mutate } = useAccount();
  const { createPerson } = useCoachActions();
  const [step, setStep] = useState<Step>("reading");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | undefined>();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newStage, setNewStage] = useState<StageId>("talking");
  const [metInPerson, setMetInPerson] = useState(false);
  const [planExists, setPlanExists] = useState(false);
  const [disagreement, setDisagreement] = useState(false);
  const [notes, setNotes] = useState("");
  const run = useRef(0);
  const [phase, setPhase] = useState<"upload" | "read">("upload");
  const [progress, setProgress] = useState(0);

  const person = data.people.find((p) => p.id === personId);
  const themLabel = person?.name || (creating && newName.trim()) || "Them";
  const fromScreens = (input?.files.length ?? 0) > 0;

  useEffect(() => {
    if (!input) return;
    const token = ++run.current;
    setStep("reading");
    setEditing(null);
    setPersonId(input.personId);
    setCreating(false);
    setNewName("");
    setNotes("");
    const p = data.people.find((x) => x.id === input.personId);
    setMetInPerson(Boolean(p && !["matched", "talking"].includes(p.stage)));
    setPlanExists(false);
    setDisagreement(false);
    setProgress(0);
    setPhase(input.files.length ? "upload" : "read");
    (async () => {
      let extracted: ChatLine[];
      let thumbs: Attachment[] = [];
      if (input.files.length) {
        // Upload at a believable speed for the real file sizes, then read.
        const bytes = input.files.reduce((n, f) => n + f.size, 0);
        const ms = Math.min(3200, Math.max(900, bytes / 1800));
        const t0 = performance.now();
        const thumbsP = Promise.all(input.files.map((f) => makeThumb(f)));
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (token !== run.current) return resolve();
            const k = Math.min(1, (performance.now() - t0) / ms);
            setProgress(1 - Math.pow(1 - k, 2));
            if (k < 1) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        if (token !== run.current) return;
        setPhase("read");
        [extracted, thumbs] = await Promise.all([coach.extract(input.files, p), thumbsP]);
      } else {
        await sleep(700);
        extracted = parsePasted(input.pasted ?? "");
      }
      if (token !== run.current) return;
      setLines(extracted.slice(0, 80));
      setAttachments(thumbs);
      setStep("review");
    })();
    // Re-run only when a new review starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const updateLine = (id: string, patch: Partial<ChatLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const finish = () => {
    let pid = personId;
    if (creating && newName.trim()) pid = createPerson({ name: newName, stage: newStage });
    const clean = lines.filter((l) => l.text.trim());
    onComplete(
      {
        text: input?.text,
        attachments: attachments.length ? attachments : undefined,
        extracted: clean.length ? clean : undefined,
        background: { metInPerson, planExists, disagreement, notes: notes.trim() || undefined },
      },
      pid,
    );
  };

  const title = step === "reading" ? "Reading it" : step === "review" ? "Check what I read" : "Add what matters";
  const subtitle =
    step === "reading"
      ? fromScreens
        ? `${input?.files.length} screenshot${input?.files.length === 1 ? "" : "s"} · demo extraction`
        : "Sorting out who said what"
      : step === "review"
        ? "Tap a message to fix the text. Tap the name to switch who sent it."
        : "A few details change the advice. Skip anything that doesn't apply.";

  return (
    <Sheet
      open={Boolean(input)}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="full"
      footer={
        step === "review" ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLines((ls) => ls.map((l) => ({ ...l, from: l.from === "me" ? "them" : "me" })))}>
              <ArrowLeftRight size={16} strokeWidth={1.6} />
              Swap sides
            </Button>
            <Button variant="bronze" className="flex-1" onClick={() => setStep("context")} disabled={!lines.some((l) => l.text.trim())}>
              Looks right
            </Button>
          </div>
        ) : step === "context" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setStep("review")}>
                Back
              </Button>
              <Button variant="bronze" className="flex-1" onClick={finish} disabled={creating && !newName.trim()}>
                Get the read
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {step === "reading" && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 pt-2">
            {fromScreens && (
              <div className="card px-3.5 py-3">
                <div className="mb-2 flex items-center justify-between text-[12.5px]">
                  <span className="text-fg">
                    {phase === "upload" ? `Uploading ${input?.files.length} screenshot${input?.files.length === 1 ? "" : "s"}` : "Uploaded"}
                  </span>
                  <span className="mono text-fg-subtle">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${progress})` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2.5 px-0.5">
              {phase === "read" ? <Loader9 /> : <span className="h-[31px]" />}
              <p className={phase === "read" ? "shimmer-text text-[13.5px] font-medium" : "text-[13.5px] text-fg-faint"}>
                {fromScreens ? "Finding messages and who sent them" : "Sorting out who said what"}
              </p>
            </div>
            <div className="flex flex-col gap-2 opacity-60">
              {[62, 44, 70, 38, 56].map((w, i) => (
                <div key={i} className={cn("skeleton h-9 rounded-[12px]", i % 2 ? "self-end" : "self-start")} style={{ width: `${w}%` }} />
              ))}
            </div>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5 pt-1">
            {attachments.length > 0 && (
              <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
                {attachments.map((a) =>
                  a.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.id} src={a.thumb} alt={a.name} className="h-16 w-11 shrink-0 rounded-lg border border-[var(--line-strong)] object-cover" />
                  ) : null,
                )}
              </div>
            )}
            {lines.map((l, idx) => {
              const mine = l.from === "me";
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx, 12) * 0.05 }}
                  className={cn("group flex flex-col gap-1", mine ? "items-end" : "items-start")}
                >
                  <button
                    type="button"
                    onClick={() => updateLine(l.id, { from: mine ? "them" : "me" })}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.02em] transition-colors",
                      mine ? "text-fg-muted hover:bg-white/[0.05]" : "text-sapphire-300 hover:bg-sapphire-400/10",
                    )}
                  >
                    {mine ? "You" : themLabel}
                    <ArrowLeftRight size={11} strokeWidth={1.8} className="opacity-60" />
                  </button>
                  <div className={cn("flex max-w-[86%] items-end gap-1.5", mine && "flex-row-reverse")}>
                    {editing === l.id ? (
                      <textarea
                        autoFocus
                        value={l.text}
                        onChange={(e) => updateLine(l.id, { text: e.target.value })}
                        onBlur={() => setEditing(null)}
                        rows={Math.max(1, Math.ceil(l.text.length / 32))}
                        className="w-[min(78vw,420px)] resize-none rounded-[14px] border border-white/25 bg-ink-800 px-3 py-2 text-[15px] leading-snug text-fg focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(l.id)}
                        className={cn(
                          "rounded-[16px] px-3 py-2 text-left text-[14.5px] leading-snug transition-colors",
                          mine ? "rounded-br-[5px] bg-ink-600 text-fg" : "rounded-bl-[5px] bg-ink-800 text-fg",
                          !l.text.trim() && "italic text-fg-faint",
                        )}
                      >
                        {l.text || "Empty — tap to type"}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Delete message"
                      onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                      className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-faint transition-colors hover:bg-white/[0.06] hover:text-danger"
                    >
                      <Trash2 size={13} strokeWidth={1.6} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            <div className="mt-2 flex gap-2">
              {(["them", "me"] as const).map((from) => (
                <Button
                  key={from}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const id = uid("l");
                    setLines((ls) => [...ls, { id, from, text: "" }]);
                    setEditing(id);
                  }}
                >
                  <Plus size={14} strokeWidth={1.8} />
                  {from === "me" ? "Add yours" : `Add ${themLabel === "Them" ? "theirs" : `${themLabel}'s`}`}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "context" && (
          <motion.div key="context" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-7 pt-1">
            <section>
              <h3 className="eyebrow mb-3">Who is this?</h3>
              <div className="flex flex-wrap gap-2">
                {data.people.map((p) => (
                  <Chip
                    key={p.id}
                    active={!creating && personId === p.id}
                    onClick={() => {
                      setCreating(false);
                      setPersonId(personId === p.id ? undefined : p.id);
                    }}
                    className="pl-1.5"
                  >
                    <PersonAvatar id={p.id} name={p.name} size={24} />
                    {p.name}
                  </Chip>
                ))}
                <Chip
                  active={creating}
                  onClick={() => {
                    setCreating(!creating);
                    setPersonId(undefined);
                  }}
                >
                  <Plus size={14} strokeWidth={1.8} />
                  New person
                </Chip>
              </div>
              {creating && (
                <div className="mt-3 flex flex-col gap-3">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Her name or nickname" autoFocus maxLength={40} />
                  <p className="text-[12.5px] text-fg-subtle">Private to your account. A first name or nickname is enough.</p>
                </div>
              )}
            </section>

            {(person || creating) && (
              <section>
                <h3 className="eyebrow mb-3">Where are things?</h3>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => {
                    const current = creating ? newStage : person?.stage;
                    return (
                      <Chip
                        key={s.id}
                        active={current === s.id}
                        onClick={() => {
                          if (creating) setNewStage(s.id);
                          else if (person)
                            mutate((d) => {
                              const p = d.people.find((x) => x.id === person.id);
                              if (p && p.stage !== s.id) {
                                p.stage = s.id;
                                p.timeline.push({ id: uid("ev"), at: new Date().toISOString(), kind: "stage", title: `Stage → ${s.label}` });
                              }
                            });
                        }}
                      >
                        {s.label}
                      </Chip>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="card px-4 py-2">
              <Toggle checked={metInPerson} onChange={setMetInPerson} label="We've met in person" />
              <div className="hairline" />
              <Toggle checked={planExists} onChange={setPlanExists} label="There's a plan on the calendar" />
              <div className="hairline" />
              <Toggle checked={disagreement} onChange={setDisagreement} label="There's a disagreement or tension" />
            </section>

            <section>
              <h3 className="eyebrow mb-3">Anything else?</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Previous dates, existing plans, what happened, and what you need help deciding."
                className="min-h-28"
              />
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
