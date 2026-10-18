"use client";

/*
 * Demo persistence for the UI phase. Every account's data lives under its own
 * localStorage key, so two accounts never see each other's memory. When the
 * backend arrives, replace load/save with API calls; the hook surface stays.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_ACCOUNTS, freshAccount, seedFor } from "./seed";
import type { AccountData, AccountSummary, Person, SubStatus } from "./types";
import { addMonths, daysFromNow, nowIso, uid } from "./util";

const NS = "deyte:v1";
const SESSION_KEY = `${NS}:session`;
const ACCOUNTS_KEY = `${NS}:accounts`;
const dataKey = (id: string) => `${NS}:data:${id}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or blocked: the demo keeps working in memory. */
  }
}

/* ── Session + account registry ─────────────────────────────── */

export function listAccounts(): AccountSummary[] {
  const own = read<AccountSummary[]>(ACCOUNTS_KEY) ?? [];
  return [...DEMO_ACCOUNTS, ...own.filter((a) => !DEMO_ACCOUNTS.some((d) => d.id === a.id))];
}

export function currentSession(): string | null {
  return read<{ accountId: string }>(SESSION_KEY)?.accountId ?? null;
}

export function signIn(accountId: string) {
  write(SESSION_KEY, { accountId });
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function findAccountByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return listAccounts().find((a) => a.email.toLowerCase() === e) ?? null;
}

export function createAccount(name: string, email: string): AccountSummary {
  const summary: AccountSummary = { id: uid("acct"), name: name.trim(), email: email.trim().toLowerCase() };
  const own = read<AccountSummary[]>(ACCOUNTS_KEY) ?? [];
  write(ACCOUNTS_KEY, [...own, summary]);
  write(dataKey(summary.id), freshAccount(summary.id, { name: summary.name, email: summary.email }));
  return summary;
}

export function resetDemoAccount(id: string) {
  const seed = seedFor(id);
  if (seed) write(dataKey(id), seed);
}

function loadAccount(id: string): AccountData | null {
  const stored = read<AccountData>(dataKey(id));
  if (stored?.version === 1) return stored;
  return seedFor(id);
}

/* ── Provider ───────────────────────────────────────────────── */

type Ctx = {
  data: AccountData;
  mutate: (recipe: (draft: AccountData) => void) => void;
};

const AccountContext = createContext<Ctx | null>(null);

export function AccountProvider({
  children,
  fallback,
  onMissing,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onMissing: () => void;
}) {
  const [data, setData] = useState<AccountData | null>(null);
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  useEffect(() => {
    const id = currentSession();
    const loaded = id ? loadAccount(id) : null;
    if (!loaded) onMissingRef.current();
    else setData(loaded);
  }, []);

  useEffect(() => {
    if (data) write(dataKey(data.id), data);
  }, [data]);

  const mutate = useCallback((recipe: (draft: AccountData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      recipe(draft);
      return draft;
    });
  }, []);

  const value = useMemo(() => (data ? { data, mutate } : null), [data, mutate]);
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

/* ── Subscription transitions (demo billing) ────────────────── */

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
    const fresh = freshAccount(d.id, { name: d.profile.name, email: d.profile.email });
    Object.assign(d, fresh);
    d.subscription.status = "ended";
  },
  restart(d: AccountData) {
    d.subscription = { status: "active", price: d.subscription.price, periodStart: nowIso(), periodEnd: daysFromNow(30) };
  },
};
