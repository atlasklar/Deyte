import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { cloudReady } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const MODEL = "claude-opus-5-5";
/** If Claude declines on a policy classifier, the API retries on the recommended model. */
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | null = null;
export function claude() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

const LIMIT_MESSAGE: Record<string, string> = {
  hour: "You've hit this hour's limit with your coach. Give it a bit and come back.",
  day: "You've hit today's limit with your coach. It resets tomorrow.",
  busy: "Your coach is swamped right now. Try again in a minute.",
};

/**
 * Only signed-in members can use the coach, and each use counts against a
 * per-member limit (see use_coach() in supabase/schema.sql). Keeps the API key
 * and the bill safe from spam.
 */
export async function requireUser(kind: "chat" | "extract") {
  if (!cloudReady) return { error: NextResponse.json({ error: "Sign-in isn't set up." }, { status: 503 }) };
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in to talk to your coach." }, { status: 401 }) };
  const { data, error } = await sb.rpc("use_coach", { p_kind: kind });
  // If the limiter itself is unreachable, fail closed rather than run up the bill.
  if (error) return { error: NextResponse.json({ error: "Your coach couldn't answer just now. Try again." }, { status: 503 }) };
  const verdict = data as { allowed: boolean; reason?: string };
  if (!verdict.allowed) return { error: NextResponse.json({ error: LIMIT_MESSAGE[verdict.reason ?? ""] ?? "Try again later." }, { status: 429 }) };
  return { user };
}

export function notConfigured() {
  return NextResponse.json({ error: "not_configured" }, { status: 503 });
}

export function apiError(err: unknown) {
  if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Your coach is busy. Try again in a moment." }, { status: 429 });
  if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (err instanceof Anthropic.APIError) return NextResponse.json({ error: "Your coach couldn't answer just now. Try again." }, { status: 502 });
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
