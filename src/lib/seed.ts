import { PRICE_MONTHLY } from "@/config/product";
import type { AccountData, AccountSummary, Profile } from "./types";
import { daysFromNow } from "./util";

/*
 * Sample accounts for the UI phase. Two separate demo accounts show that each
 * account has its own private memory: Daniel is dating, James has a girlfriend.
 * Dates are relative to "now" so the demo always reads as current.
 */

export const DEMO_ACCOUNTS: AccountSummary[] = [
  { id: "acct_daniel", name: "Daniel", email: "daniel@demo.deyte", demo: true },
  { id: "acct_james", name: "James", email: "james@demo.deyte", demo: true },
];

const ago = (days: number, hours = 0) => daysFromNow(-(days + hours / 24));

function period(daysIn: number) {
  return { periodStart: ago(daysIn), periodEnd: daysFromNow(30 - daysIn) };
}

function daniel(): AccountData {
  return {
    version: 1,
    id: "acct_daniel",
    onboarded: true,
    profile: {
      name: "Daniel",
      email: "daniel@demo.deyte",
      ageRange: "30–34",
      situation: ["On the apps", "Going on dates"],
      goals: ["Know where I stand faster", "Turn good chats into dates", "Find something serious"],
      style: ["Direct", "Dry humor"],
      emoji: "never",
      samples: "Ha, fair. Thursday works — I'll pick the place.",
    },
    self: [
      { id: "s1", category: "goal", text: "Looking for something serious, not in a rush.", source: "onboarding", createdAt: ago(40) },
      { id: "s2", category: "goal", text: "Wants to stop investing in one-sided conversations sooner.", source: "you", createdAt: ago(21) },
      { id: "s3", category: "style", text: "Direct, dry humor. Doesn't do long texts.", source: "onboarding", createdAt: ago(40) },
      { id: "s4", category: "voice", text: "Never uses emojis. Short sentences, lowercase is fine.", source: "learned", createdAt: ago(12) },
      { id: "s5", category: "voice", text: "Prefers to suggest a specific day and place rather than \"sometime\".", source: "learned", createdAt: ago(6) },
      { id: "s6", category: "context", text: "Works long weeks Monday–Wednesday. Thursday to Sunday are open.", source: "you", createdAt: ago(18) },
    ],
    people: [
      {
        id: "p_maya",
        name: "Maya",
        stage: "early_dates",
        metVia: "Hinge",
        note: "Architect. Funny, quick replies on weekends.",
        profile: {
          howLong: "A few weeks",
          want: ["Something serious", "See where it goes"],
          concerns: ["Moving at the right pace"],
          her: ["Busy job", "Playful", "Takes initiative"],
          notes: "Deadline weeks make her slow on weekdays — not a signal.",
        },
        facts: [
          { id: "m1", text: "Two dates so far: wine bar, then climbing.", source: "approved", createdAt: ago(5) },
          { id: "m2", text: "She suggested the climbing date herself.", source: "you", createdAt: ago(9) },
          { id: "m3", text: "Deadline-heavy job; slower to reply on weekdays.", source: "you", createdAt: ago(14) },
        ],
        reads: [
          { id: "mr1", text: "Interest looks mutual — she initiates about half the time.", source: "approved", createdAt: ago(5) },
        ],
        timeline: [
          { id: "mt1", at: ago(19), kind: "created", title: "Matched on Hinge" },
          { id: "mt2", at: ago(14), kind: "review", title: "Reviewed the opener", detail: "Recommendation: propose a date", threadId: "t_maya_1" },
          { id: "mt3", at: ago(12), kind: "stage", title: "Stage → Early dates", detail: "First date at a wine bar" },
          { id: "mt4", at: ago(1, 3), kind: "review", title: "After the climbing date", detail: "Recommendation: propose a date", threadId: "t_maya_2" },
        ],
        createdAt: ago(19),
        updatedAt: ago(1, 3),
      },
      {
        id: "p_sofia",
        name: "Sofia",
        stage: "talking",
        metVia: "Bumble",
        profile: {
          howLong: "Two weeks",
          want: ["A first date"],
          concerns: ["Mixed signals", "She keeps declining"],
          her: ["Busy", "Friendly but short replies"],
        },
        facts: [
          { id: "f1", text: "Invited her out twice. Both declined, no other time suggested.", source: "approved", createdAt: ago(3) },
          { id: "f2", text: "Replies are friendly but short, usually a day later.", source: "you", createdAt: ago(3) },
        ],
        reads: [
          { id: "fr1", text: "Limited availability or limited interest. Motive not established.", source: "approved", createdAt: ago(3) },
        ],
        timeline: [
          { id: "ft1", at: ago(16), kind: "created", title: "Matched on Bumble" },
          { id: "ft2", at: ago(3), kind: "review", title: "She declined twice", detail: "Recommendation: stop initiating", threadId: "t_sofia" },
        ],
        createdAt: ago(16),
        updatedAt: ago(3),
      },
      {
        id: "p_ava",
        name: "Ava",
        stage: "matched",
        metVia: "Hinge",
        profile: { howLong: "Just matched", want: ["A first date"], concerns: [], her: ["Loves live music"] },
        facts: [{ id: "a1", text: "Liked his photo from Lisbon. Loves live music.", source: "you", createdAt: ago(0, 20) }],
        reads: [],
        timeline: [{ id: "at1", at: ago(0, 20), kind: "created", title: "Matched on Hinge" }],
        createdAt: ago(0, 20),
        updatedAt: ago(0, 20),
      },
    ],
    threads: [
      {
        id: "t_maya_2",
        title: "After the climbing date",
        personId: "p_maya",
        intent: "decide",
        createdAt: ago(1, 3),
        updatedAt: ago(1, 3),
        messages: [
          {
            id: "u1",
            role: "user",
            at: ago(1, 3),
            text: "Second date with Maya was great. Climbing, then tacos. She texted first this morning. Do I ask her out again now or wait?",
            extracted: [
              { id: "l1", from: "them", text: "My forearms are destroyed. 10/10 would fall off a wall with you again" },
              { id: "l2", from: "me", text: "you were doing fine until the ceiling part" },
              { id: "l3", from: "them", text: "the ceiling part was the WHOLE point" },
            ],
            background: { metInPerson: true, planExists: false, notes: "Second date. She suggested climbing." },
          },
          {
            id: "c1",
            role: "coach",
            at: ago(1, 3),
            reply: {
              kind: "analysis",
              happening: [
                "She texted first the morning after, and referenced doing it again.",
                "She suggested the climbing date herself — that's two signs of effort in a row.",
                "There's no plan on the calendar yet.",
              ],
              explanations: [
                "Most likely: she enjoyed it and is open to a third date.",
                "Possible: she's being friendly and will let you lead. Either way, a specific invite clears it up.",
              ],
              next: { type: "propose_date", text: "Ask her out for a specific evening this week, while the momentum is fresh." },
              why: "Her effort is matching yours. Waiting adds nothing here; a concrete plan is the natural next step after two good dates.",
              say: {
                text: "the wall won this round. rematch is dinner — thursday, that ramen place on 6th?",
                variants: {
                  shorter: "dinner thursday? ramen on 6th.",
                  warmer: "had a really good time saturday. let me take you to dinner thursday — ramen on 6th?",
                  playful: "the wall won this round. i demand a rematch, but with ramen. thursday?",
                },
              },
              memory: [
                { id: "ms1", scope: "person", kind: "fact", text: "Texted first the morning after date two.", status: "saved" },
              ],
            },
            voice: "me",
          },
        ],
      },
      {
        id: "t_sofia",
        title: "She's declined twice",
        personId: "p_sofia",
        intent: "decide",
        createdAt: ago(3),
        updatedAt: ago(3),
        messages: [
          {
            id: "u2",
            role: "user",
            at: ago(3),
            text: "Asked Sofia out last week, she said she was swamped. Asked again yesterday for Saturday, she said she has family stuff. Should I try another day?",
            extracted: [
              { id: "s1", from: "me", text: "Want to grab a drink Saturday? There's a good spot near the park" },
              { id: "s2", from: "them", text: "Ah I can't this weekend, family stuff" },
              { id: "s3", from: "me", text: "No worries" },
            ],
          },
          {
            id: "c2",
            role: "coach",
            at: ago(3),
            reply: {
              kind: "analysis",
              happening: [
                "You've suggested meeting twice.",
                "She declined both times without suggesting another day.",
                "Her replies are friendly but short, and usually come a day later.",
              ],
              explanations: [
                "Her schedule may genuinely be full right now.",
                "She may be less interested than you are. The messages don't establish which — and you don't need to know her motive to decide.",
              ],
              next: { type: "stop_initiating", text: "Stop making further invitations for now. See whether she makes an effort to arrange something herself." },
              why: "You've made your interest clear. A third invitation after two declines without a counter-offer turns interest into pursuit. If she wants to meet, the next move is hers.",
              noMessage:
                "No message needed. If she reaches out, reply warmly and let her suggest the time. This isn't a silent treatment — just stop being the only one making plans.",
              memory: [
                { id: "ms2", scope: "person", kind: "read", text: "Limited availability or limited interest. Motive not established.", status: "saved" },
              ],
            },
          },
        ],
      },
      {
        id: "t_maya_1",
        title: "Opening with Maya",
        personId: "p_maya",
        intent: "respond",
        createdAt: ago(14),
        updatedAt: ago(14),
        messages: [
          {
            id: "u3",
            role: "user",
            at: ago(14),
            text: "We've been going back and forth on Hinge for 3 days about her worst architecture client. Good banter. Time to ask her out?",
          },
          {
            id: "c3",
            role: "coach",
            at: ago(14),
            reply: {
              kind: "analysis",
              happening: [
                "Three days of steady back-and-forth, with her asking questions back.",
                "Banter is running on a shared joke, which is a good bridge to a plan.",
              ],
              explanations: ["She's engaged and enjoying the conversation. Whether she wants to meet is the open question — only an invite answers it."],
              next: { type: "propose_date", text: "Move it to a date now, using the joke as the bridge." },
              why: "Chats that run too long without a plan tend to fade. Three good days is the right moment.",
              say: { text: "i need to hear the full client saga in person. drinks wednesday?" },
            },
            voice: "me",
          },
        ],
      },
    ],
    subscription: { status: "active", price: PRICE_MONTHLY, ...period(14) },
  };
}

