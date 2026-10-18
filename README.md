# Deyte — private AI dating & relationship coach (UI phase)

A mobile-first web app where a man shares what's happening in his dating life — a question, a situation, pasted messages or screenshots — and gets a clear read and one recommended next move. Writing a reply is one part of that, not the point.

**This is the interface phase.** The coach replies, screenshot reading, billing and storage are realistic demos. The real AI, its knowledge base and the backend come later; the seams for them are listed below.

## See it in one click (Codespaces)

Open **https://codespaces.new/dimafd26-oss/deyte?quickstart=1** → *Create codespace*.
It installs, builds and starts the app (about 3 minutes), then opens it in a new tab. If it doesn't, open the **Ports** tab and click the globe next to port 3000.
To view it on your phone, right-click port 3000 → *Port visibility* → *Public*, then open the same URL on the phone.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` / `npm run lint` | Static checks |

## Deploy on Vercel

1. In Vercel: **Add New → Project → Import** this GitHub repo.
2. Framework preset: Next.js. Leave build settings on their defaults.
3. Optional environment variable: `NEXT_PUBLIC_PRICE_MONTHLY` (for example `29.99`). It's clamped to 29.99–39.99; without it the price is $34.99.
4. Deploy. Nothing else is needed — the preview has no database or secrets.

## Try it

Open the site → **Try the demo** (or `/login`) and pick an account:

| Demo account | Situation |
| --- | --- |
| Daniel | Dating: Maya (early dates), Sofia (declined twice), Ava (new match) |
| James | In a relationship with Elena |

Each account has its own separate memory, stored under its own key in the browser. **Reset demos** on the login page restores the sample data. **Create an account** starts a fresh, empty account with onboarding.

Things worth trying:
- In the lobby, type *"Sofia declined again, should I try another day?"* — the conversation links to Sofia automatically and the coach recommends stopping (no message suggested).
- Tap **Upload screenshots** with any images → correct the extracted lines and who sent each → add background → **Get the read**.
- Paste a conversation (`Her: … / Me: …`) into the lobby input → **review who said what**.
- Type something short and vague → the coach asks one focused question before recommending anything.
- On a suggested reply: **Shorter / Warmer / More playful / More direct**, copy it, and answer *"Sound like you?"* — "Not quite" saves a writing preference to Memory.
- **Account → Your plan**: pause (memory kept) vs cancel (exact reset date shown, acknowledgment required). Preview controls simulate the access period ending, which resets memory.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Homepage: scroll-scrubbed rose hero and champagne scene (Higgsfield video), bar-scene "read" overlay, real app screenshots, stages, features, pricing, FAQ |
| `/signup`, `/login` | Demo accounts live in the browser only |
| `/onboarding` | Goals, situation, communication style, emoji use, optional message samples |
| `/app` | Lobby: animated orb, "What's going on in your dating life?", four shortcuts, recent chats |
| `/app/chat/[id]` | Coaching chat: questions, screenshots, pasted messages and follow-ups in one thread |
| `/app/chats` | Saved conversations with search and per-person filter |
| `/app/people`, `/app/people/[id]` | Private person profiles: stage, confirmed facts, unconfirmed reads (kept separate), timeline, chats, delete |
| `/app/memory` | Everything the coach remembers about the user: review, edit, delete, delete all |
| `/app/account`, `/app/account/plan` | Membership, privacy (export, delete), plan states with pause and cancel flows |

## What every analysis contains

`What's happening` (observations grounded in what was shared) · `Possible explanations` (labelled as interpretations, never facts) · `What to do next` (one primary recommendation) · `Why` · `What to say` (optional — or an explicit "no message needed"). Then optional "Remember this?" suggestions the user approves or skips.

## Where the real product plugs in

| Seam | File | Replace with |
| --- | --- | --- |
| Coach brain | `src/lib/coach/engine.ts` (`CoachEngine` interface) — demo in `src/lib/coach/demo.ts` | An API route that combines the shared knowledge base with this account's private memory and returns the same `CoachReply` shape |
| Screenshot reading | `CoachEngine.extract` | Vision/OCR model. The review step already lets the user fix text and senders |
| Persistence | `src/lib/store.tsx` (localStorage, one key per account) | Database + auth. The `useAccount()` / `mutate()` surface can stay |
| Billing | `subscription` transitions in `src/lib/store.tsx` | Stripe (or similar) webhooks driving the same four states |
| Pricing, upload bounds | `src/config/product.ts` | Same file — single source of truth |

Response contract (`src/lib/types.ts` → `CoachReply`): `analysis` · `clarify` (one focused question with quick answers) · `note` · `draft` (a re-voiced reply).

## Subscription & memory rules (as built)

- **Active** — memory retained and updated.
- **Paused** — billing and new AI usage pause; memory is preserved and can still be read or deleted; resume any time.
- **Canceled** — renewal stops; access continues until the paid period ends; on that date personal memory resets. The cancel sheet shows the exact date and what will be deleted, and requires an acknowledgment. "Pause instead" is offered.
- **Ended** — memory has been reset; the user starts fresh.

## Design notes

- Type: Geist and Geist Mono (Vercel's typefaces) — one family, heavier and tighter for headlines. No decorative display fonts.
- Surfaces: neutral blacks in fine steps, 1px hairlines, 14px-radius boxes, solid white primary buttons. One warm accent (ember) for the "next move"; sapphire marks interpretations. Tokens in `src/app/globals.css`.
- Motion: tab switches are instant (no sliding highlight, each tab opens at the top). Coach replies show their thinking steps, then stream in at model speed with a Stop button. Uploads show real progress, then the extracted lines appear one by one.
- The orb (`src/components/orb`) is a single fragment shader used in the app; it pauses off-screen and falls back to CSS without WebGL.
- Homepage media lives in `src/config/media.ts` (generated on Higgsfield). Videos stream from Higgsfield's CDN; run `bash scripts/fetch-media.sh` to bake the scroll scenes into frame sequences under `public/seq/`, which the homepage then uses automatically (smoother on phones). Product shots in `public/shots/` are real screenshots of the app.
