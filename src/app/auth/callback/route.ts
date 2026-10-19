import { NextResponse, type NextRequest } from "next/server";
import { cloudReady } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Landing point for Google / Apple sign-in, email confirmation, password
 * recovery and email-change links. Swaps the one-time code for a session.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") ?? "/app";
  // Only ever send people somewhere on this site ("/\\evil.com" and "//evil.com" are other sites).
  const target = /^\/(?![/\\])[^\s\\]*$/.test(next) ? new URL(next, url.origin) : null;
  const safeNext = target && target.origin === url.origin ? target.pathname + target.search : "/app";
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description");

  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, url.origin));
  if (code && cloudReady) {
    const sb = await supabaseServer();
    const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
    if (exchangeError) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