function james(): AccountData {
  return {
    version: 1,
    id: "acct_james",
    onboarded: true,
    profile: {
      name: "James",
      email: "james@demo.deyte",
      ageRange: "35–44",
      situation: ["In a relationship"],
      goals: ["Keep things strong with my girlfriend", "Handle disagreements better"],
      style: ["Warm", "Few words"],
      emoji: "sometimes",
    },
    self: [
      { id: "j1", category: "goal", text: "Wants to stay close with Elena while work is intense.", source: "onboarding", createdAt: ago(60) },
      { id: "j2", category: "style", text: "Tends to go quiet during disagreements, then over-explain later.", source: "you", createdAt: ago(20) },
      { id: "j3", category: "voice", text: "Uses one emoji at most. Calls her \"El\".", source: "learned", createdAt: ago(9) },
    ],
    people: [
      {
        id: "p_elena",
        name: "Elena",
        stage: "girlfriend",
        metVia: "Friend's birthday",
        note: "Together 8 months.",
        profile: {
          howLong: "8 months",
          want: ["Keep it strong", "Fewer arguments"],
          concerns: ["Work keeps getting in the way", "Feeling distant"],
          her: ["Values quality time", "Says \"it's fine\" when it isn't"],
        },
        facts: [
          { id: "e1", text: "Together since February.", source: "onboarding", createdAt: ago(60) },
          { id: "e2", text: "Feels deprioritized when plans change last minute.", source: "approved", createdAt: ago(4) },
          { id: "e3", text: "Her sister's wedding is on the 22nd. He's invited.", source: "you", createdAt: ago(10) },
        ],
        reads: [{ id: "er1", text: "The argument may be more about feeling second to work than about Saturday itself.", source: "approved", createdAt: ago(4) }],
        timeline: [
          { id: "et1", at: ago(60), kind: "created", title: "Profile created", detail: "Girlfriend, 6 months at the time" },
          { id: "et2", at: ago(4), kind: "review", title: "Argument about Saturday", detail: "Recommendation: address the misunderstanding", threadId: "t_elena" },
          { id: "et3", at: ago(2), kind: "update", title: "Talked it through", detail: "Apologized in person. Booked Sunday brunch." },
        ],
        createdAt: ago(60),
        updatedAt: ago(2),
      },
    ],
    threads: [
      {
        id: "t_elena",
        title: "Argument about Saturday",
        personId: "p_elena",
        intent: "decide",
        createdAt: ago(4),
        updatedAt: ago(2),
        messages: [
          {
            id: "ju1",
            role: "user",
            at: ago(4),
            text: "Had to cancel our Saturday plan because of a work launch. Elena said \"it's fine\" and has been short with me since. I said sorry already. What now?",
          },
          {
            id: "jc1",
            role: "coach",
            at: ago(4),
            reply: {
              kind: "analysis",
              happening: [
                "You canceled a plan for work and apologized once.",
                "Her replies have been short since, after saying \"it's fine\".",
              ],
              explanations: [
                "She may be hurt about the plan, or about a pattern of work coming first.",
                "She may want you to notice without having to spell it out. Neither is certain until you ask.",
              ],
              next: { type: "repair", text: "Acknowledge the impact, not just the cancellation, and put a real plan back on the calendar." },
              why: "A second \"sorry\" won't land. Naming how it felt for her and replacing the plan shows she's a priority, which is likely the real issue.",
              say: {
                text: "El, I know canceling Saturday wasn't just about one night. I don't want work to keep coming first. Can I take you to brunch Sunday and actually be present?",
              },
              memory: [
                { id: "jm1", scope: "person", kind: "fact", text: "Feels deprioritized when plans change last minute.", status: "saved" },
              ],
            },
          },
          { id: "ju2", role: "user", at: ago(2), text: "Update: talked in person, it went well. Brunch is booked for Sunday." },
          {
            id: "jc2",
            role: "coach",
            at: ago(2),
            reply: {
              kind: "note",
              text: "Good. You handled the part that mattered — you named it before she had to. Keep Sunday sacred, phone away. I've added the update to Elena's timeline.",
            },
          },
        ],
      },
    ],
    subscription: { status: "active", price: PRICE_MONTHLY, ...period(22) },
  };
}

export function seedFor(id: string): AccountData | null {
  if (id === "acct_daniel") return daniel();
  if (id === "acct_james") return james();
  return null;
}

/** A brand-new, empty account. Used by sign-up and after a memory reset. */
export function freshAccount(id: string, profile: Pick<Profile, "name" | "email">, onboarded = false): AccountData {
  return {
    version: 1,
    id,
    onboarded,
    profile: { ...profile, situation: [], goals: [], style: [], emoji: "sometimes" },
    self: [],
    people: [],
    threads: [],
    subscription: { status: "active", price: PRICE_MONTHLY, periodStart: daysFromNow(0), periodEnd: daysFromNow(30) },
  };
}
