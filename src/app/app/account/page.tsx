"use client";

import { ChevronRight, Download, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/config/product";
import { signOut, useAccount } from "@/lib/store";
import { formatDate } from "@/lib/util";
import { Badge, Button, SectionTitle } from "@/components/ui/primitives";
import { Page, PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

const STATUS = {
  active: { label: "Active", tone: "ok" },
  paused: { label: "Paused", tone: "sapphire" },
  canceled: { label: "Canceled", tone: "warn" },
  ended: { label: "Ended", tone: "neutral" },
} as const;

export default function AccountPage() {
  const { data, mutate } = useAccount();
  const router = useRouter();
  const toast = useToast();
  const s = data.subscription;
  const [confirmChats, setConfirmChats] = useState(false);

  const renewLine =
    s.status === "active"
      ? `Renews ${formatDate(s.periodEnd, { month: "long", day: "numeric" })}`
      : s.status === "paused"
        ? `Paused until ${formatDate(s.resumeOn!, { month: "long", day: "numeric" })}`
        : s.status === "canceled"
          ? `Access ends ${formatDate(s.periodEnd, { month: "long", day: "numeric" })}`
          : "Not subscribed";

  return (
    <Page>
      <PageHeader title="Account" subtitle={data.profile.email} />

      <div className="flex flex-col gap-6 pb-10">
        <Link href="/app/account/plan" className="card block px-4 py-4 transition-colors hover:bg-ink-850">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Deyte membership</span>
            <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
          </div>
          <p className="display mt-2 text-[26px] leading-none text-fg">
            {formatPrice(s.price)}
            <span className="ml-1 text-[13px] font-normal tracking-normal text-fg-subtle">/ month</span>
          </p>
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-fg-muted">{renewLine}</span>
            <span className="flex items-center gap-0.5 font-medium text-fg">
              Manage <ChevronRight size={15} />
            </span>
          </div>
        </Link>

        <section>
          <SectionTitle>Privacy</SectionTitle>
          <div className="card flex flex-col px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "my-coach-data.json";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="flex items-center gap-3 rounded-[11px] px-3 py-3 text-left text-[14.5px] text-fg hover:bg-white/[0.03]"
            >
              <Download size={16} strokeWidth={1.6} className="text-fg-subtle" /> Download my data
            </button>
            <Link href="/app/memory" className="flex items-center gap-3 rounded-[11px] px-3 py-3 text-[14.5px] text-fg hover:bg-white/[0.03]">
              <ChevronRight size={16} strokeWidth={1.6} className="text-fg-subtle" /> Review or delete memory
            </Link>
            {!confirmChats ? (
              <button type="button" onClick={() => setConfirmChats(true)} className="flex items-center gap-3 rounded-[11px] px-3 py-3 text-left text-[14.5px] text-danger hover:bg-danger/[0.05]">
                <Trash2 size={16} strokeWidth={1.6} /> Delete all conversations
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 px-3 py-3">
                <span className="text-[13.5px] text-fg-muted">Delete {data.threads.length} conversations and their screenshots?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmChats(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    mutate((d) => (d.threads = []));
                    setConfirmChats(false);
                    toast("Conversations deleted");
                  }}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
          <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-fg-subtle">
            Screenshots are read once and kept only as small previews in your chat. Your memory is never used to coach other users.
          </p>
        </section>

        <Button
          variant="secondary"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
        >
          <LogOut size={16} strokeWidth={1.6} /> Sign out
        </Button>
      </div>
    </Page>
  );
}
