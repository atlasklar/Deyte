/*
 * Scripted demo coach. It recognises common situations from the user's words
 * and the reviewed conversation, grounds observations in what was actually
 * shared, and writes suggested messages in the voice saved in memory.
 * Replace with the real engine once the knowledge base is configured.
 */

import type {
  AccountData,
  ChatLine,
  CoachReply,
  Intent,
  MemorySuggestion,
  Person,
  RecommendationType,
  Tone,
} from "@/lib/types";
import { sleep, uid } from "@/lib/util";
import type { CoachEngine, CoachRequest } from "./engine";

type Analysis = Extract<CoachReply, { kind: "analysis" }>;

/* ── Voice ──────────────────────────────────────────────────── */

function voicePrefs(account: AccountData) {
  const notes = account.self
    .filter((s) => s.category === "voice" || s.category === "style")
    .map((s) => s.text.toLowerCase())
    .join(" ");
  return {
    lowercase: /lowercase/.test(notes),
    noEmoji: account.profile.emoji === "never" || /never uses emoji/.test(notes),
    brief: /short|few words|doesn't do long/.test(notes) || account.profile.style.includes("Few words"),
  };
}

function inVoice(text: string, account: AccountData) {
  const v = voicePrefs(account);
  let out = text;
  if (v.noEmoji) out = out.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s{2,}/g, " ").trim();
  if (v.lowercase) out = out.charAt(0).toLowerCase() + out.slice(1).replace(/([.?!]\s+)([A-Z])/g, (_, p, c) => p + c.toLowerCase());
  return out;
}

/* ── Grounding: observations from the reviewed conversation ── */

function readLines(lines: ChatLine[] | undefined, name: string) {
  if (!lines?.length) return [] as string[];
  const mine = lines.filter((l) => l.from === "me");
  const theirs = lines.filter((l) => l.from === "them");
  const obs: string[] = [];
  obs.push(`${lines.length} messages reviewed: ${mine.length} from you, ${theirs.length} from ${name}.`);
  const avg = (ls: ChatLine[]) => (ls.length ? ls.reduce((n, l) => n + l.text.length, 0) / ls.length : 0);
  if (mine.length && theirs.length) {
    const ratio = avg(mine) / Math.max(1, avg(theirs));
    if (ratio > 1.8) obs.push(`Your messages run about ${Math.round(ratio)}× longer than hers.`);
    else if (ratio < 0.55) obs.push("She's writing more than you are — she's putting in effort.");
  }
  const lastTheirs = theirs[theirs.length - 1];
  if (lastTheirs?.text.trim().endsWith("?")) obs.push("Her last message asks you a question.");
  const last = lines[lines.length - 1];
  if (last?.from === "me") obs.push("The last message is yours — she hasn't replied yet.");
  return obs;
}

function has(re: RegExp, s: string) {
  return re.test(s);
}

function suggestion(scope: MemorySuggestion["scope"], kind: MemorySuggestion["kind"], text: string): MemorySuggestion {
  return { id: uid("ms"), scope, kind, text, status: "pending" };
}

/* ── Scenarios ──────────────────────────────────────────────── */

type Ctx = {
  text: string;
  all: string;
  name: string;
  person?: Person;
  lines?: ChatLine[];
  account: AccountData;
};

function base(c: Ctx, happening: string[]) {
  return [...happening, ...readLines(c.lines, c.name)].slice(0, 4);
}

function analysis(
  c: Ctx,
  type: RecommendationType,
  parts: Omit<Analysis, "kind" | "next" | "say"> & { next: string; say?: string; variants?: Partial<Record<Tone, string>> },
): Analysis {
  const { next, say, variants, ...rest } = parts;
  return {
    kind: "analysis",
    ...rest,
    next: { type, text: next },
    say: say
      ? {
          text: inVoice(say, c.account),
          variants: variants
            ? Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, inVoice(v, c.account)]))
            : undefined,
        }
      : undefined,
  };
}

