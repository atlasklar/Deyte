/*
 * The coach's contract with the UI. During the UI phase `coach` is the scripted
 * demo engine. Later, implement the same interface against an API route that
 * combines the shared knowledge base with this account's private memory.
 */

import type { AccountData, ChatLine, CoachReply, Intent, Person, Thread, Tone, UserMessage } from "@/lib/types";
import { demoEngine } from "./demo";

export type CoachRequest = {
  account: AccountData;
  thread: Thread;
  message: UserMessage;
  person?: Person;
};

export interface CoachEngine {
  /** One reply to the latest user message, with full thread + memory context. */
  reply(req: CoachRequest): Promise<CoachReply>;
  /** The coach's first message when a thread starts from a lobby shortcut. */
  opener(intent: Intent, person?: Person): CoachReply | null;
  /** Read screenshots into a conversation the user can correct before analysis. */
  extract(files: File[], person?: Person): Promise<ChatLine[]>;
  /** Re-voice a suggested message. */
  retone(text: string, tone: Tone, account: AccountData): string;
  /** Status lines shown while the reply is being prepared. */
  thinkingSteps(req: CoachRequest): string[];
}

export const coach: CoachEngine = demoEngine;
