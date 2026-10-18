"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** One browser client for the whole app (session lives in cookies). */
export function supabase() {
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export type Provider = "email" | "google" | "apple";

export function providerOf(user: { app_metadata?: { provider?: string } } | null): Provider {
  const p = user?.app_metadata?.provider;
  return p === "google" || p === "apple" ? p : "email";
}

/** Where auth emails and OAuth bring people back to. */
export function callbackUrl(next = "/app") {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
