import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Permanently deletes the signed-in account: photos, coach data and the login.
 * Needs SUPABASE_SERVICE_ROLE_KEY (server-only — never prefix it NEXT_PUBLIC_).
 */
export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    return NextResponse.json({ error: "Account deletion isn't switched on yet. Email support and we'll remove it for you." }, { status: 501 });
  }

  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();
  if (!user) return NextResponse.json({ error: "You're signed out." }, { status: 401 });

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));

  // account_data goes with the user (on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
