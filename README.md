[![Logo](public/genplaylist2.svg)](https://gen-playlist.vercel.app/)

# GenPlaylist

**Paste a link. Get a playlist.**

Found an amazing "Best Albums of 2024" list? A Reddit thread full of hidden gems? A music blog with 50 tracks you want to save? GenPlaylist scrapes any music URL, extracts every track, and builds your Spotify playlist in seconds — no more copy-pasting track names one by one.

## How It Works

1. **Sign in** with your Spotify account
2. **Paste** any URL containing music (blog posts, articles, Reddit threads, tracklists)
3. **Review** the extracted tracks — select or deselect what you want
4. **Create** your playlist on Spotify with one click

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Actions) |
| Auth | Supabase Auth + Spotify OAuth |
| Database | Supabase (PostgreSQL) |
| Scraping | Cheerio (built-in), Firecrawl (optional fallback) |
| AI | OpenAI GPT-4o-mini via Vercel AI SDK |
| UI | Tailwind CSS + shadcn/ui + Radix |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A [Supabase](https://supabase.com) project with Spotify OAuth enabled
- A [Spotify Developer](https://developer.spotify.com) app
- An [OpenAI](https://platform.openai.com) API key

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/your-username/genplaylist.git
cd genplaylist
pnpm install
```

2. Copy the environment file and fill in your keys:

```bash
cp .env.example .env.local
```

3. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

### Supabase Configuration

1. Create a new Supabase project
2. Enable **Spotify** as an OAuth provider under Authentication > Providers
3. Set the redirect URL in your Spotify Developer app to: `<your-supabase-url>/auth/v1/callback`
4. Add your Supabase URL and anon key to `.env.local`

## Features

- [x] Spotify OAuth login
- [x] URL scraping with AI-powered track extraction
- [x] Track selection with confidence scoring
- [x] Spotify playlist creation
- [x] Rate limiting and input validation
- [ ] Apple Music support
- [ ] Deezer support
- [ ] Payment/subscription system

## Environment Variables

See [`.env.example`](.env.example) for the full list of required and optional variables.

## Deployment

Deploy to [Vercel](https://vercel.com) — set your environment variables in the Vercel dashboard and you're good to go.

## License

MIT
