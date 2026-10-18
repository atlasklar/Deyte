"use client";

import { Brain, ChevronRight, CreditCard, Download, HelpCircle, LogOut, Shield, SlidersHorizontal, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/config/product";
import { signOut, useAccount } from "@/lib/store";
import { formatDate } from "@/lib/util";
import { Group, IconTile, RowButton, RowLink, ToggleRow } from "@/components/ui/List";
import { DEFAULT_PREFS, type Prefs } from "@/lib/types";
import { Badge, Button, UserAvatar } from "@/components/ui/primitives";
import { Page } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";

const STATUS = {
  active: { label: "Active", tone: "ok" },
  paused: { label: "Paused", tone: "sapphire" },
  canceled: { label: "Canceled", tone: "warn" },
  ended: { label: "Ended", tone: "neutral" },
} as const;

export default function AccountPage() {
  const { data, mutate, user } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const s = data.subscription;
  const [confirmChats, setConfirmChats] = useState(false);
  const prefs = { ...DEFAULT_PREFS, ...data.prefs };
  const setPref = (k: keyof Prefs, v: boolean) => mutate((d) => (d.prefs = { ...DEFAULT_PREFS, ...d.prefs, [k]: v }));
  const memoryCount = data.self.length + data.people.reduce((n, p) => n + p.facts.length + p.reads.length, 0);

  const renewLine =
    s.status === "active"
      ? `Renews ${formatDate(s.periodEnd, { month: "short", day: "numeric" })}`
      : s.status === "paused"
        ? `Paused until ${formatDate(s.resumeOn!, { month: "short", day: "numeric" })}`
        : s.status === "canceled"
          ? `Ends ${formatDate(s.periodEnd, { month: "short", day: "numeric" })}`
          : "Not subscribed";

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "deyte-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Your data is downloading");
  };

  return (
    <Page>
      <header className="pt-safe pb-5 pt-5 md:pt-9">
        <h1 className="display text-[26px] leading-tight text-fg md:text-[28px]">Account</h1>
      </header>

      {/* Profile */}
      <Link href="/app/account/profile" className="card flex items-center gap-3.5 px-4 py-4 transition-colors active:bg-ink-800 hover:bg-ink-850">
        <UserAvatar name={data.profile.name} src={data.profile.avatarUrl} size={56} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold tracking-[-0.02em] text-fg">{[data.profile.name, data.profile.lastName].filter(Boolean).join(" ")}</span>
          <span className="block truncate text-[13px] text-fg-subtle">{data.profile.email}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-fg-muted">
            Deyte membership <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-fg-faint" />
      </Link>

      <div className="mt-6 flex flex-col gap-6 pb-10">
        <Group title="Membership">
          <RowLink href="/app/account/plan" icon={<IconTile icon={CreditCard} tint="ember" />} label="Plan" value={`${formatPrice(s.price)}/mo`} />
          <RowLink href="/app/account/plan" icon={<IconTile icon={Shield} tint="green" />} label="Status" value={renewLine} />
        </Group>

        <Group title="Your coach">
          <RowLink href="/onboarding?edit=1" icon={<IconTile icon={SlidersHorizontal} tint="blue" />} label="Goals & texting style" sub={data.profile.goals.slice(0, 2).join(" · ") || "Not set"} />
          <RowLink href="/app/memory" icon={<IconTile icon={Brain} tint="violet" />} label="Memory" value={`${memoryCount} items`} />
          <RowLink href="/app/people" icon={<IconTile icon={Users} tint="amber" />} label="People" value={data.people.length} />
        </Group>

        <Group title="Preferences">
          <ToggleRow label="Remember automatically" sub="Save facts the coach suggests without asking each time" checked={prefs.autoRemember} onChange={(v) => setPref("autoRemember", v)} />
          <ToggleRow label="Keep screenshot previews" sub="Small previews stay in your chats so you can look back" checked={prefs.keepPreviews} onChange={(v) => setPref("keepPreviews", v)} />
          <ToggleRow label="Haptics" sub="A light tap when you connect a person or copy a reply" checked={prefs.haptics} onChange={(v) => setPref("haptics", v)} />
          <ToggleRow label="Notifications" sub="Gentle check-ins when you haven't updated someone in a while" checked={prefs.notifications} onChange={(v) => setPref("notifications", v)} />
        </Group>

        <Group title="Privacy" footer="Screenshots are read once and kept only as small previews in your chat. Your memory is never used to coach anyone else.">
          <RowButton onClick={download} icon={<IconTile icon={Download} tint="gray" />} label="Download my data" />
          <RowButton onClick={() => setConfirmChats(true)} icon={<IconTile icon={Trash2} tint="red" />} label="Delete all conversations" danger value={data.threads.length} />
        </Group>

        <Group title="Support">
          <RowLink href="/#faq" icon={<IconTile icon={HelpCircle} tint="gray" />} label="Help & FAQ" />
        </Group>

        <Group>
          <RowButton
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            icon={<IconTile icon={LogOut} tint="gray" />}
            label="Sign out"
          />
        </Group>

        <p className="text-center text-[11.5px] text-fg-faint">Deyte · signed in as {user.email}</p>
      </div>

      <Sheet
        open={confirmChats}
        onClose={() => setConfirmChats(false)}
        title="Delete all conversations?"
        subtitle={`${data.threads.length} conversations and their screenshot previews will be removed. People, facts and your memory stay.`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmChats(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                mutate((d) => (d.threads = []));
                setConfirmChats(false);
                toast("Conversations deleted");
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </Page>
  );
}
