# Environment Variables Setup

Create a `.env.local` file in the project root with the following variables:

```bash
# InstantDB
NEXT_PUBLIC_INSTANTDB_APP_ID=your_app_id_here

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
```

## How to get these values:

### InstantDB
1. Create an account at https://instantdb.com
2. Create a new app
3. Copy the App ID from your dashboard

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

