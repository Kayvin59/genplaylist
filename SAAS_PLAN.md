# GenPlaylist — SaaS Readiness Plan

Practical, ordered guide to turn GenPlaylist into a production SaaS. Each phase builds on the previous one.

---

## Phase 1: Security Hardening (do this first, everything else depends on it)

### 1.1 Security Headers in `next.config.js`
Add strict HTTP headers — this is the single highest-impact security change:
```js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.scdn.co https://*.spotify.com https://*.supabase.co; frame-src https://open.spotify.com; connect-src 'self' https://*.supabase.co https://api.spotify.com https://api.openai.com;"
  }
]
```
- Adjust the CSP `connect-src` and `frame-src` as you add more integrations (Stripe, etc.)
- Test with browser DevTools console — CSP violations show up there

### 1.2 Fix Rate Limiting (critical — current implementation won't work on Vercel)
Your in-memory `rateLimitMap` in `lib/security.ts` resets on every cold start on serverless. Replace with:
- **Option A (recommended):** Upstash Redis — free tier is enough, works with `@upstash/ratelimit`
- **Option B:** Supabase table with timestamp-based rate limiting (you already have Supabase)

Rate limit these specifically:
| Endpoint | Limit | Why |
|----------|-------|-----|
| `/api/subscribe` | 5/min per IP | Spam prevention |
| `scrapeAction` | 5/min per user | OpenAI cost protection (most important) |
| `createPlaylistAction` | 10/min per user | Spotify API abuse prevention |
| Auth endpoints | 10/min per IP | Brute force prevention |

### 1.3 Server Action Security
- Every server action (`scrape.ts`, `spotify.ts`) must verify the user session at the top — you already do this in `scrape.ts`, make sure ALL actions follow the same pattern
- Validate all inputs with Zod schemas before processing (you already do some of this — audit for gaps)
- The Spotify provider token should never be exposed to the client — keep it server-side only

### 1.4 SSRF Hardening
Your `validateUrl` in `security.ts` has a gap: `172.` blocks `172.217.x.x` (Google). Fix to only block `172.16.0.0/12`:
```ts
// Instead of hostname.includes("172.")
const isPrivate172 = /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
```

### 1.5 Clean Up Unused Dependencies
`@clerk/nextjs` is in `package.json` but you use Supabase Auth. Remove it — unused auth libraries are a security surface.

### 1.6 File & Component Naming Consistency
Current state is mixed — some files use `kebab-case`, others use `PascalCase`:
```
components/
├── LoginButton.tsx      ← PascalCase
├── Header.tsx           ← PascalCase
├── Footer.tsx           ← PascalCase
├── Welcome.tsx          ← PascalCase
├── music-url-input.tsx  ← kebab-case
├── data-table.tsx       ← kebab-case
├── email/waitlist.tsx   ← kebab-case
├── waitlist/
│   ├── WaitlistDialog.tsx  ← PascalCase
│   └── WaitlistForm.tsx    ← PascalCase
```

**Convention: `kebab-case` for all files.** Rename:
| Current | Rename to |
|---------|-----------|
| `LoginButton.tsx` | `login-button.tsx` |
| `Header.tsx` | `header.tsx` |
| `Footer.tsx` | `footer.tsx` |
| `Welcome.tsx` | `welcome.tsx` |
| `waitlist/WaitlistDialog.tsx` | `waitlist/waitlist-dialog.tsx` |
| `waitlist/WaitlistForm.tsx` | `waitlist/waitlist-form.tsx` |

Update all imports accordingly. The `ui/` folder is already kebab-case (shadcn convention) — no changes needed there.

### 1.7 Environment Variable Audit
- `NEXT_PUBLIC_` vars are exposed to the browser. Verify that only `SUPABASE_URL` and `SUPABASE_ANON_KEY` need this prefix
- The `env` block in `next.config.js` re-exposes these — it's redundant since `NEXT_PUBLIC_` already makes them available. Remove the `env` block

