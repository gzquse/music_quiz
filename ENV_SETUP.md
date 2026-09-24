# Environment Variables Setup

Create a `.env.local` file in the project root with the following variables:

```bash
# InstantDB (required)
NEXT_PUBLIC_INSTANTDB_APP_ID=your_app_id_here

# InstantDB Admin Token (required for seeding only)
# Create at: https://instantdb.com/dash > Your App > Admin Tokens > Create Token
INSTANTDB_ADMIN_TOKEN=your_admin_token_here

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# Admin allowlist (comma-separated emails)
ADMIN_EMAILS=your@email.com

# Optional: Email/password login (no OAuth needed). Set to enable "Sign in with email".
ADMIN_DEV_PASSWORD=your_password
```

### Form Coach (`/coach`)

The coach runs on Supabase (the survey stays on InstantDB). It needs:

```bash
# Supabase: Project Settings → API Keys
# (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY also work; next.config.ts maps either.)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...          # server only; bypasses row-level security

# Claude API (server only — never expose to the browser)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe (payments). Leave unset to run with free analyses only.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...          # the Pro monthly price
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TRIAL_DAYS=0                # >0 adds a card-required free trial to Pro

# Plan limits and display (optional; defaults shown)
COACH_FREE_ANALYSES=3
COACH_PRO_MONTHLY_ANALYSES=30
COACH_PRICE_LABEL="$12.99 / month" # must match the Stripe price
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app   # for Stripe redirects; defaults to the request origin
```

Create the tables once: Supabase → SQL Editor → paste [supabase/migrations/20260924000000_form_coach.sql](supabase/migrations/20260924000000_form_coach.sql) → Run.
See [docs/AI_COACH_GUIDE.md](docs/AI_COACH_GUIDE.md) for the full walkthrough.

## How to get these values:

### InstantDB
1. Create an account at https://instantdb.com
2. Create a new app
3. Copy the App ID from your dashboard
4. For seeding data: go to your app > Admin Tokens > Create Token, then add `INSTANTDB_ADMIN_TOKEN` to `.env.local`

### NextAuth Secret
Generate a random secret:
```bash
openssl rand -base64 32
```

### Google OAuth
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set authorization callback URL: `http://localhost:3000/api/auth/callback/github`

## Seeding the Database

To populate the database with surveys and sample data from your Word documents:

1. Set both in `.env.local`:
   - `NEXT_PUBLIC_INSTANTDB_APP_ID` – from your app dashboard
   - `INSTANTDB_ADMIN_TOKEN` – create at Dashboard > Your App > Admin Tokens > Create Token

2. Deploy schema (if using Instant CLI): `npx instant-cli login` then `npx instant-cli push`

3. Run: `npm run seed` or `npx tsx scripts/seed.ts`

This creates 6 students, 4 teachers, assignments, student and teacher surveys (from your Word docs), and sample responses. Data is stored in your InstantDB cloud database.

## Deploy to Vercel

1. Push your code to GitHub, then go to [vercel.com](https://vercel.com) and import the repo.

2. Add these environment variables in Vercel (Project Settings > Environment Variables):

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_INSTANTDB_APP_ID` | Your InstantDB App ID |
   | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app` |
   | `ADMIN_EMAILS` | Your email (comma-separated for multiple) |
   | `GOOGLE_CLIENT_ID` | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
   | `GITHUB_ID` | From GitHub OAuth App |
   | `GITHUB_SECRET` | From GitHub OAuth App |
   | `ADMIN_DEV_PASSWORD` | Optional: password for email login (no OAuth) |

3. In Google Cloud Console, add to Authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`

4. In GitHub OAuth App, set Authorization callback URL:
   - `https://your-app.vercel.app/api/auth/callback/github`

5. Deploy. After the first deploy, copy the actual Vercel URL and update `NEXTAUTH_URL` and the OAuth redirect URIs if needed.

