"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { CloudSetup } from "@/components/auth/CloudSetup";
import { cloudReady } from "@/lib/supabase/config";
import { supabase } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") ?? "");
  const [busy, setBusy] = useState(false);

  if (!cloudReady) return <CloudSetup inline />;

  return (
    <main className="flex flex-1 flex-col pb-10">
      <h1 className="display text-center text-[26px] leading-tight">Welcome back</h1>
      <p className="mt-1.5 text-center text-[14px] text-fg-subtle">Your coach remembers where you left off.</p>

      <div className="mt-7">
        <OAuthButtons onError={setError} />
      </div>

      <div className="my-6 flex items-center gap-3 text-[12px] text-fg-faint">
        <span className="hairline flex-1" /> or with email <span className="hairline flex-1" />
      </div>

      <form
        className="flex flex-col gap-3.5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
          setBusy(false);
          if (err) return setError(err.message === "Invalid login credentials" ? "That email and password don't match." : err.message);
          router.replace("/app");
        }}
      >
        <Field label="Email">
          <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </Field>
        <div className="-mt-1 flex justify-end">
          <Link href="/forgot" className="text-[12.5px] text-fg-subtle hover:text-fg">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-[13px] leading-relaxed text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-auto pt-10 text-center text-[14px] text-fg-subtle">
        New to Deyte?{" "}
        <Link href="/signup" className="font-medium text-fg hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
