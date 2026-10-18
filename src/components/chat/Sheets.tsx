"use client";

import { useState } from "react";
import { LIMITS } from "@/config/product";
import { cn } from "@/lib/util";
import { Button, Textarea } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

export function PasteSheet({ open, onClose, onReview }: { open: boolean; onClose: () => void; onReview: (text: string) => void }) {
  const [text, setText] = useState("");
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const tooMany = lines > LIMITS.pastedLines;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Paste the messages"
      subtitle="Any format works. Lines like “Me: …” and “Her: …” are sorted automatically — you'll confirm who said what next."
      footer={
        <Button
          variant="bronze"
          className="w-full"
          disabled={!text.trim() || tooMany}
          onClick={() => {
            onReview(text);
            setText("");
          }}
        >
          Review the conversation
        </Button>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        placeholder={"Her: haha okay that's fair\nMe: told you\nHer: so what are you up to this weekend?"}
        className="min-h-56 font-[350]"
      />
      <p className={cn("mt-2 text-[12.5px]", tooMany ? "text-danger" : "text-fg-subtle")}>
        {lines} of {LIMITS.pastedLines} lines{tooMany ? " — trim it to the part that matters" : ""}
      </p>
    </Sheet>
  );
}