const scenarios: { test: (c: Ctx) => boolean; build: (c: Ctx) => Analysis }[] = [
  {
    // She re-initiated after a gap or after you stopped chasing.
    test: (c) => has(/(texted (me )?back|reached out|messaged me|got back to me|she (texted|replied|messaged)( me)? (first|again)|finally (texted|replied))/, c.text),
    build: (c) =>
      analysis(c, "keep_going", {
        happening: base(c, [`${c.name} reached out after a gap.`, "You weren't the one chasing this time."]),
        explanations: [
          "Her earlier schedule may have genuinely eased up.",
          "She may have noticed your interest more once you stopped pushing. Either way, her effort is the signal that matters — one message doesn't settle where she stands.",
        ],
        next: "Reply warmly and without commentary on the gap. Keep it light, and let her show whether she wants to make a plan.",
        why: "Matching her effort keeps things balanced. If the conversation flows for a few messages, one specific invite is fine — but don't jump straight back into chasing.",
        say: "Hey, good to hear from you. How's the chaos been?",
        variants: { playful: "Look who it is. Survived the crazy month?", shorter: "Hey you. How've you been?" },
        memory: [suggestion("person", "fact", "Reached out first after a quiet stretch.")],
      }),
  },
  {
    // Declined more than once without a counter-offer.
    test: (c) =>
      has(/(declin|said no|can'?t make it|can'?t this|rain ?check|swamped|busy|family stuff|another time)/, c.all) &&
      has(/(twice|two times|again|second time|both|2 times)/, c.all),
    build: (c) =>
      analysis(c, "stop_initiating", {
        happening: base(c, [
          "You've suggested meeting at least twice.",
          `${c.name} declined each time without suggesting another day.`,
        ]),
        explanations: [
          "Her schedule may genuinely be full right now.",
          "She may be less interested than you are. Nothing here establishes which — and you don't need to know her motive to decide.",
        ],
        next: "Stop making further invitations for now. See whether she makes an effort to arrange something herself.",
        why: "You've made your interest clear. Another invitation after two declines without a counter-offer turns interest into pursuit. If she wants to meet, the next move is hers.",
        noMessage:
          "No message needed. If she reaches out, reply warmly and let her suggest the time. This isn't a silent treatment — you're just no longer the only one making plans.",
        memory: [
          suggestion("person", "fact", "Declined two invitations without offering another time."),
          suggestion("person", "read", "Limited availability or limited interest. Motive not established."),
        ],
      }),
  },
  {
    // Went quiet.
    test: (c) => has(/(ghost|no reply|hasn'?t (replied|answered|responded)|haven'?t heard|left (me )?on read|stopped (texting|replying)|went quiet|silent)/, c.all),
    build: (c) => {
      const alreadyFollowed = has(/(followed up|double text|texted (her )?again|sent another)/, c.all);
      return alreadyFollowed
        ? analysis(c, "move_on", {
            happening: base(c, ["She hasn't replied.", "You've already followed up once."]),
            explanations: [
              "She may be busy, distracted, or talking to other people.",
              "She may have lost interest. You can't tell from silence — and you don't need to.",
            ],
            next: `Let this one go. Don't send anything else unless ${c.name} reaches out.`,
            why: "One follow-up is reasonable. A second one asks her to manage your uncertainty. Put the energy into conversations that are moving.",
            noMessage: "No message. If she comes back, respond normally and suggest a plan — no commentary about the gap.",
            memory: [suggestion("person", "fact", "Went quiet after a follow-up.")],
          })
        : analysis(c, "reconnect", {
            happening: base(c, ["She hasn't replied to your last message.", "You haven't followed up yet."]),
            explanations: [
              "People drop threads for ordinary reasons — work, travel, a busy week.",
              "It may also mean waning interest. One light message is how you find out without pressure.",
            ],
            next: "Send one light, low-pressure message that's easy to answer. If that gets nothing, let it go.",
            why: "A single follow-up after a few days is normal. Keep it short and unrelated to the silence so there's nothing to explain.",
            say: "Saw a place that does the worst-named cocktails in the city. Thought of you. How's your week been?",
            variants: {
              shorter: "How's your week going?",
              playful: "Quick poll: is it too early in the week to be thinking about tacos",
              direct: "Still up for that drink? I'm free Thursday.",
            },
          });
    },
  },
  {
    // Conflict in an established relationship.
    test: (c) =>
      has(/(argu|fight|fought|upset|mad at me|angry|annoyed|it'?s fine|being short|cold|distant|hurt|snapped)/, c.all) &&
      (["dating", "exclusive", "girlfriend"].includes(c.person?.stage ?? "") || has(/girlfriend|gf|partner/, c.all)),
    build: (c) =>
      analysis(c, "repair", {
        happening: base(c, [
          "There's tension after something specific happened.",
          "The conversation since then has been short or guarded.",
        ]),
        explanations: [
          `${c.name} may be hurt about the event itself, or about what it seemed to say about her priority.`,
          "She may want you to bring it up rather than having to. These are possibilities to check, not conclusions.",
        ],
        next: "Bring it up yourself, in person or on a call. Acknowledge the impact on her first, then ask what she needs.",
        why: "Repeating an apology over text rarely lands. Naming the impact shows you understand, and asking keeps you from guessing at her feelings.",
        say: `Hey — I don't think I handled that well, and I'd rather talk than text about it. Can I call you tonight?`,
        variants: {
          warmer: "I've been thinking about earlier. I care about how that felt for you, and I want to get it right. Can we talk tonight?",
          shorter: "Can we talk tonight? I want to fix this properly.",
        },
        memory: [suggestion("person", "read", "Disagreements land harder when they touch whether she feels prioritized.")],
      }),
  },
  {
    // Flaking, lateness, disrespect.
    test: (c) => has(/(late again|always late|cancel+ed last minute|flak|keeps cancel|stood me up|disrespect|rude to me|no[- ]show)/, c.all),
    build: (c) =>
      analysis(c, "boundary", {
        happening: base(c, ["This has happened more than once.", "There's been no clear acknowledgment from her side."]),
        explanations: [
          "She may be overcommitted and not realise the effect.",
          "She may not be prioritising the plans. Repeated behaviour matters more than any single reason she gives.",
        ],
        next: "Name the pattern once, calmly, and say what you'll do differently if it continues.",
        why: "A boundary isn't a complaint or an ultimatum — it tells her what works for you. How she responds tells you far more than guessing.",
        say: "I like spending time with you, but last-minute cancels don't work for me. If plans need to move, a heads-up earlier in the day would mean a lot.",
        variants: { shorter: "Last-minute cancels don't really work for me. Earlier heads-up next time?" },
      }),
  },
  {
    // Where do we stand.
    test: (c) => has(/(mixed signals|hot and cold|where (we|this|things) (stand|is going|are going)|what are we|exclusive|define (the|this)|label|go(ing)? official|serious with)/, c.all),
    build: (c) =>
      analysis(c, "clarify", {
        happening: base(c, [
          "You're getting signals that don't add up to a clear picture.",
          `There's enough history with ${c.name} that the question is fair to ask.`,
        ]),
        explanations: [
          "She may be unsure herself, or waiting for you to lead the conversation.",
          "She may want to keep things casual. Only she can tell you which — the messages can't.",
        ],
        next: "Ask directly, in person, and say what you want first. Keep it light, not a negotiation.",
        why: "Analysing more messages won't resolve ambiguity she hasn't resolved herself. Stating your side first makes it easy for her to be honest.",
        say: "I'm really enjoying this and I'm not seeing anyone else. Curious where your head's at.",
        variants: { direct: "I'd like us to be exclusive. How do you feel about that?" },
        memory: [suggestion("self", "fact", "Wants clarity on where things stand before investing more.")],
      }),
  },
  {
    // After a date.
    test: (c) => has(/(first date|second date|third date|after (the|our) date|date (was|went)|went well|great time|good time|had fun)/, c.all),
    build: (c) =>
      analysis(c, "propose_date", {
        happening: base(c, ["The date went well by your account.", "There's no next plan on the calendar yet."]),
        explanations: [
          "If she's been engaged since, interest is likely mutual.",
          "Momentum after a good date is real but short-lived. A specific plan is what turns it into the next date.",
        ],
        next: "Thank her briefly, then propose a specific next plan — day and place — within the next week.",
        why: "Vague \"let's do it again\" messages lose momentum. A concrete invite while the date is fresh is the confident, natural move.",
        say: "Really enjoyed the other night. Let's do round two — Thursday, I'll pick the place?",
        variants: {
          shorter: "Good time the other night. Thursday?",
          playful: "The other night was dangerously fun. Round two Thursday — I'm picking the place, you're picking dessert.",
        },
        memory: [suggestion("person", "fact", "Recent date went well; next date being planned.")],
      }),
  },
  {
    // Low effort / dry texting.
    test: (c) => has(/(dry|one[- ]word|short replies|slow to reply|takes (hours|days)|low effort|barely replies|just says lol)/, c.all),
    build: (c) =>
      analysis(c, "propose_date", {
        happening: base(c, ["Her replies are short or slow.", "The conversation hasn't built much momentum."]),
        explanations: [
          "Some people simply dislike texting and do better in person.",
          "Short replies can also mean low interest. An invitation tells you which far faster than more texting.",
        ],
        next: "Stop trying to make the texting better. Make one clear, specific invitation.",
        why: "Working harder over text against low effort usually backfires. A specific plan is easy to say yes to — and a clear answer either way.",
        say: "I'm better in person than over text. Drink Thursday?",
        variants: { playful: "Texting isn't my best event. Drink Thursday so I can redeem myself?" },
      }),
  },
  {
    // Distance in a relationship.
    test: (c) =>
      (["girlfriend", "exclusive"].includes(c.person?.stage ?? "") || has(/girlfriend|gf/, c.all)) &&
      has(/(routine|bored|spark|connection|quality time|disconnected|roommates|busy lately|haven'?t seen)/, c.all),
    build: (c) =>
      analysis(c, "reconnect", {
        happening: base(c, ["Life has been busy and time together has turned routine.", "Nothing is wrong, but the connection feels thinner."]),
        explanations: [
          `${c.name} may feel it too, or may be fine and simply busy.`,
          "Either way, connection usually fades from neglect rather than conflict.",
        ],
        next: "Plan something specific and new for the two of you this week — you lead the planning.",
        why: "Taking the planning off her plate is itself a signal of priority. Novelty does more for connection than another night on the couch.",
        say: "Keep Friday free. I'm planning something — dress warm.",
        variants: { warmer: "I miss us having proper time together. Keep Friday free — I'm planning something." },
      }),
  },
  {
    // Asking out.
    test: (c) => has(/(ask (her )?out|date idea|meet up|invite her|hang out|grab (a )?drink|should i ask)/, c.all),
    build: (c) =>
      analysis(c, "propose_date", {
        happening: base(c, ["The conversation has had some real back-and-forth.", "No plan has been suggested yet."]),
        explanations: [
          "If she's been asking questions back, she's likely open to meeting.",
          "Whether she wants to meet is the open question — only an invite answers it.",
        ],
        next: "Propose a specific, low-key first date: a day, a place, a short window.",
        why: "Specific is easier to say yes to than \"sometime\", and it shows you're decisive. Keep the stakes low so it's an easy yes.",
        say: "This is too good for an app. Drink Thursday? I know a spot near you.",
        variants: { shorter: "Drink Thursday?", playful: "I've decided this conversation needs a venue. Thursday, 7?" },
      }),
  },
  {
    // Keeping it going.
    test: (c) => has(/(flirt|banter|boring|keep (it|the conversation) going|what (do|should) i (say|reply)|reply to this|respond|what to say)/, c.all),
    build: (c) =>
      analysis(c, "flirt", {
        happening: base(c, ["The conversation is friendly and ongoing.", "It's starting to drift into interview-style questions."]),
        explanations: [
          "She's engaged enough to keep replying.",
          "Q&A threads tend to plateau. A little playfulness or a plan moves it forward.",
        ],
        next: "Answer with a playful take instead of another question, and keep it short.",
        why: "Statements with personality create more attraction than questions. Short keeps the energy up.",
        say: "Bold of you to admit that. I'm going to need you to defend it over a drink.",
        variants: { shorter: "Bold. Defend it over a drink.", warmer: "Okay that's genuinely adorable. Tell me more over a drink?" },
      }),
  },
];

/* ── Follow-ups inside a thread ─────────────────────────────── */

function lastAnalysis(req: CoachRequest): Analysis | null {
  for (let i = req.thread.messages.length - 1; i >= 0; i--) {
    const m = req.thread.messages[i];
    if (m.role === "coach" && m.reply.kind === "analysis") return m.reply;
  }
  return null;
}

function followUp(req: CoachRequest, c: Ctx): CoachReply | null {
  const prev = lastAnalysis(req);
  const t = c.text;
  if (!prev) return null;

  const toneMatch: [RegExp, Tone][] = [
    [/shorter|too long|less words|trim/, "shorter"],
    [/warmer|sweeter|softer|nicer/, "warmer"],
    [/playful|funnier|flirt(ier|y)|cheeky/, "playful"],
    [/direct|straight(er)?|clearer|bolder/, "direct"],
  ];
  for (const [re, tone] of toneMatch) {
    if (re.test(t) && prev.say) {
      const intro = { shorter: "Tighter:", warmer: "Warmer:", playful: "More playful:", direct: "More direct:" }[tone];
      return { kind: "draft", intro, text: retone(prev.say.text, tone, req.account, prev.say.variants) };
    }
  }
  if (/sound (more )?like me|not my voice|rewrite|reword|different version/.test(t) && prev.say) {
    return { kind: "draft", intro: "Closer to how you write:", text: retone(prev.say.text, "shorter", req.account, prev.say.variants) };
  }
  if (/^(why|how come|explain)/.test(t)) {
    return { kind: "note", text: prev.why + " If something I'm assuming is wrong, tell me and I'll re-read it." };
  }
  if (/(she (replied|said|answered|texted)|update|she's in|said yes|it went|we went)/.test(t)) {
    return {
      kind: "note",
      text: `Noted. I've added that to ${c.name}'s timeline. If you want a read on what she said, paste it or upload the screenshot.`,
      options: ["Here's what she said", "What should I do now?"],
    };
  }
  return null;
}

/* ── Engine ─────────────────────────────────────────────────── */

const SHORTCUT_OPENERS: Record<Exclude<Intent, "upload" | "open">, (p?: Person) => CoachReply> = {
  decide: (p) => ({
    kind: "note",
    text: p
      ? `What are you deciding about ${p.name}? Tell me the options you're weighing, or share the latest messages.`
      : "What are you deciding? Tell me who it's about and the options you're weighing — or share the conversation.",
    options: ["Whether to ask her out", "Whether to keep pursuing", "How to handle a disagreement", "Whether to define things"],
    actions: ["upload", "paste"],
  }),
  understand: () => ({
    kind: "note",
    text: "Share the conversation — screenshots or pasted messages. I'll show you what I read before I give you anything, so you can correct it.",
    actions: ["upload", "paste"],
  }),
  respond: (p) => ({
    kind: "note",
    text: `Share ${p ? `${p.name}'s` : "her"} last few messages and tell me what you want to happen next. You'll get the read first, then a reply in your voice.`,
    actions: ["upload", "paste"],
  }),
};

function retone(text: string, tone: Tone, account: AccountData, variants?: Partial<Record<Tone, string>>) {
  const pre = variants?.[tone];
  if (pre) return inVoice(pre, account);
  let out = text;
  if (tone === "shorter") out = text.split(/(?<=[.?!])\s+/).slice(-1)[0] ?? text;
  if (tone === "warmer") out = `Honestly, I've been enjoying this. ${text}`;
  if (tone === "playful") out = text.replace(/\?$/, " — unless you're scared?");
  if (tone === "direct") out = text.replace(/^(hey|so|honestly)[, ]+/i, "");
  return inVoice(out, account);
}

export const demoEngine: CoachEngine = {
  opener(intent, person) {
    if (intent === "open" && person)
      return {
        kind: "note",
        text: `What's new with ${person.name}? I have her history, so just tell me what happened since last time — or share the latest messages.`,
        actions: ["upload", "paste"],
      };
    if (intent === "upload" || intent === "open") return null;
    return SHORTCUT_OPENERS[intent](person);
  },

  async extract(files) {
    // Demo: a fixed sample stands in for screenshot reading.
    await sleep(1400 + files.length * 250);
    const sample: [ChatLine["from"], string][] = [
      ["them", "Okay that place was amazing, thank you for picking it"],
      ["me", "Told you. The bread alone was worth it"],
      ["them", "I'm still thinking about it honestly"],
      ["me", "We should go back. Or find somewhere that can compete"],
      ["them", "Haha maybe! This week is chaos at work though"],
      ["them", "How was your weekend?"],
    ];
    return sample.map(([from, text]) => ({ id: uid("l"), from, text }));
  },

  retone(text, tone, account) {
    return retone(text, tone, account);
  },

  thinkingSteps(req) {
    const name = req.person?.name;
    const lines = req.message.extracted?.length;
    const steps = [lines ? `Reading ${lines} messages` : "Reading what you wrote"];
    if (name) steps.push(`Recalling ${name}'s history`);
    else if (req.account.self.length) steps.push("Recalling your goals and style");
    steps.push("Weighing the pattern, not one message", "Choosing one next move");
    return steps;
  },

  async reply(req) {
    const { account, message, person } = req;
    const text = (message.text ?? "").toLowerCase();
    const linesText = (message.extracted ?? []).map((l) => l.text).join(" ").toLowerCase();
    const bg = message.background;
    const memory = [
      ...(person?.facts ?? []).map((f) => f.text),
      bg?.notes ?? "",
      bg?.disagreement ? "disagreement upset" : "",
    ]
      .join(" ")
      .toLowerCase();
    const c: Ctx = {
      text,
      all: `${text} ${linesText} ${memory}`,
      name: person?.name ?? "she",
      person,
      lines: message.extracted,
      account,
    };

    // The UI paces the visible thinking; this is just network-like latency.
    await sleep(400 + Math.random() * 400);

    const follow = followUp(req, c);
    if (follow) return follow;

    // Prefer what the user just said; fall back to stored context.
    const direct = scenarios.find((s) => s.test({ ...c, all: `${text} ${linesText}` }));
    const scenario = direct ?? scenarios.find((s) => s.test(c));
    if (scenario) return polish(scenario.build(c), c);

    // Not enough to go on: ask one focused question before recommending anything strong.
    if (!message.extracted?.length && text.length < 140) {
      return {
        kind: "clarify",
        text: person
          ? `Before I recommend anything: what happened most recently with ${person.name}, and what do you want to happen next?`
          : "Before I recommend anything: who's this about, how far along are you, and what do you want to happen next?",
        options: person
          ? ["She went quiet", "We had a great date", "We had a disagreement", "I want to ask her out"]
          : ["Texting, no date yet", "Been on a date or two", "She's my girlfriend", "I'll share the messages"],
      };
    }

    return polish(
      analysis(c, "keep_going", {
        happening: base(c, ["The conversation is active on both sides."]),
        explanations: [
          "Nothing in what you've shared signals a problem.",
          "There's also no plan yet, which is where most good conversations stall.",
        ],
        next: "Keep it going with one playful, specific reply, then look for a natural moment to suggest meeting.",
        why: "You don't need a strategy shift here — just keep the energy up and steer toward a plan within the next few exchanges.",
        say: "Okay, you've earned a follow-up question. But I'm asking it over a drink.",
      }),
      c,
    );
  },
};

/** Personal touches from memory: stage-aware notes and a reference to what was said before. */
function polish(a: Analysis, c: Ctx): Analysis {
  const p = c.person;
  if (p) {
    const prior = p.timeline.filter((t) => t.kind === "review").slice(-1)[0];
    if (prior && a.happening.length < 5) a.happening.push(`Last review: “${prior.title}” — ${prior.detail?.replace("Recommendation: ", "I recommended ") ?? "on file"}.`);
  }
  a.memory = (a.memory ?? []).map((m) => ({ ...m, text: m.text.replace(/\bshe\b/i, p?.name ?? "she") }));
  if (c.name === "she") {
    a.happening = a.happening.map((h) => h.replace(/^she\b/, "She"));
    a.explanations = a.explanations.map((h) => h.replace(/^she\b/, "She"));
    a.next.text = a.next.text.replace(/^she\b/, "She");
  }
  return a;
}
