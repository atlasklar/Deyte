"use client";

/*
 * Client side of the live coach: turns the account + thread into a request,
 * streams the reply, and calls the screenshot and re-tone helpers.
 */

import type { AccountData, ChatLine, Person, Thread, Tone, UserMessage } from "@/lib/types";
import { stageLabel } from "@/lib/types";
import { replyToText } from "./protocol";

export class CoachError extends Error {
  constructor(
    message: string,
    public status: number,
    public notConfigured = false,
  ) {
    super(message);
  }
}

function userText(m: UserMessage, person?: Person) {
  const parts: string[] = [];
  if (m.extracted?.length) {
    const her = person?.name ?? "Her";
    parts.push(
      `Here's our conversation${m.attachments?.length ? " (from my screenshots)" : ""}, in order:\n` + m.extracted.map((l) => `${l.from === "me" ? "Me" : her}: ${l.text}`).join("\n"),
    );
  }
  const bg = m.background;
  const notes = [bg?.metInPerson && "We've met in person.", bg?.planExists && "We have a plan on the calendar.", bg?.disagreement && "There's some tension between us.", bg?.notes].filter(Boolean);
  if (notes.length) parts.push(`Context: ${notes.join(" ")}`);
  if (m.text?.trim()) parts.push(m.text.trim());
  return parts.join("\n\n") || "(sent screenshots)";
}

export function buildRequest(account: AccountData, thread: Thread, person?: Person) {
  const messages = thread.messages.map((m) => (m.role === "user" ? { role: "user" as const, content: userText(m, person) } : { role: "assistant" as const, content: replyToText(m.reply) }));
  const p = account.profile;
  const quiz = person?.profile;
  return {
    messages,
    context: {
      profile: {
        name: p.name,
        ageRange: p.ageRange,
        situation: p.situation,
        lookingFor: p.lookingFor,
        struggles: p.struggles ?? p.goals,
        style: p.style,
        emoji: p.emoji,
        samples: p.samples,
        coachTone: p.coachTone,
      },
      memory: account.self.map((s) => s.text).slice(-60),
      person: person
        ? {
            name: person.name,
            stage: stageLabel(person.stage),
            metVia: person.metVia,
            note: person.note,
            quiz: quiz ? { "How long": quiz.howLong, "What he wants": quiz.want, "His concerns": quiz.concerns, "What she's like": quiz.her, "His notes": quiz.notes } : undefined,
            facts: person.facts.map((f) => f.text).slice(-40),
            reads: person.reads.map((f) => f.text).slice(-20),
            recent: person.timeline.slice(-6).map((e) => `${e.at.slice(0, 10)}: ${e.title}${e.detail ? ` (${e.detail})` : ""}`),
          }
        : undefined,
    },
  };
}

async function errorFrom(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const nc = body.error === "not_configured";
  return new CoachError(nc ? "Your coach's AI isn't switched on yet." : (body.error ?? "Your coach couldn't answer just now."), res.status, nc);
}

/** Streams the coach's reply. `onText` gets the full text so far after each chunk. */
export async function streamCoach(body: ReturnType<typeof buildRequest>, onText: (raw: string) => void, signal: AbortSignal) {
  const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) throw await errorFrom(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    onText(raw);
  }
  raw += decoder.decode();
  if (raw.includes("<error/>")) throw new CoachError("The connection dropped mid-reply.", 502);
  return raw;
}

export async function retoneLive(text: string, tone: Tone, voice: string) {
  const res = await fetch("/api/coach/retone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, tone, voice }) });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { text: string }).text;
}

/** Shrinks a screenshot so several fit in one request but text stays legible. */
async function toJpeg(file: File, max = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function extractLive(files: File[]): Promise<Omit<ChatLine, "id">[]> {
  const images = await Promise.all(files.slice(0, 8).map((f) => toJpeg(f)));
  const res = await fetch("/api/coach/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images }) });
  if (!res.ok) throw await errorFrom(res);
  return ((await res.json()) as { lines: Omit<ChatLine, "id">[] }).lines;
}

export function voiceOf(account: AccountData) {
  const p = account.profile;
  const voice = account.self.filter((s) => s.category === "voice" || s.category === "style").map((s) => s.text);
  return [p.style.join(", "), ...voice, p.samples ? `Examples: ${p.samples.slice(0, 300)}` : ""].filter(Boolean).join(". ");
}