---

## Phase 2: Usage Tracking & Database Schema (needed before payments)

### 2.1 Create a `users` Table in Supabase
You currently rely only on Supabase Auth metadata. Create a proper users table:
```sql
create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text,
  display_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'enterprise')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  monthly_scrapes_used integer default 0,
  monthly_scrapes_reset_at timestamptz default now() + interval '30 days',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.2 Row Level Security (RLS)
```sql
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
```

### 2.3 Track Usage Per Action
In `scrapeAction`, after a successful scrape, increment `monthly_scrapes_used`. Check the count before processing:
```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('monthly_scrapes_used, plan')
  .eq('id', user.id)
  .single()

const limit = profile.plan === 'free' ? 10 : 100
if (profile.monthly_scrapes_used >= limit) {
  return { error: 'Monthly limit reached. Upgrade to continue.' }
}
```

### 2.4 Playlists History Table (optional but valuable)
```sql
create table public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  spotify_playlist_id text,
  source_url text,
  track_count integer,
  created_at timestamptz default now()
);
```
This gives users value (history) and you data (analytics).

---

## Phase 3: Stripe Integration

### 3.1 Setup
- Create a Stripe account, get API keys
- Install: `pnpm add stripe @stripe/stripe-js`
- Add to `.env.local`:
  ```
  STRIPE_SECRET_KEY=sk_...
  STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRO_PRICE_ID=price_...
  ```

### 3.2 Pricing Model (keep it simple)
| Plan | Price | Includes |
|------|-------|----------|
| Free | $0 | 10 scrapes/month, basic extraction |
| Pro | $9/month | 100 scrapes/month, priority extraction, playlist history |

You can always add tiers later. Ship with two.

### 3.3 API Routes to Create
```
app/api/stripe/
├── checkout/route.ts      # Create Checkout Session
├── portal/route.ts        # Create Customer Portal session (manage sub)
└── webhook/route.ts       # Handle Stripe events
```

**Checkout route:** Creates a Stripe Checkout session, redirects user to Stripe's hosted page. Store the `stripe_customer_id` on the profile.

**Webhook route (critical):**
Handle these events:
- `checkout.session.completed` → set plan to `pro`, save subscription ID
- `customer.subscription.updated` → update plan if downgraded
- `customer.subscription.deleted` → set plan back to `free`
- `invoice.payment_failed` → notify user (email via Resend)

**Webhook security:**
```ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  // ALWAYS verify the signature — never skip this
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  // handle event...
}
```

### 3.4 Customer Portal
Use Stripe's hosted Customer Portal for subscription management (cancel, update payment, view invoices). This saves you from building billing UI:
```ts
const session = await stripe.billingPortal.sessions.create({
  customer: profile.stripe_customer_id,
  return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
})
```

---

## Phase 4: Pages & UI

### 4.1 Account Page (`/account`)
What to show:
- **Profile section:** Spotify display name, avatar, email
- **Plan section:** Current plan badge (Free/Pro), usage bar (e.g., "7/10 scrapes used this month"), reset date
- **Billing section:** "Manage Subscription" button (links to Stripe Customer Portal), "Upgrade to Pro" button for free users
- **Playlist history:** Table of past playlists (date, source URL, track count, link to Spotify)
- **Danger zone:** "Delete my account" with confirmation

### 4.2 Pricing Page (`/pricing`)
Simple two-column layout (Free vs Pro). Keep it factual:
- Feature comparison table
- CTA button: "Get Started" (free) / "Upgrade" (pro)
- FAQ section (3-5 common questions: "Can I cancel anytime?", "What happens to my playlists?", etc.)

### 4.3 Landing Page Improvements (`/`)
Your current home page is clean but thin. Add below the hero:
- **How it works:** 3-step visual (paste → review → create) — you describe this in the README, put it on the page
- **Social proof section:** Number of playlists created, tracks matched (pull from your `playlists` table)
- **Example:** Show a before/after — a URL input and the resulting playlist embed

### 4.4 Legal Pages (required for SaaS)
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy (especially important since you handle Spotify OAuth tokens)
- Link both from the footer
- You can use a generator for the initial draft, then customize

### 4.5 Language Toggle (EN/FR)
Add i18n support with `next-intl` or a lightweight custom approach:
- **Option A (recommended): `next-intl`** — mature, works well with App Router, supports server components
  - `pnpm add next-intl`
  - Create `messages/en.json` and `messages/fr.json` with all UI strings
  - Wrap layout with `NextIntlClientProvider`
  - Use `useTranslations()` hook in components
  - Store user preference in a cookie or `profiles.locale` column
- **Option B: Custom context** — lighter, no dependency, but more manual work
  - Create a `LocaleContext` with a JSON dictionary per language
  - Toggle via a dropdown in the header, persist in localStorage + cookie

**What to translate:**
- All UI text (buttons, labels, headings, error messages, placeholders)
- Landing page copy, pricing page, legal pages
- AI extraction results stay in their original language (don't translate track/album names)

**Implementation steps:**
1. Extract all hardcoded strings from components into message files
2. Add a language toggle component in the header (flag icon or "EN/FR" switcher)
3. Add `locale` field to the `profiles` table to persist preference for logged-in users
4. Fallback: detect browser language via `Accept-Language` header for first visit

### 4.6 Navigation Updates
- Logged out: Home, Pricing, Login, EN/FR toggle
- Logged in: Generate, Account, Logout, EN/FR toggle

---

## Phase 5: Production Polish

### 5.1 Error & Loading States
- Add proper loading skeletons on `/generate` and `/account`
- Global error boundary (`error.tsx` at app root)
- `not-found.tsx` for 404s

### 5.2 Email Transactional Flows (you already have Resend)
- Welcome email on first sign-up
- Payment confirmation
- Payment failed notification
- Monthly usage summary (optional, nice touch)

### 5.3 Web Vitals & Performance (current score: 88)
Current Vercel Speed Insights numbers:
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| FCP | 2.94s | < 1.8s | Needs work |
| LCP | 2.94s | < 2.5s | Needs work |
| TTFB | 1.48s | < 0.8s | Needs work |

FCP = LCP means the largest paint IS the first paint (text-only page, no images above fold). The bottleneck is TTFB (1.48s) — the server is slow to respond, and everything else waits on it.

**Fix TTFB first (biggest impact):**
- Your middleware runs on every request (`updateSession` calls Supabase to refresh the session). This adds a Supabase round-trip before any page renders
- For public pages (`/`, `/pricing`, `/terms`, `/privacy`), skip the session check in middleware — only run it on protected routes (`/generate`, `/account`)
- Update middleware matcher to be more selective:
  ```ts
  export const config = {
    matcher: ["/generate/:path*", "/account/:path*", "/auth/:path*"],
  }
  ```
- This alone should cut TTFB in half for public pages

**Fix FCP/LCP:**
- Add `loading.tsx` to `/app` — gives an instant shell while server components resolve
- Move `<Analytics />` out of the main content flow (it's fine where it is but verify it's not blocking render)
- Consider `next/dynamic` with `ssr: false` for heavy client components (data-table) that aren't needed at first paint
- The Roboto font with `display: "swap"` is correct — no issue there
- Check if Supabase JS client is being bundled into the client — it's large. Use `@supabase/ssr` only in server components

**Add monitoring:**
- Install Vercel Speed Insights: `pnpm add @vercel/speed-insights` and add `<SpeedInsights />` to layout (you have Analytics but not Speed Insights — they're separate packages)
- Consider Sentry for error tracking (free tier is sufficient)

### 5.4 Improve OpenAI Extraction Prompt
The current prompt in `scrape.ts` is functional but can miss edge cases. Improvements:
- **Add explicit format examples** — the prompt lists formats like `"Artist - Song"` but doesn't show the AI what the output should look like with real examples (few-shot)
- **Handle numbered lists** — many music blogs use `"1. Artist - Song"` or `"#5: Song by Artist"`. Add these patterns explicitly
- **Handle featuring/ft.** — `"Artist ft. Other - Song"` should keep the full artist string
- **Duplicate detection** — tell the AI not to repeat the same track/album if it appears multiple times on the page (e.g., in both a heading and a list)
- **Language-aware extraction** — when adding FR support, the prompt should handle French music formats (e.g., `"Artiste : Chanson"`, accented characters)
- **Content truncation** — currently slicing at 15000 chars. For very long pages, consider extracting the most relevant section first (the list/tracklist part) rather than just the first 15K chars

Example improved prompt structure:
```
You are a music extraction assistant. Extract all music references from the following webpage content.

