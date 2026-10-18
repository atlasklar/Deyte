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

/** Only signed-in members can use the coach (keeps the API key from being used by anyone else). */
export async function requireUser() {
  if (!cloudReady) return { error: NextResponse.json({ error: "Sign-in isn't set up." }, { status: 503 }) };
  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in to talk to your coach." }, { status: 401 }) };
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
