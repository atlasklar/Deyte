"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CloudSetup } from "@/components/auth/CloudSetup";
import { callbackUrl, supabase } from "@/lib/supabase/client";
import { cloudReady } from "@/lib/supabase/config";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!cloudReady) return <CloudSetup inline />;

  return (
    <main className="flex flex-1 flex-col pb-10">
      {sent ? (
        <div className="flex flex-col items-center pt-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-800">
            <MailCheck size={22} />
          </span>
          <h1 className="display mt-4 text-[24px]">Check your email</h1>
          <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-fg-muted">If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <>
          <h1 className="display text-center text-[26px] leading-tight">Reset your password</h1>
          <p className="mt-1.5 text-center text-[14px] text-fg-subtle">We&apos;ll email you a link to set a new one.</p>
          <form
            className="mt-7 flex flex-col gap-3.5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const { error: err } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl("/auth/reset") });
              setBusy(false);
              if (err) return setError(err.message);
              setSent(true);
            }}
          >
            <Field label="Email">
              <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <Button type="submit" variant="bronze" size="lg" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-auto pt-10 text-center text-[14px] text-fg-subtle">
        <Link href="/login" className="font-medium text-fg hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
