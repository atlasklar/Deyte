import type { ChatLine } from "@/lib/types";
import { uid } from "@/lib/util";

const ME = /^(me|i|you|myself)$/i;

/**
 * Turns pasted text into conversation lines. Understands "Name: message",
 * "[10:42] Name: message" and WhatsApp-style "10/3/26, 9:14 PM - Name: message".
 * Unlabelled lines are kept and marked as theirs; the review step lets the
 * user fix the sender of every line.
 */
export function parsePasted(text: string): ChatLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ChatLine[] = [];
  for (const raw of lines) {
    const cleaned = raw
      .replace(/^\[?\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(\s?[AP]M)?\]?\s*[-–]?\s*/i, "")
      .replace(/^\[?\d{1,2}:\d{2}(\s?[AP]M)?\]?\s*/i, "");
    const m = cleaned.match(/^([A-Za-zÀ-ÿ' .]{1,24}):\s*(.+)$/);
    if (m) {
      // Anything not labelled as the user is treated as the other person; the review step fixes mistakes.
      const isMe = ME.test(m[1].trim());
      out.push({ id: uid("l"), from: isMe ? "me" : "them", text: m[2].trim() });
    } else {
      out.push({ id: uid("l"), from: "them", text: cleaned });
    }
  }
  return out;
}

/** True when pasted text looks like a conversation rather than a question. */
export function looksLikeConversation(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 3) return false;
  const labelled = lines.filter((l) => /^(\[?[\d/:,.\sAPM-]+\]?\s*)?[A-Za-zÀ-ÿ' .]{1,24}:\s+\S/.test(l.trim())).length;
  return labelled / lines.length >= 0.5;
}
