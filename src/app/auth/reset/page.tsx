"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudSetup } from "@/components/auth/CloudSetup";
import { supabase } from "@/lib/supabase/client";
import { cloudReady } from "@/lib/supabase/config";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Wordmark } from "@/components/ui/Wordmark";

/** Reached from the password-reset email (already signed in by the link). */
export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!cloudReady) return <CloudSetup />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-5">
      <header className="pt-safe flex h-16 items-center justify-center pt-4">
        <Wordmark />
      </header>
      <h1 className="display mt-8 text-center text-[26px]">Choose a new password</h1>
      <form
        className="mt-7 flex flex-col gap-3.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) return setError("Use at least 8 characters.");
          setBusy(true);
          const { error: err } = await supabase().auth.updateUser({ password });
          setBusy(false);
          if (err) return setError(err.message);
          router.replace("/app");
        }}
      >
        <Field label="New password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        </Field>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" disabled={busy}>
          {busy ? "Saving…" : "Save and continue"}
        </Button>
      </form>
    </div>
  );
}
