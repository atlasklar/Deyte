import { NextResponse } from "next/server";
import { apiError, claude, FALLBACK, MODEL, notConfigured, requireUser } from "@/lib/coach/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

const TONES: Record<string, string> = {
  shorter: "Make it shorter and tighter. Same meaning.",
  warmer: "Make it a little warmer and more personal, without getting needy.",
  playful: "Make it more playful and teasing, light and confident.",
  direct: "Make it more direct and clear about what he wants.",
};

/** Rewrites one suggested message in a different tone, keeping his voice. */
export async function POST(req: Request) {
  const auth = await requireUser("retone");
  if (auth.error) return auth.error;
  const ai = claude();
  if (!ai) return notConfigured();

  const { text, tone, voice } = (await req.json().catch(() => ({}))) as { text?: string; tone?: string; voice?: string };
  if (!text || !tone || !TONES[tone]) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const res = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      ...FALLBACK,
      output_config: { effort: "low" },
      system:
        "You rewrite a text message a man is about to send to a woman he's dating or talking to. Keep it natural, specific and in his voice. Never add pickup lines, pressure or anything manipulative. Reply with the rewritten message only: no quotes, no explanation.",
      messages: [{ role: "user", content: `His voice: ${(voice || "casual, natural").slice(0, 600)}\n\nMessage:\n${text.slice(0, 1000)}\n\n${TONES[tone]}` }],
    });
    if (res.stop_reason === "refusal") return NextResponse.json({ text });
    const out = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim().replace(/^["“]|["”]$/g, "");
    return NextResponse.json({ text: out || text });
  } catch (err) {
    return apiError(err);
  }
}
