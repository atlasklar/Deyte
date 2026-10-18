"use client";

/*
 * Account data, synced to the cloud. Each signed-in user has one private row
 * in Supabase (`account_data`, protected by row-level security) holding their
 * profile, memory, people and chats. A local copy makes reopening instant;
 * changes save to the cloud a moment after they happen.
 */

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { freshAccount } from "./seed";
import { cloudReady } from "./supabase/config";
import { providerOf, supabase, type Provider } from "./supabase/client";
import type { AccountData, Person, SubStatus } from "./types";
import { addMonths, daysFromNow, nowIso } from "./util";

const cacheKey = (id: string) => `deyte:v2:cache:${id}`;

function readCache(id: string): AccountData | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    const d = raw ? (JSON.parse(raw) as AccountData) : null;
    return d?.version === 1 ? d : null;
  } catch {
    return null;
  }
}

function writeCache(d: AccountData) {
  try {
    localStorage.setItem(cacheKey(d.id), JSON.stringify(d));
  } catch {
    /* Storage full or blocked: the cloud copy still saves. */
  }
}

export type CloudUser = {
  id: string;
  email: string;
  provider: Provider;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  /** A new address waiting to be confirmed from its inbox. */
  pendingEmail?: string;
};

export function toCloudUser(u: User): CloudUser {
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const full = m.full_name ?? m.name ?? "";
  const [first = "", ...rest] = full.split(" ");
  return {
    id: u.id,
    email: u.email ?? "",
    provider: providerOf(u),
    firstName: m.first_name ?? m.given_name ?? first,
    lastName: m.last_name ?? m.family_name ?? rest.join(" "),
    avatarUrl: m.avatar_url ?? m.picture,
    pendingEmail: u.new_email || undefined,
  };
}

/** Signs out of the cloud session and clears this device's local copy. */
export async function signOut() {
  if (!cloudReady) return;
  const sb = supabase();
  const { data } = await sb.auth.getUser();
  if (data.user) {
    try {
      localStorage.removeItem(cacheKey(data.user.id));
    } catch {}
  }
  await sb.auth.signOut();
}

/* ── Provider ───────────────────────────────────────────────── */

export type SyncState = "saved" | "saving" | "error";

type Ctx = {
  data: AccountData;
  mutate: (recipe: (draft: AccountData) => void) => void;
  user: CloudUser;
  setUser: (u: CloudUser) => void;
  sync: SyncState;
};

const AccountContext = createContext<Ctx | null>(null);

export function AccountProvider({
  children,
  fallback,
  onMissing,
  notConfigured,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onMissing: () => void;
  notConfigured?: React.ReactNode;
}) {
  const [data, setData] = useState<AccountData | null>(null);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [sync, setSync] = useState<SyncState>("saved");
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;
  const skipSave = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<AccountData | null>(null);

  // Load: local copy first (instant), then the cloud copy (source of truth).
  useEffect(() => {
    if (!cloudReady) return;
    const sb = supabase();
    let cancelled = false;
    (async () => {
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (cancelled) return;
      if (!authUser) return onMissingRef.current();
      const cu = toCloudUser(authUser);
      setUser(cu);
      const cached = readCache(authUser.id);
      if (cached) {
        skipSave.current = true;
        setData(cached);
      }

      const { data: row } = await sb.from("account_data").select("data").eq("user_id", authUser.id).maybeSingle();
      if (cancelled) return;
      let d = (row?.data as AccountData | undefined) ?? null;
      if (!d) {
        d = freshAccount(authUser.id, { name: cu.firstName || cu.email.split("@")[0], lastName: cu.lastName || undefined, email: cu.email, avatarUrl: cu.avatarUrl });
        await sb.from("account_data").upsert({ user_id: authUser.id, data: d, updated_at: nowIso() });
      }
      // Auth is the source of truth for the email. (A Google/Apple photo is only
      // used to start the account, so removing it in Profile sticks.)
      d = { ...d, id: authUser.id, profile: { ...d.profile, email: cu.email } };
      skipSave.current = true;
      setData(d);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") onMissingRef.current();
      if (event === "USER_UPDATED" && session?.user) {
        const cu = toCloudUser(session.user);
        setUser(cu);
        setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, email: cu.email } } : prev));
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const flush = useCallback(async () => {
    const d = latest.current;
    if (!d || !cloudReady) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { error } = await supabase().from("account_data").upsert({ user_id: d.id, data: d, updated_at: nowIso() });
    setSync(error ? "error" : "saved");
  }, []);

  // Save: local copy right away, cloud copy shortly after (batched).
  useEffect(() => {
    if (!data) return;
    latest.current = data;
    writeCache(data);
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSync("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [data, flush]);

  // Don't lose the last edit when the app is backgrounded or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && timer.current) void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  const mutate = useCallback((recipe: (draft: AccountData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      recipe(draft);
      return draft;
    });
  }, []);

  const value = useMemo(() => (data && user ? { data, mutate, user, setUser, sync } : null), [data, mutate, user, sync]);
  if (!cloudReady) return <>{notConfigured ?? fallback}</>;
  if (!value) return <>{fallback}</>;
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}

/* ── Derived state ──────────────────────────────────────────── */

export type Access = {
  status: SubStatus;
  /** New AI usage allowed right now. */
  canUseAI: boolean;
  reason?: string;
};

export function accessFor(data: AccountData): Access {
  const { status } = data.subscription;
  let reason: string | undefined;
  if (status === "paused") reason = "Your plan is paused. Resume to talk to your coach — everything it remembers is still here.";
  else if (status === "ended") reason = "Your subscription has ended. Subscribe to start again.";
  return { status, canUseAI: !reason, reason };
}

export function usePerson(id?: string): Person | undefined {
  const { data } = useAccount();
  return id ? data.people.find((p) => p.id === id) : undefined;
}

/* ── Subscription transitions (billing comes later) ─────────── */

export const subscription = {
  pause(d: AccountData, months: number) {
    d.subscription.status = "paused";
    d.subscription.pausedAt = nowIso();
    d.subscription.resumeOn = addMonths(nowIso(), months);
  },
  resume(d: AccountData) {
    d.subscription.status = "active";
    d.subscription.pausedAt = undefined;
    d.subscription.resumeOn = undefined;
    d.subscription.periodStart = nowIso();
    d.subscription.periodEnd = daysFromNow(30);
  },
  cancel(d: AccountData) {
    d.subscription.status = "canceled";
    d.subscription.canceledAt = nowIso();
  },
  undoCancel(d: AccountData) {
    d.subscription.status = "active";
    d.subscription.canceledAt = undefined;
  },
  /** What happens when the paid access window closes after a cancellation. */
  end(d: AccountData) {
    const fresh = freshAccount(d.id, { name: d.profile.name, lastName: d.profile.lastName, email: d.profile.email, avatarUrl: d.profile.avatarUrl });
    Object.assign(d, fresh);
    d.subscription.status = "ended";
  },
  restart(d: AccountData) {
    d.subscription = { status: "active", price: d.subscription.price, periodStart: nowIso(), periodEnd: daysFromNow(30) };
  },
};
