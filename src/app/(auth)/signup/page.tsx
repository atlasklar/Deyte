"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/config/product";
import { CloudSetup } from "@/components/auth/CloudSetup";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { callbackUrl, supabase } from "@/lib/supabase/client";
import { cloudReady } from "@/lib/supabase/config";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function SignupPage() {
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!cloudReady) return <CloudSetup inline />;

  if (sent) {
    return (
      <main className="flex flex-1 flex-col items-center pb-10 pt-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800">
          <MailCheck size={22} />
        </span>
        <h1 className="display mt-4 text-[24px] leading-tight">Check your email</h1>
        <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-fg-muted">
          We sent a link to <span className="text-fg">{email}</span>. Tap it to confirm your account and you&apos;ll go straight to setup.
        </p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 text-[13px] text-fg-subtle hover:text-fg">
          Wrong email? Go back
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col pb-10">
      <h1 className="display text-center text-[26px] leading-tight">Your private coach</h1>
      <p className="mt-1.5 text-center text-[14px] text-fg-subtle">{formatPrice()}/month · pause or cancel any time</p>

      <div className="mt-7">
        <OAuthButtons next="/onboarding" onError={setError} />
      </div>

      <div className="my-6 flex items-center gap-3 text-[12px] text-fg-faint">
        <span className="hairline flex-1" /> or with email <span className="hairline flex-1" />
      </div>

      <form
        className="flex flex-col gap-3.5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (password.length < 8) return setError("Use at least 8 characters for your password.");
          setBusy(true);
          const { data, error: err } = await supabase().auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { first_name: first.trim(), last_name: last.trim(), full_name: `${first.trim()} ${last.trim()}`.trim() },
              emailRedirectTo: callbackUrl("/onboarding"),
            },
          });
          setBusy(false);
          if (err) return setError(err.message);
          // Email confirmation on → wait for the link. Off → signed in already.
          if (data.session) router.replace("/onboarding");
          else setSent(true);
        }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="First name">
            <Input autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={40} required />
          </Field>
          <Field label="Last name">
            <Input autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={40} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-[13px] leading-relaxed text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-fg-faint">
          By continuing you confirm you&apos;re 18 or older and agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-fg">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-auto pt-10 text-center text-[14px] text-fg-subtle">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-fg hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
