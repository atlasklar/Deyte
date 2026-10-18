/*
 * The live coach writes Markdown with a few XML-style tags for the parts the
 * app turns into UI. Shared by the server (prompt) and the client (parsing).
 *
 *   <say>message he could send</say>                 → copyable message card
 *   <options>A | B | C</options>                     → quick-reply chips
 *   <remember about="me|her" type="fact|read">…</remember> → "Remember this?"
 *   <next>propose_date</next>                        → recommendation label
 */

import type { CoachReply, MemorySuggestion, RecommendationType } from "@/lib/types";
import { RECOMMENDATION_LABEL } from "@/lib/types";
import { uid } from "@/lib/util";

const NEXT_TYPES = Object.keys(RECOMMENDATION_LABEL) as RecommendationType[];
const TAGS = ["say", "options", "remember", "next"] as const;

/** Text with every tag removed, plus whatever is inside an open <say> while streaming. */
export function liveView(raw: string): { text: string; say: string | null; sayDone: boolean } {
  let text = raw;
  let say: string | null = null;
  let sayDone = false;

  const sayMatch = text.match(/<say>([\s\S]*?)(<\/say>|$)/);
  if (sayMatch) {
    say = humanize(sayMatch[1].replace(/<\/?s?a?y?$/, "").trim());
    sayDone = Boolean(sayMatch[2]);
  }
  for (const t of TAGS) text = text.replace(new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?(</${t}>|$)`, "g"), "");
  // Hide a tag that is still being typed ("<rem").
  text = text.replace(/<\/?[a-z]*[^>\n]*$/i, "");
  return { text: tidy(text), say, sayDone };
}

export function parseReply(raw: string, partial = false): Extract<CoachReply, { kind: "chat" }> {
  const sayRaw = raw.match(/<say>([\s\S]*?)<\/say>/)?.[1].trim();
  const say = sayRaw ? humanize(sayRaw) : undefined;
  const options = raw
    .match(/<options>([\s\S]*?)<\/options>/)?.[1]
    .split("|")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 4);
  const nextRaw = raw.match(/<next>\s*([a-z_]+)\s*<\/next>/)?.[1] as RecommendationType | undefined;
  const memory: MemorySuggestion[] = [];
  for (const m of raw.matchAll(/<remember\b([^>]*)>([\s\S]*?)<\/remember>/g)) {
    const attrs = m[1];
    const text = humanize(m[2].trim());
    if (!text) continue;
    memory.push({
      id: uid("sug"),
      scope: /about="(her|person)"/.test(attrs) ? "person" : "self",
      kind: /type="read"/.test(attrs) ? "read" : "fact",
      text,
      status: "pending",
    });
  }
  return {
    kind: "chat",
    text: liveView(raw).text,
    say: say ? { text: say } : undefined,
    options: options?.length ? options : undefined,
    memory: memory.length ? memory.slice(0, 3) : undefined,
    next: nextRaw && NEXT_TYPES.includes(nextRaw) ? nextRaw : undefined,
    partial: partial || undefined,
  };
}

/** Turns a stored reply back into what the coach originally wrote (for conversation history). */
export function replyToText(reply: CoachReply): string {
  switch (reply.kind) {
    case "chat": {
      let t = reply.text;
      if (reply.say) t += `\n\n<say>${reply.say.text}</say>`;
      if (reply.next) t += `\n<next>${reply.next}</next>`;
      return t;
    }
    case "analysis":
      return [
        `What's happening: ${reply.happening.join(" ")}`,
        `Possible explanations: ${reply.explanations.join(" ")}`,
        `What to do next: ${RECOMMENDATION_LABEL[reply.next.type]}. ${reply.next.text}`,
        `Why: ${reply.why}`,
        reply.say ? `<say>${reply.say.text}</say>` : reply.noMessage ? `No message needed: ${reply.noMessage}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "clarify":
      return `${reply.text}\n<options>${reply.options.join(" | ")}</options>`;
    case "note":
      return reply.text;
    case "draft":
      return `${reply.intro}\n<say>${reply.text}</say>`;
  }
}

function tidy(t: string) {
  return humanize(t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
}

/**
 * Makes text read like a person texting: no dashes as punctuation, and no
 * period hanging off the end of a line. Hyphenated words and "..." are kept.
 */
export function humanize(t: string) {
  return t
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/ +- +/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/^, /gm, "")
    .replace(/([^.\s])\.(\**)[ \t]*$/gm, "$1$2");
}
