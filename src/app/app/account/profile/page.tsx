"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, KeyRound, Lock, Mail, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { avatarJpeg } from "@/lib/files";
import { haptic } from "@/lib/haptics";
import { signOut, toCloudUser, useAccount } from "@/lib/store";
import { callbackUrl, supabase } from "@/lib/supabase/client";
import { Group, IconTile, RowButton } from "@/components/ui/List";
import { Button, Field, IconButton, Input, UserAvatar } from "@/components/ui/primitives";
import { Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

const PROVIDER_NAME = { google: "Google", apple: "Apple" } as const;
const MAX_PHOTO = 15 * 1024 * 1024;

export default function ProfilePage() {
  const { data, mutate, user, setUser } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [first, setFirst] = useState(data.profile.name);
  const [last, setLast] = useState(data.profile.lastName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sheet, setSheet] = useState<null | "email" | "password" | "delete">(null);

  const managed = user.provider !== "email" ? PROVIDER_NAME[user.provider] : null;
  const nameDirty = first.trim() !== data.profile.name || last.trim() !== (data.profile.lastName ?? "");
  const avatar = data.profile.avatarUrl;

  const saveName = async () => {
    const f = first.trim();
    const l = last.trim();
    if (!f) return toast("Add your first name", "info");
    setSavingName(true);
    const { data: res, error } = await supabase().auth.updateUser({ data: { first_name: f, last_name: l, full_name: `${f} ${l}`.trim() } });
    setSavingName(false);
    if (error) return toast(error.message, "info");
    if (res.user) setUser(toCloudUser(res.user));
    mutate((d) => {
      d.profile.name = f;
      d.profile.lastName = l || undefined;
    });
    haptic("success");
    toast("Name updated");
  };

  const setPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast("Choose a photo", "info");
    if (file.size > MAX_PHOTO) return toast("That photo is over 15 MB", "info");
    setPhotoBusy(true);
    try {
      const blob = await avatarJpeg(file);
      const sb = supabase();
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      await sb.auth.updateUser({ data: { avatar_url: url } });
      mutate((d) => (d.profile.avatarUrl = url));
      void removeOldPhotos(path);
      haptic("success");
      toast("Photo updated");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload that photo", "info");
    } finally {
      setPhotoBusy(false);
    }
  };

  /** Keeps the folder to one photo. Best effort: a leftover file is harmless. */
  const removeOldPhotos = async (keep?: string) => {
    const bucket = supabase().storage.from("avatars");
    const { data: files } = await bucket.list(user.id);
    const old = (files ?? []).map((f) => `${user.id}/${f.name}`).filter((p) => p !== keep);
    if (old.length) await bucket.remove(old);
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    await supabase().auth.updateUser({ data: { avatar_url: null, picture: null } });
    mutate((d) => (d.profile.avatarUrl = undefined));
    await removeOldPhotos();
    setPhotoBusy(false);
    toast("Photo removed");
  };

  return (
    <Page>
      <div className="pt-safe flex items-center pt-3 md:pt-8">
        <IconButton label="Back" onClick={() => router.push("/app/account")} className="-ml-2">
          <ChevronLeft size={21} strokeWidth={1.6} />
        </IconButton>
        <h1 className="flex-1 pr-8 text-center text-[16px] font-semibold text-fg">Profile</h1>
      </div>

      {/* Photo */}
      <section className="flex flex-col items-center pb-7 pt-5">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy} aria-label="Change photo" className="group relative rounded-full">
          <motion.span key={avatar ?? "none"} initial={{ scale: 0.92, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="block">
            <UserAvatar name={data.profile.name} src={avatar} size={104} />
          </motion.span>
          <AnimatePresence>
            {photoBusy && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-void bg-white text-black transition-transform group-active:scale-90">
            <Camera size={14} strokeWidth={2.2} />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void setPhoto(f);
          }}
        />
        <div className="mt-3 flex items-center gap-4 text-[13.5px]">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy} className="font-medium text-fg hover:opacity-80">
            {avatar ? "Change photo" : "Add a photo"}
          </button>
          {avatar && (
            <button type="button" onClick={removePhoto} disabled={photoBusy} className="text-fg-subtle hover:text-fg">
              Remove
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-6 pb-12">
        <Group title="Name" footer="This is what your coach calls you.">
          <label className="group/row flex min-h-[48px] items-center gap-3 border-b border-[var(--line)] px-4">
            <span className="w-24 shrink-0 text-[14.5px] text-fg">First</span>
            <input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={40} autoComplete="given-name" placeholder="Required" className="min-w-0 flex-1 bg-transparent py-3 text-right text-[14.5px] text-fg-muted placeholder:text-fg-faint focus:text-fg focus:outline-none" />
          </label>
          <label className="group/row flex min-h-[48px] items-center gap-3 px-4">
            <span className="w-24 shrink-0 text-[14.5px] text-fg">Last</span>
            <input value={last} onChange={(e) => setLast(e.target.value)} maxLength={40} autoComplete="family-name" placeholder="Optional" className="min-w-0 flex-1 bg-transparent py-3 text-right text-[14.5px] text-fg-muted placeholder:text-fg-faint focus:text-fg focus:outline-none" />
          </label>
        </Group>

        <AnimatePresence initial={false}>
          {nameDirty && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="-mt-3 overflow-hidden">
              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setFirst(data.profile.name);
                    setLast(data.profile.lastName ?? "");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="bronze" className="flex-1" onClick={saveName} disabled={savingName || !first.trim()}>
                  {savingName ? "Saving…" : "Save name"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {managed ? (
          <Group title="Sign-in" footer={`Your email and password are managed by your ${managed} account, so they can't be changed here.`}>
            <div className="group/row flex min-h-[48px] items-center gap-3 pl-3.5">
              <IconTile icon={user.provider === "apple" ? AppleGlyph : GoogleGlyph} tint="gray" />
              <span className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] text-fg">Signed in with {managed}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-fg-subtle">{user.email}</span>
                </span>
                <Lock size={14} className="shrink-0 text-fg-faint" />
              </span>
            </div>
          </Group>
        ) : (
          <Group title="Sign-in" footer={user.pendingEmail ? `Waiting for you to confirm ${user.pendingEmail} — check that inbox.` : undefined}>
            <RowButton onClick={() => setSheet("email")} icon={<IconTile icon={Mail} tint="blue" />} label="Email" sub={user.email} chevron />
            <RowButton onClick={() => setSheet("password")} icon={<IconTile icon={KeyRound} tint="gray" />} label="Password" sub="Change your password" chevron />
          </Group>
        )}

        <Group footer="Deletes your memory, people, chats and photo, and closes your account. This can't be undone.">
          <RowButton onClick={() => setSheet("delete")} icon={<IconTile icon={Trash2} tint="red" />} label="Delete account" danger />
        </Group>
      </div>

      <EmailSheet open={sheet === "email"} onClose={() => setSheet(null)} current={user.email} />
      <PasswordSheet open={sheet === "password"} onClose={() => setSheet(null)} />
      <DeleteSheet open={sheet === "delete"} onClose={() => setSheet(null)} />
    </Page>
  );
}

function EmailSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const toast = useToast();
  const { setUser } = useAccount();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => (onClose(), setEmail(""), setError(""));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (next === current.toLowerCase()) return setError("That's already your email.");
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase().auth.updateUser({ email: next }, { emailRedirectTo: callbackUrl("/app/account/profile") });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.user) setUser(toCloudUser(data.user));
    close();
    toast(`Check ${next} to confirm the change`);
  };

  return (
    <Sheet open={open} onClose={close} title="Change email" subtitle="We'll send a confirmation link. Your email changes once you tap it.">
      <form onSubmit={submit} className="flex flex-col gap-3.5 pt-1">
        <Field label="Current">
          <Input value={current} disabled className="opacity-60" />
        </Field>
        <Field label="New email">
          <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" disabled={busy || !email.includes("@")}>
          {busy ? "Sending…" : "Send confirmation link"}
        </Button>
      </form>
    </Sheet>
  );
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => (onClose(), setPassword(""), setConfirm(""), setError(""));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError("");
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    haptic("success");
    close();
    toast("Password changed");
  };

  return (
    <Sheet open={open} onClose={close} title="Change password">
      <form onSubmit={submit} className="flex flex-col gap-3.5 pt-1">
        <Field label="New password" hint="At least 8 characters">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button type="submit" variant="bronze" size="lg" disabled={busy || !password || !confirm}>
          {busy ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Sheet>
  );
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setBusy(false);
      return setError(body.error ?? "Something went wrong. Try again.");
    }
    await signOut().catch(() => {});
    router.replace("/");
  };

  return (
    <Sheet
      open={open}
      onClose={() => (onClose(), setError(""))}
      title="Delete your account?"
      subtitle="Everything your coach remembers — people, facts, chats and your photo — is erased for good. Your subscription ends with it."
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Keep account
          </Button>
          <Button variant="danger" className="flex-1" onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete forever"}
          </Button>
        </div>
      }
    >
      {error ? <p className="text-[13px] text-danger">{error}</p> : <span />}
    </Sheet>
  );
}

function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M21.6 12.23c0-.7-.06-1.37-.18-2.02H12v3.82h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 2.98-4.3 2.98-7.32Z" />
      <path fill="#fff" opacity=".8" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#fff" opacity=".6" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9Z" />
      <path fill="#fff" opacity=".9" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function AppleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="#fff">
      <path d="M16.37 12.6c-.02-2.1 1.72-3.12 1.8-3.17-1-1.44-2.53-1.64-3.07-1.66-1.3-.13-2.55.77-3.21.77-.67 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.48 2.11-1.49 2.58-.38 6.4 1.07 8.49.71 1.02 1.55 2.17 2.65 2.13 1.07-.04 1.47-.69 2.76-.69 1.28 0 1.65.69 2.77.67 1.15-.02 1.87-1.04 2.57-2.07.81-1.18 1.14-2.33 1.16-2.39-.03-.01-2.22-.85-2.24-3.46ZM14.27 6.43c.58-.71.98-1.69.87-2.68-.84.04-1.86.56-2.46 1.27-.54.62-1.01 1.62-.89 2.58.94.07 1.9-.48 2.48-1.17Z" />
    </svg>
  );
}
