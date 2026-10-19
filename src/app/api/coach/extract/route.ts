import { NextResponse } from "next/server";
import { apiError, claude, FALLBACK, MODEL, notConfigured, requireUser } from "@/lib/coach/claude";

export const runtime = "nodejs";
export const maxDuration = 120;

const SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string", enum: ["me", "them"] },
          text: { type: "string" },
        },
        required: ["from", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["lines"],
  additionalProperties: false,
};

/** Reads chat screenshots into an ordered list of messages he can then correct. */
export async function POST(req: Request) {
  const auth = await requireUser("extract");
  if (auth.error) return auth.error;
  const ai = claude();
  if (!ai) return notConfigured();

  const { images } = (await req.json().catch(() => ({}))) as { images?: string[] };
  // At most 6 screenshots of ~2.5 MB each (the app sends ~300 KB JPEGs).
  const valid = (images ?? []).filter((d) => typeof d === "string" && d.startsWith("data:image/jpeg;base64,") && d.length < 2_500_000).slice(0, 6);
  if (!valid.length) return NextResponse.json({ error: "No screenshots" }, { status: 400 });

  try {
    const res = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            ...valid.map((d) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: d.slice(d.indexOf(",") + 1) } })),
            {
              type: "text" as const,
              text: "These are screenshots of a chat (in order). Transcribe every message bubble in order, top to bottom across all screenshots. from = \"me\" for the phone owner's messages (usually right-aligned / colored bubbles), \"them\" for the other person (usually left-aligned / grey). Skip timestamps, read receipts, reactions and UI text. Merge a message that's split across two screenshots. Keep the exact wording, typos and emojis.",
            },
          ],
        },
      ],
    });
    if (res.stop_reason === "refusal") return NextResponse.json({ lines: [] });
    const raw = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const parsed = JSON.parse(raw) as { lines: { from: "me" | "them"; text: string }[] };
    return NextResponse.json({ lines: parsed.lines.filter((l) => l.text?.trim()).slice(0, 200) });
  } catch (err) {
    return apiError(err);
  }
}
