"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ClipboardList, ImagePlus, Lock, Square, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LIMITS } from "@/config/product";
import { looksLikeConversation } from "@/lib/coach/parse";
import { validateScreenshots } from "@/lib/files";
import { cn } from "@/lib/util";
import { useToast } from "@/components/ui/Toast";

export type ComposerSubmit = { text: string; files: File[]; reviewPaste: boolean };

export type ComposerHandle = { openFiles: () => void; focus: () => void; setText: (t: string) => void };

type Props = {
  placeholder?: string;
  variant?: "hero" | "dock";
  disabledReason?: string;
  onSubmit: (s: ComposerSubmit) => void;
  onActiveChange?: (active: boolean) => void;
  autoFocus?: boolean;
  /** The coach is writing: show Stop instead of Send. */
  busy?: boolean;
  /** Rendered at the start of the toolbar (the connected-person chip). */
  leading?: React.ReactNode;
  onStop?: () => void;
};

/**
 * One input for everything: questions, situations, pasted conversations and
 * screenshots. Pasted conversations are offered for review before sending.
 */
export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { placeholder = "What's going on in your dating life?", variant = "dock", disabledReason, onSubmit, onActiveChange, autoFocus, busy, onStop, leading },
  ref,
) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hero = variant === "hero";
  const disabled = Boolean(disabledReason);
  const conversationLike = looksLikeConversation(text);

  useImperativeHandle(ref, () => ({
    openFiles: () => fileInput.current?.click(),
    focus: () => area.current?.focus(),
    setText: (t) => {
      setText(t);
      requestAnimationFrame(() => area.current?.focus());
    },
  }));

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  // Auto-grow
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, hero ? 220 : 180)}px`;
  }, [text, hero]);

  useEffect(() => onActiveChange?.(text.length > 0 || files.length > 0), [text, files, onActiveChange]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const { accepted, error } = validateScreenshots(Array.from(list), files.length);
    if (error) toast(error, "info");
    if (accepted.length) setFiles((f) => [...f, ...accepted]);
  };

  const submit = (reviewPaste = false) => {
    const t = text.trim();
    if (disabled || busy || (!t && !files.length)) return;
    if (t.length > LIMITS.messageChars) {
      toast(`Keep it under ${LIMITS.messageChars.toLocaleString()} characters.`, "info");
      return;
    }
    onSubmit({ text: t, files, reviewPaste });
    setText("");
    setFiles([]);
  };

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0);

  return (
    <div className="composer">
      <div className="composer-inner relative">
        {disabled && (
          <div className="absolute inset-0 z-10 flex items-center gap-3 rounded-[15px] bg-ink-900/95 px-4 text-[13px] leading-snug text-fg-muted">
            <Lock size={16} strokeWidth={1.6} className="shrink-0 text-fg-subtle" />
            {disabledReason}
          </div>
        )}

        <AnimatePresence initial={false}>
          {previews.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3">
                {previews.map((src, i) => (
                  <div key={src} className="relative h-[64px] w-[46px] shrink-0 overflow-hidden rounded-lg border border-[var(--line-strong)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove screenshot"
                      onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-fg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={area}
          value={text}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
            if (imgs.length) {
              e.preventDefault();
              const dt = new DataTransfer();
              imgs.forEach((f) => dt.items.add(f));
              addFiles(dt.files);
            }
          }}
          placeholder={placeholder}
          rows={1}
          aria-label={placeholder}
          className={cn(
            "block w-full resize-none bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none",
            hero ? "min-h-[56px] px-4 pb-1 pt-[15px] text-[16px] leading-relaxed" : "min-h-[46px] px-3.5 pb-0.5 pt-[12px] text-[16px] leading-relaxed",
          )}
        />

        <AnimatePresence>
          {conversationLike && files.length === 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => submit(true)}
              className="mx-3 mb-1 flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-ink-800 px-2.5 py-1.5 text-[12.5px] text-fg"
            >
              <ClipboardList size={14} strokeWidth={1.7} />
              Looks like a conversation — review who said what
            </motion.button>
          )}
        </AnimatePresence>

        <div className={cn("flex items-center justify-between", hero ? "px-2 pb-2" : "px-1.5 pb-1.5")}>
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={disabled}
              aria-label="Add screenshots"
              title="Add screenshots"
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-fg-subtle transition-colors hover:bg-white/[0.05] hover:text-fg"
            >
              <ImagePlus size={17} strokeWidth={1.75} />
            </button>
            {leading}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-black"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit()}
              disabled={!canSend}
              aria-label="Send"
              className={cn(
                "focus-ring flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors duration-150",
                canSend ? "bg-white text-black hover:bg-white/90" : "bg-ink-700 text-fg-faint",
              )}
            >
              <ArrowUp size={18} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
