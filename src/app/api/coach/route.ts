import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { apiError, claude, FALLBACK, MODEL, notConfigured, requireUser } from "@/lib/coach/claude";
import { contextBlock, SYSTEM_PROMPT, type CoachContext } from "@/lib/coach/prompt";
import { retrieve } from "@/lib/coach/retrieve";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  messages: { role: "user" | "assistant"; content: string }[];
  context: Omit<CoachContext, "snippets" | "today">;
};

const MAX_MESSAGES = 40;
const MAX_CHARS = 12_000;

/**
 * Streams the coach's reply as plain text. The client parses the few tags the
 * coach uses (see lib/coach/protocol.ts) once the reply is complete.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const ai = claude();
  if (!ai) return notConfigured();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  // The conversation must start with him and end with his latest message.
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return NextResponse.json({ error: "Nothing to answer" }, { status: 400 });

  // Search the expert's posts with his latest message plus what we know about her.
  const latest = history[history.length - 1].content;
  const previous = history.slice(-3, -1).map((m) => m.content).join(" ");
  const p = body.context.person;
  const query = [latest, previous.slice(0, 600), p?.stage, ...(Object.values(p?.quiz ?? {}).flat() as string[])].filter(Boolean).join(" ");
  const snippets = retrieve(query, 8);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: contextBlock({ ...body.context, snippets, today }) },
  ];

  const stream = ai.beta.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system,
    messages: history,
  });

  // Collect text from the very first token, before anything else can miss it.
  const chunks: string[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  let failed = false;
  let refused = false;
  stream.on("text", (delta) => {
    chunks.push(delta);
    wake?.();
  });
  stream
    .finalMessage()
    .then((m) => (refused = m.stop_reason === "refusal"))
    .catch(() => (failed = true))
    .finally(() => {
      finished = true;
      wake?.();
    });

  // Auth and rate-limit errors arrive before the response starts: return them as a status.
  try {
    await new Promise<void>((resolve, reject) => {
      stream.once("connect", () => resolve());
      stream.once("error", reject);
    });
  } catch (err) {
    return apiError(err);
  }

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (;;) {
        while (chunks.length) controller.enqueue(encoder.encode(chunks.shift()!));
        if (finished) break;
        await new Promise<void>((r) => (wake = r));
        wake = null;
      }
      if (refused) controller.enqueue(encoder.encode("\n\nLet's keep this about you and how to handle it well. Tell me a bit more about what's going on."));
      if (failed) controller.enqueue(encoder.encode("\n\n<error/>"));
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
