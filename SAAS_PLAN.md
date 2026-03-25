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

### 1.6 Environment Variable Audit
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

### 4.5 Navigation Updates
- Logged out: Home, Pricing, Login
- Logged in: Generate, Account, Logout

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

### 5.3 Analytics & Monitoring
- You already have `@vercel/analytics` — make sure it's initialized
- Add Vercel Speed Insights for Web Vitals
- Consider Sentry for error tracking (free tier is sufficient)

### 5.4 SEO Basics
- Add proper `metadata` exports to each page (title, description, og:image)
- Add a `sitemap.ts` to `app/`
- Add `robots.ts` to `app/`

### 5.5 Monthly Usage Reset
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
Phase 1 — Security (before anything public-facing)
  [ ] Add security headers to next.config.js
  [ ] Replace in-memory rate limiter with Upstash Redis
  [ ] Fix SSRF validation for 172.x range
  [ ] Remove @clerk/nextjs
  [ ] Remove redundant env block in next.config.js
  [ ] Audit all server actions for auth checks

Phase 2 — Database & Usage Tracking
  [ ] Create profiles table + trigger
  [ ] Enable RLS policies
  [ ] Add usage tracking to scrape action
  [ ] Create playlists history table
  [ ] Backfill existing users

Phase 3 — Stripe
  [ ] Install stripe packages
  [ ] Create checkout, portal, and webhook routes
  [ ] Wire webhook to update profiles.plan
  [ ] Test with Stripe CLI (stripe listen --forward-to localhost:3000/api/stripe/webhook)

Phase 4 — Pages
  [ ] Build /account page
  [ ] Build /pricing page
  [ ] Enhance landing page (how it works, social proof)
  [ ] Add /terms and /privacy
  [ ] Update navigation

Phase 5 — Polish
  [ ] Add loading/error states
  [ ] Set up transactional emails
  [ ] Add metadata/SEO to all pages
  [ ] Set up usage reset cron
  [ ] Add Sentry or equivalent
```

---

## Notes

- **Don't build an admin dashboard yet.** Use Supabase dashboard + Stripe dashboard directly until you have enough users to justify it.
- **Don't build custom billing UI.** Stripe Customer Portal handles cancellation, payment method updates, and invoice history for free.
- **Ship Phase 1-3 before adding more features** (Apple Music, Deezer). A secure, paid product with one integration beats a free product with three.