Rules:
- TRACKS: standalone songs not associated with any album → top-level tracks array
- ALBUMS: full album mentions → albums array, with their tracks nested inside if listed
- Keep artist names exactly as written (including "ft.", "&", "feat.")
- Do not duplicate: if a track appears in both an album and standalone, put it in the album only
- Ignore navigation, ads, "related articles", and non-music content

Common formats to recognize:
- "Artist - Song Title"
- "Song Title by Artist"
- "1. Artist - Song Title (Album Name, 2024)"
- "Artist: Album Name ★★★★"
- "Artist – Song" (note: en-dash, not hyphen)
```

### 5.6 SEO Basics
- Add proper `metadata` exports to each page (title, description, og:image)
- Add a `sitemap.ts` to `app/`
- Add `robots.ts` to `app/`

### 5.7 Monthly Usage Reset
Create a Supabase cron job (pg_cron) or Vercel Cron:
```sql
-- Reset monthly usage on the 1st of each month
select cron.schedule('reset-monthly-usage', '0 0 1 * *', $$
  update public.profiles
  set monthly_scrapes_used = 0,
      monthly_scrapes_reset_at = now() + interval '30 days'
$$);
```

---

## Implementation Order (checklist)

```
Phase 1 — Security & Codebase Hygiene (before anything public-facing)
  [X] Add security headers to next.config.js
  [X] Replace in-memory rate limiter with Upstash Redis
  [X] Fix SSRF validation for 172.x range
  [X] Remove @clerk/nextjs
  [X] Remove redundant env block in next.config.js
  [X] Audit all server actions for auth checks
  [X] Rename all components to kebab-case (LoginButton → login-button, etc.)

