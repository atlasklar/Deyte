/* Shared shapes for the demo store and the coach engine. */

export type StageId =
  | "matched"
  | "talking"
  | "early_dates"
  | "dating"
  | "exclusive"
  | "girlfriend"
  | "ended";

export const STAGES: { id: StageId; label: string; hint: string }[] = [
  { id: "matched", label: "Just matched", hint: "Haven't really talked yet" },
  { id: "talking", label: "Talking", hint: "Texting, no date yet" },
  { id: "early_dates", label: "Early dates", hint: "One to three dates" },
  { id: "dating", label: "Dating", hint: "Seeing each other regularly" },
  { id: "exclusive", label: "Exclusive", hint: "Not seeing anyone else" },
  { id: "girlfriend", label: "Girlfriend", hint: "In a relationship" },
  { id: "ended", label: "Ended", hint: "Not pursuing this" },
];

export function stageLabel(id: StageId) {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

/** Where a remembered item came from. Facts the user approved are kept apart from the coach's reads. */
export type MemorySource = "you" | "onboarding" | "approved" | "learned";

export type MemoryItem = {
  id: string;
  text: string;
  source: MemorySource;
  createdAt: string;
};

export type SelfCategory = "goal" | "style" | "voice" | "context";

export type SelfMemoryItem = MemoryItem & { category: SelfCategory };

export type TimelineEvent = {
  id: string;
  at: string;
  kind: "review" | "update" | "stage" | "created";
  title: string;
  detail?: string;
  threadId?: string;
};

/** What the user told the coach when he set this person up. */
export type PersonProfile = {
  howLong?: string;
  /** What he wants from this. */
  want: string[];
  /** What he's concerned about. */
  concerns: string[];
  /** What she's like / what's going on with her. */
  her: string[];
  notes?: string;
};

export type Person = {
  id: string;
  name: string;
  stage: StageId;
  metVia?: string;
  note?: string;
  profile?: PersonProfile;
  /** Things the user confirmed. */
  facts: MemoryItem[];
  /** Interpretations. Never presented as facts. */
  reads: MemoryItem[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type ChatLine = { id: string; from: "me" | "them"; text: string };

export type Attachment = { id: string; name: string; thumb: string };

export type Background = {
  metInPerson?: boolean;
  planExists?: boolean;
  disagreement?: boolean;
  notes?: string;
};

export type Intent = "decide" | "understand" | "respond" | "upload" | "open";

export type RecommendationType =
  | "keep_going"
  | "flirt"
  | "propose_date"
  | "clarify"
  | "repair"
  | "boundary"
  | "stop_initiating"
  | "move_on"
  | "reconnect"
  | "hold";

export const RECOMMENDATION_LABEL: Record<RecommendationType, string> = {
  keep_going: "Keep the conversation going",
  flirt: "Flirt",
  propose_date: "Propose a date",
  clarify: "Clarify intentions",
  repair: "Address the misunderstanding",
  boundary: "Set a boundary",
  stop_initiating: "Stop initiating",
  move_on: "Move on",
  reconnect: "Reconnect",
  hold: "Hold steady",
};

export type MemorySuggestion = {
  id: string;
  scope: "self" | "person";
  kind: "fact" | "read";
  text: string;
  status: "pending" | "saved" | "dismissed";
};

export type Tone = "shorter" | "warmer" | "playful" | "direct";

export type CoachReply =
  | {
      kind: "analysis";
      happening: string[];
      explanations: string[];
      next: { type: RecommendationType; text: string };
      why: string;
      say?: { text: string; variants?: Partial<Record<Tone, string>> };
      /** Shown instead of a message when the right move is to send nothing. */
      noMessage?: string;
      memory?: MemorySuggestion[];
    }
  | { kind: "clarify"; text: string; options: string[] }
  | { kind: "note"; text: string; options?: string[]; actions?: ("upload" | "paste")[] }
  | { kind: "draft"; intro: string; text: string }
  /** A live answer from the coach: Markdown text plus optional structured extras. */
  | {
      kind: "chat";
      text: string;
      say?: { text: string; variants?: Partial<Record<Tone, string>> };
      options?: string[];
      memory?: MemorySuggestion[];
      next?: RecommendationType;
      /** The reply was cut short (stopped by the user or a connection drop). */
      partial?: boolean;
    };

export type UserMessage = {
  id: string;
  role: "user";
  at: string;
  text?: string;
  attachments?: Attachment[];
  extracted?: ChatLine[];
  background?: Background;
};

export type CoachMessage = {
  id: string;
  role: "coach";
  at: string;
  reply: CoachReply;
  /** The user's writing feedback on the suggested message. */
  voice?: "me" | "not_me";
};

export type Message = UserMessage | CoachMessage;

export type Thread = {
  id: string;
  title: string;
  personId?: string;
  intent?: Intent;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export type Profile = {
  /** First name (used in greetings). */
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
  ageRange?: string;
  situation: string[];
  /** What he wants out of dating right now. */
  lookingFor?: string;
  /** What's been hardest lately (from onboarding). */
  struggles?: string[];
  /** How blunt the coach should be. */
  coachTone?: "blunt" | "balanced" | "gentle";
  goals: string[];
  style: string[];
  emoji: "never" | "sometimes" | "often";
  samples?: string;
};

export type SubStatus = "active" | "paused" | "canceled" | "ended";

export type Subscription = {
  status: SubStatus;
  price: number;
  /** Start of the current paid period. */
  periodStart: string;
  /** Renewal date while active; access end date once canceled. */
  periodEnd: string;
  pausedAt?: string;
  resumeOn?: string;
  canceledAt?: string;
};

export type Prefs = {
  /** Save facts the coach suggests without asking each time. */
  autoRemember: boolean;
  /** Keep small screenshot previews in chats. */
  keepPreviews: boolean;
  haptics: boolean;
  notifications: boolean;
};

export const DEFAULT_PREFS: Prefs = { autoRemember: false, keepPreviews: true, haptics: true, notifications: true };

export type AccountData = {
  version: 1;
  id: string;
  profile: Profile;
  prefs?: Prefs;
  onboarded: boolean;
  self: SelfMemoryItem[];
  people: Person[];
  threads: Thread[];
  subscription: Subscription;
};

