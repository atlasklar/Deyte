"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/config/product";
import { createAccount, findAccountByEmail, signIn } from "@/lib/store";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="flex flex-1 flex-col pb-10">
      <h1 className="display text-center text-[26px] leading-tight">Your private coach</h1>
      <p className="mt-2 text-center text-[14.5px] text-fg-subtle">{formatPrice()}/month · pause or cancel any time</p>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError("Add your first name.");
          if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email.");
          if (password.length < 8) return setError("Use at least 8 characters for your password.");
          if (findAccountByEmail(email)) return setError("That email already has an account. Sign in instead.");
          const account = createAccount(name, email);
          signIn(account.id);
          router.push("/onboarding");
        }}
      >
        <Field label="First name">
          <Input autoComplete="given-name" value={name} onChange={(e) => (setName(e.target.value), setError(""))} maxLength={30} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(""))} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => (setPassword(e.target.value), setError(""))} />
        </Field>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" className="mt-2">
          Create account
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
          Preview build: accounts live only in this browser and no payment is taken.
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
