"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/seed";
import { findAccountByEmail, resetDemoAccount, signIn } from "@/lib/store";
import { Button, Field, Input } from "@/components/ui/primitives";

const DEMO_COPY: Record<string, string> = {
  acct_daniel: "Dating — Maya, Sofia and a new match",
  acct_james: "In a relationship with Elena",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enter = (id: string, fresh?: boolean) => {
    if (fresh) resetDemoAccount(id);
    signIn(id);
    router.push("/app");
  };

  return (
    <main className="flex flex-1 flex-col pb-10">
      <h1 className="display text-center text-[26px] leading-tight">Welcome back</h1>
      <p className="mt-2 text-center text-[14.5px] text-fg-subtle">Your coach remembers where you left off.</p>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const account = findAccountByEmail(email);
          if (!account) return setError("No account with that email in this browser. Create one, or try a demo below.");
          if (!password) return setError("Enter your password.");
          enter(account.id);
        }}
      >
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(""))} placeholder="you@email.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => (setPassword(e.target.value), setError(""))} placeholder="••••••••" />
        </Field>
        {error && <p className="text-[13px] leading-relaxed text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" className="mt-2">
          Sign in
        </Button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[12px] text-fg-faint">
        <span className="hairline flex-1" /> or explore a demo <span className="hairline flex-1" />
      </div>

      <div className="flex flex-col gap-2.5">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.id} type="button" onClick={() => enter(a.id)} className="card group flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-left transition-colors hover:border-[var(--line-strong)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[15px] font-medium">{a.name[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-fg">{a.name}</span>
              <span className="block truncate text-[12.5px] text-fg-subtle">{DEMO_COPY[a.id]}</span>
            </span>
            <ArrowRight size={16} strokeWidth={1.6} className="text-fg-faint transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
        <p className="mt-1 text-center text-[12px] leading-relaxed text-fg-subtle">
          Each demo account has its own separate memory.{" "}
          <button type="button" className="underline decoration-white/20 underline-offset-2 hover:text-fg" onClick={() => DEMO_ACCOUNTS.forEach((a) => resetDemoAccount(a.id))}>
            Reset demos
          </button>
        </p>
      </div>

      <p className="mt-auto pt-10 text-center text-[14px] text-fg-subtle">
        New here?{" "}
        <Link href="/signup" className="font-medium text-fg hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