Phase 2 — Database & Usage Tracking
  [X] Create profiles table + trigger
  [X] Enable RLS policies
  [X] Add usage tracking to scrape action
  [X] Create playlists history table
  [X] Backfill existing users

Phase 3 — Stripe
  [ ] Install stripe packages
  [ ] Create checkout, portal, and webhook routes
  [ ] Wire webhook to update profiles.plan
  [ ] Test with Stripe CLI (stripe listen --forward-to localhost:3000/api/stripe/webhook)

Phase 4 — Pages & i18n
  [ ] Build /account page
  [ ] Build /pricing page
  [ ] Enhance landing page (how it works, social proof)
  [ ] Add /terms and /privacy
  [ ] Set up i18n (next-intl) with EN/FR message files
  [ ] Add language toggle to header
  [ ] Update navigation

Phase 5 — Polish & Performance
  [ ] Fix TTFB: skip middleware session check on public pages
  [ ] Add loading.tsx skeleton to app root
  [X] Install @vercel/speed-insights
  [ ] Add loading/error states
  [ ] Set up transactional emails
  [ ] Improve OpenAI extraction prompt (few-shot, dedup, edge cases)
  [X] Add metadata/SEO to all pages
  [ ] Set up usage reset cron
  [ ] Add Sentry or equivalent

