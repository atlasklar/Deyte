# Deyte — private AI dating & relationship coach (UI phase)

A mobile-first web app where a man shares what's happening in his dating life — a question, a situation, pasted messages or screenshots — and gets a clear read and one recommended next move. Writing a reply is one part of that, not the point.

**Accounts are real; the coach is still a demo.** Sign-up and sign-in (email, Google, Apple), profiles, photos and every account's memory, people and chats live in the cloud (Supabase). The coach replies, screenshot reading and billing are realistic demos — the real AI, its knowledge base and payments come later; the seams for them are listed below.

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

1. In Vercel: **Add New → Project → Import** this GitHub repo. Framework preset: Next.js, default build settings.
2. Add the environment variables from [Accounts & cloud](#accounts--cloud) below (Settings → Environment Variables), then redeploy.
3. Optional: `NEXT_PUBLIC_PRICE_MONTHLY` (for example `29.99`). It's clamped to 29.99–39.99; without it the price is $34.99.

Every push to `main` redeploys automatically. Until the Supabase keys are added, the sign-in pages show a "Sign-in isn't connected yet" notice instead of a form.

## Accounts & cloud

Accounts run on [Supabase](https://supabase.com) (free tier is fine).

**Automatic:** with `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN` set (plus optional Google/Apple credentials — see the top of the script), `bash scripts/setup-cloud.sh` does steps 1–3 below, saves the keys to Vercel and redeploys. It's safe to re-run, e.g. after adding Google credentials.

**By hand,** about 15 minutes:

### 1. Create the project

1. supabase.com → **New project**. Pick a region near your users and save the database password somewhere safe.
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the private `account_data` table (row-level security: each person can only read and write their own row) and the `avatars` photo bucket.
3. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key.

### 2. Environment variables (Vercel → Settings → Environment Variables, all environments)

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | Public — safe in the browser; row-level security protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Secret.** Server only, used for "Delete account". Never prefix it `NEXT_PUBLIC_` |
| `ANTHROPIC_API_KEY` | Claude API key (console.anthropic.com → API keys) | **Secret.** Server only. Powers the coach chat, screenshot reading and re-toning |

For local development copy `.env.example` to `.env.local` and fill in the same values. Redeploy after adding them.

### 3. Auth URLs

Supabase → **Authentication → URL Configuration**:
- **Site URL**: your production address, e.g. `https://deyte.vercel.app` (or your own domain).
- **Redirect URLs**: add `https://YOUR-DOMAIN/auth/callback` and, for previews/local, `https://*-YOUR-TEAM.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.

Email sign-up works now. **Authentication → Providers → Email**: keep *Confirm email* on (people get a link before their first sign-in) and *Secure email change* on (an email change is confirmed from both inboxes). For real volume, add your own SMTP under **Authentication → Emails → SMTP** — Supabase's built-in sender is rate-limited and meant for testing.

### 4. Sign in with Google

1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen**: External, app name *Deyte*, your support email, add your domain under authorised domains. Publish it.
2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - Authorised JavaScript origins: `https://YOUR-DOMAIN`
   - Authorised redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (shown in Supabase → Providers → Google)
3. Paste the **Client ID** and **Client secret** into Supabase → **Authentication → Providers → Google** → enable.

### 5. Sign in with Apple

Needs a paid Apple Developer account ($99/year).
1. [developer.apple.com](https://developer.apple.com/account/resources) → **Identifiers → +** → *App IDs* → enable **Sign in with Apple**.
2. **Identifiers → +** → *Services IDs* (e.g. `com.deyte.web`) → enable Sign in with Apple → **Configure**: domain `YOUR-PROJECT-REF.supabase.co`, return URL `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
3. **Keys → +** → enable Sign in with Apple → download the `.p8` key; note the Key ID and your Team ID.
4. Supabase → **Authentication → Providers → Apple** → enable, Client ID = the Services ID, and generate the secret from the `.p8` key, Key ID and Team ID (Supabase links its secret generator there). Apple secrets expire after 6 months — set a reminder to renew.

### How it behaves

- Email accounts can change their photo, first and last name, email (confirmed by link) and password in **Account → Profile**.
- Google and Apple accounts can change their photo and name; their email and password are managed by Google or Apple, so those rows are locked.
- Each account's data is one private JSON row. A local copy makes the app open instantly; changes save to the cloud within a second and when the app is backgrounded.
- **Delete account** erases the photo, the data row and the login.

## Try it

Sign up with an email (or Google/Apple), go through onboarding, then add someone in **People** and connect them to a chat.

Things worth trying:
- Add someone in **People** (a short quiz), then type *"she declined again, should I try another day?"* with her connected — the coach recommends stopping (no message suggested).
- Tap **Upload screenshots** with any images → correct the extracted lines and who sent each → add background → **Get the read**.
- Paste a conversation (`Her: … / Me: …`) into the lobby input → **review who said what**.
- Type something short and vague → the coach asks one focused question before recommending anything.
- On a suggested reply: **Shorter / Warmer / More playful / More direct**, copy it, and answer *"Sound like you?"* — "Not quite" saves a writing preference to Memory.
- **Account → Your plan**: pause (memory kept) vs cancel (exact reset date shown, acknowledgment required). Preview controls simulate the access period ending, which resets memory.

## The coach's brain

The coach is Claude (`claude-opus-5-5`), answering only from the expert knowledge in `src/knowledge/`:

- `playbook.md`: about 3,100 principles distilled from @thereallgame's 1,876 reel transcripts (every reel with speech), X posts and reel captions, grouped by topic, plus how he talks. Sent with every request (prompt-cached for an hour, so it costs little after the first message).
- `corpus.json`: what the coach searches, built from `knowledge-src/` (his reel transcripts, X posts and reel captions). For each message the server pulls the 7 most relevant video transcripts and 5 posts (keyword ranking in `src/lib/coach/retrieve.ts`), so replies carry his voice and his exact teaching.

### Adding more knowledge

1. Instagram reels (an Apify reel-scraper CSV): `python3 scripts/knowledge/download_reels.py <reels.csv> <audio-dir>` then `python scripts/knowledge/transcribe_reels.py <audio-dir> <out.jsonl> small.en` (needs `pip install faster-whisper` and ffmpeg; runs locally, free). Append the output to `knowledge-src/reel_transcripts.jsonl`. Reel links expire a few days after scraping.
2. X posts: append `{"id", "text"}` lines to `knowledge-src/x_posts.jsonl`.
3. `python3 scripts/knowledge/build_corpus.py` rebuilds `src/knowledge/corpus.json` (strips promo, drops duplicates, leaves out contempt and manipulation tactics).
4. Distill new material into notes with the same headings (see `knowledge-src/notes/`), then `python3 scripts/knowledge/merge_playbook.py knowledge-src/notes/*.md` rebuilds `playbook.md`. Commit and push.

The rules (answer only from the expert material, never guess, never say there's no answer, find the closest teaching) live in `src/lib/coach/prompt.ts`. Each request also carries the member's onboarding answers, saved memory and the connected person's profile. To grow the brain, add to these two files and redeploy.

API routes (signed-in members only): `/api/coach` (streams the reply), `/api/coach/extract` (reads screenshots), `/api/coach/retone` (rewrites a suggested message).

## Pages

| Route | What it is |
| --- | --- |
| `/` | Homepage: scroll-scrubbed rose hero and champagne scene (Higgsfield video), bar-scene "read" overlay, real app screenshots, stages, features, pricing, FAQ |
| `/signup`, `/login`, `/forgot` | Cloud accounts: email + password, Google, Apple; password reset by email |
| `/onboarding` | Goals, situation, communication style, emoji use, optional message samples |
| `/app` | Lobby: animated orb, "What's going on in your dating life?", four shortcuts, recent chats |
| `/app/chat/[id]` | Coaching chat: questions, screenshots, pasted messages and follow-ups in one thread |
| `/app/chats` | Saved conversations with search and per-person filter |
| `/app/people`, `/app/people/[id]` | Private person profiles: stage, confirmed facts, unconfirmed reads (kept separate), timeline, chats, delete |
| `/app/memory` | Everything the coach remembers about the user: review, edit, delete, delete all |
| `/app/account`, `/app/account/profile`, `/app/account/plan` | Membership and preferences; profile photo, name, email and password; plan states with pause and cancel flows |

## What every analysis contains

`What's happening` (observations grounded in what was shared) · `Possible explanations` (labelled as interpretations, never facts) · `What to do next` (one primary recommendation) · `Why` · `What to say` (optional — or an explicit "no message needed"). Then optional "Remember this?" suggestions the user approves or skips.

## Where the real product plugs in

| Seam | File | Replace with |
| --- | --- | --- |
| Coach brain | `src/lib/coach/engine.ts` (`CoachEngine` interface) — demo in `src/lib/coach/demo.ts` | An API route that combines the shared knowledge base with this account's private memory and returns the same `CoachReply` shape |
| Screenshot reading | `CoachEngine.extract` | Vision/OCR model. The review step already lets the user fix text and senders |
| Persistence | `src/lib/store.tsx` (Supabase `account_data` row per user + local cache) | Already cloud. Split into tables later if needed — the `useAccount()` / `mutate()` surface can stay |
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
