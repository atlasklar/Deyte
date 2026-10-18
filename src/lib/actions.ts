"use client";

import { useCallback } from "react";
import { coach } from "./coach/engine";
import { useAccount } from "./store";
import type { AccountData, Attachment, Background, ChatLine, CoachReply, Intent, Person, PersonProfile, StageId, Thread } from "./types";
import { RECOMMENDATION_LABEL } from "./types";
import { nowIso, uid } from "./util";

export type Draft = {
  text?: string;
  attachments?: Attachment[];
  extracted?: ChatLine[];
  background?: Background;
};

const INTENT_TITLES: Record<Intent, string> = {
  decide: "Deciding what to do",
  understand: "Reading a conversation",
  respond: "Writing a reply",
  upload: "Screenshot review",
  open: "New conversation",
};

function titleFrom(draft: Draft, intent: Intent, person?: Person) {
  const t = draft.text?.trim();
  if (t) {
    const words = t.replace(/\s+/g, " ").split(" ").slice(0, 7).join(" ");
    return words.length < t.length ? `${words.replace(/[,.;:!?]$/, "")}…` : words;
  }
  if (person) return `${INTENT_TITLES[intent]} · ${person.name}`;
  return INTENT_TITLES[intent];
}

export function lastUnanswered(thread: Thread) {
  const last = thread.messages[thread.messages.length - 1];
  return last?.role === "user" ? last : null;
}

export function useCoachActions() {
  const { mutate } = useAccount();

  const startThread = useCallback(
    (opts: { intent?: Intent; personId?: string; draft?: Draft }) => {
      const intent = opts.intent ?? "open";
      const id = uid("t");
      const at = nowIso();
      mutate((d) => {
        // Looked up on the draft so a person created a moment ago is found.
        const person = d.people.find((p) => p.id === opts.personId);
        const thread: Thread = { id, title: titleFrom(opts.draft ?? {}, intent, person), personId: opts.personId, intent, createdAt: at, updatedAt: at, messages: [] };
        const hasDraft = opts.draft && (opts.draft.text?.trim() || opts.draft.extracted?.length);
        if (hasDraft) {
          thread.messages.push({ id: uid("m"), role: "user", at, ...opts.draft });
        } else {
          const opener = coach.opener(intent, person);
          if (opener) thread.messages.push({ id: uid("m"), role: "coach", at, reply: opener });
        }
        d.threads.unshift(thread);
      });
      return id;
    },
    [mutate],
  );

  const send = useCallback(
    (threadId: string, draft: Draft) => {
      mutate((d) => {
        const t = d.threads.find((x) => x.id === threadId);
        if (!t) return;
        t.messages.push({ id: uid("m"), role: "user", at: nowIso(), ...draft });
        t.updatedAt = nowIso();
        if (t.intent === "open" && t.messages.length === 1) t.title = titleFrom(draft, "open");
      });
    },
    [mutate],
  );

  /** Store a coach reply and everything it touches: the person's timeline. Returns the new message id. */
  const receive = useCallback(
    (threadId: string, reply: CoachReply) => {
      const messageId = uid("m");
      mutate((d) => {
        const t = d.threads.find((x) => x.id === threadId);
        if (!t) return;
        const at = nowIso();
        t.messages.push({ id: messageId, role: "coach", at, reply });
        t.updatedAt = at;
        const p = d.people.find((x) => x.id === t.personId);
        // "Remember automatically" setting: save the coach's suggestions straight away.
        if (d.prefs?.autoRemember && (reply.kind === "analysis" || reply.kind === "chat")) {
          for (const m of reply.memory ?? []) {
            if (m.status !== "pending") continue;
            m.status = "saved";
            const item = { id: uid("mem"), text: m.text, source: "approved" as const, createdAt: at };
            if (m.scope === "person" && p) (m.kind === "fact" ? p.facts : p.reads).push(item);
            else d.self.push({ ...item, category: "context" });
          }
        }
        const next = reply.kind === "analysis" ? reply.next.type : reply.kind === "chat" ? reply.next : undefined;
        if (p && next) {
          p.timeline.push({ id: uid("ev"), at, kind: "review", title: t.title, detail: `Recommendation: ${RECOMMENDATION_LABEL[next].toLowerCase()}`, threadId });
          p.updatedAt = at;
        }
      });
      return messageId;
    },
    [mutate],
  );

  const linkPerson = useCallback(
    (threadId: string, personId: string | undefined) => {
      mutate((d) => {
        const t = d.threads.find((x) => x.id === threadId);
        if (t) t.personId = personId;
      });
    },
    [mutate],
  );

  const createPerson = useCallback(
    (input: { name: string; stage: StageId; metVia?: string; note?: string; profile?: PersonProfile }) => {
      const id = uid("p");
      const at = nowIso();
      mutate((d) => {
        d.people.unshift({
          id,
          name: input.name.trim(),
          stage: input.stage,
          metVia: input.metVia?.trim() || undefined,
          note: input.note?.trim() || undefined,
          profile: input.profile,
          facts: [],
          reads: [],
          timeline: [{ id: uid("ev"), at, kind: "created", title: "Profile created" }],
          createdAt: at,
          updatedAt: at,
        });
      });
      return id;
    },
    [mutate],
  );

  const saveSuggestion = useCallback(
    (threadId: string, messageId: string, suggestionId: string, save: boolean) => {
      mutate((d) => {
        const t = d.threads.find((x) => x.id === threadId);
        const m = t?.messages.find((x) => x.id === messageId);
        if (!t || !m || m.role !== "coach" || (m.reply.kind !== "analysis" && m.reply.kind !== "chat")) return;
        const s = m.reply.memory?.find((x) => x.id === suggestionId);
        if (!s) return;
        s.status = save ? "saved" : "dismissed";
        if (!save) return;
        const item = { id: uid("mem"), text: s.text, source: "approved" as const, createdAt: nowIso() };
        const p = d.people.find((x) => x.id === t.personId);
        if (s.scope === "person" && p) (s.kind === "fact" ? p.facts : p.reads).push(item);
        else d.self.push({ ...item, category: "context" });
      });
    },
    [mutate],
  );

  const voiceFeedback = useCallback(
    (threadId: string, messageId: string, verdict: "me" | "not_me", correction?: string) => {
      mutate((d) => {
        const m = d.threads.find((x) => x.id === threadId)?.messages.find((x) => x.id === messageId);
        if (m?.role === "coach") m.voice = verdict;
        if (correction) d.self.push({ id: uid("mem"), category: "voice", text: correction, source: "learned", createdAt: nowIso() });
      });
    },
    [mutate],
  );

  return { startThread, send, receive, linkPerson, createPerson, saveSuggestion, voiceFeedback };
}

export function threadsFor(data: AccountData, personId: string) {
  return data.threads.filter((t) => t.personId === personId);
}

export function lastCoachReply(thread: Thread) {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const m = thread.messages[i];
    if (m.role === "coach") return m.reply;
  }
  return null;
}

export function previewOf(thread: Thread) {
  const r = lastCoachReply(thread);
  if (r?.kind === "analysis") return RECOMMENDATION_LABEL[r.next.type];
  if (r?.kind === "chat") return r.next ? RECOMMENDATION_LABEL[r.next] : r.text.replace(/[*_#>`]/g, "").replace(/\s+/g, " ").slice(0, 120) || (r.say ? "Suggested reply" : "");
  if (r?.kind === "draft") return "Suggested reply";
  if (r && "text" in r) return r.text;
  const u = thread.messages.find((m) => m.role === "user");
  return u && u.role === "user" ? (u.text ?? "Screenshots") : "";
}