Phase 6 — Smart Scraping (future, after enough user data)
  [ ] Create sites table for domain knowledge
  [ ] Auto-track success rate per domain
  [ ] Add blocklist/allowlist + suggested sites in UI
  [ ] Add "Did we get it right?" feedback after extraction
  [ ] (Experimental) Multi-step AI agent for difficult pages
```

---

## Notes

- **Don't build an admin dashboard yet.** Use Supabase dashboard + Stripe dashboard directly until you have enough users to justify it.
- **Don't build custom billing UI.** Stripe Customer Portal handles cancellation, payment method updates, and invoice history for free.
- **Ship Phase 1-3 before adding more features** (Apple Music, Deezer). A secure, paid product with one integration beats a free product with three.
- **Apple Music / Deezer integration** — plan for Phase 6. The architecture already supports it: abstract the playlist creation behind a provider interface (`SpotifyProvider`, `AppleMusicProvider`, `DeezerProvider`) so users can choose where to create their playlist. Each provider needs its own OAuth flow and API client. Apple Music uses MusicKit JS + developer tokens; Deezer uses standard OAuth 2.0. Add a `provider` field to the `profiles` and `playlists` tables.

---

## Phase 6 (future): Smart Scraping — Site Memory & Agent-Assisted Extraction

This is a later-stage improvement once you have enough user data to justify it.

### 6.1 Site Knowledge Base
Build a `sites` table that remembers scraping patterns for known domains:
```sql
create table public.sites (
  id uuid default gen_random_uuid() primary key,
  domain text unique not null,            -- e.g. "pitchfork.com"
  scrape_strategy text default 'cheerio', -- 'cheerio' | 'firecrawl' | 'blocked'
  content_selector text,                  -- CSS selector for main content (e.g. ".article-body")
  success_rate numeric default 0,         -- 0-1, updated after each scrape
  avg_tracks_extracted integer default 0,
  total_scrapes integer default 0,
  notes text,                             -- e.g. "requires Firecrawl, Cheerio gets 403"
  blocked boolean default false,          -- mark sites that always fail
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**How it works:**
- After each scrape, upsert the domain: update `success_rate`, `total_scrapes`, `avg_tracks_extracted`
- If a site fails with Cheerio 3+ times, auto-flag it as `scrape_strategy: 'firecrawl'`
- If both fail repeatedly, mark `blocked: true` and show the user a message: "This site blocks automated access"
- Over time, this builds a knowledge base of which sites work well and which don't

### 6.2 Site Blocklist & Allowlist
- **Blocklist:** Sites that never contain music or always block scraping (e.g., paywalled sites, login-required pages). Save users from wasting a scrape credit
- **Allowlist/Featured:** Sites known to work well — show these as suggestions in the UI ("Try these: Pitchfork, RateYourMusic, Reddit r/listentothis...")
- Both can start as a simple JSON config file and move to the DB later

### 6.3 AI Agent for Difficult Pages (experimental)
For pages where basic scraping + single-pass AI extraction fails:
- **Multi-step agent:** First pass extracts what it can, second pass focuses on sections the first pass was uncertain about
- **Context-aware retry:** If confidence < 0.7, try with a different content slice or a bigger model (GPT-4o instead of mini)
- **Format detection:** Before extraction, classify the page type (numbered list, review, forum thread) and use a type-specific prompt

**When to build this:** Only after you have analytics showing which scrapes fail and why. Don't optimize blind — the current single-pass approach may be good enough for 90%+ of URLs.

### 6.4 User Feedback Loop
Add a simple "Did we get it right?" thumbs up/down after extraction:
- Store in a `scrape_feedback` table (user_id, url, domain, rating, track_count)
- This data feeds back into the site knowledge base — low-rated domains get flagged for review
- Over time, this becomes your most valuable dataset for improving extraction quality
