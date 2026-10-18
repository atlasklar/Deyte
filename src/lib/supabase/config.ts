/** Supabase project settings. Set both in Vercel → Settings → Environment Variables. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const cloudReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
