# Music Survey - Post-Session Playing Experience

A modern survey web application for collecting responses about piano playing experiences. Built with Next.js 14, InstantDB, and deployed on Vercel.

## Features

- **Public Survey Interface**: Clean, mobile-friendly interface for taking surveys
- **Admin Dashboard**: Manage surveys, view analytics, and track responses
- **Quiz Builder**: Create and customize surveys with multiple question types
- **Real-time Data**: Powered by InstantDB for instant data synchronization
- **OAuth Authentication**: Secure admin access with Google or GitHub login
- **Data Visualization**: Charts and analytics for survey responses

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: InstantDB (real-time, serverless)
- **Authentication**: NextAuth.js with Google/GitHub OAuth
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- InstantDB account
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd music_quiz
npm install
```

### 2. Set Up InstantDB

1. Create an account at [instantdb.com](https://instantdb.com)
2. Create a new app
3. Copy your App ID from the dashboard

### 3. Set Up OAuth Providers (for Admin Access)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# InstantDB
NEXT_PUBLIC_INSTANTDB_APP_ID=your_instantdb_app_id

# NextAuth
NEXTAUTH_SECRET=your_random_secret_string
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# Admin emails (comma-separated, only these can access /admin)
ADMIN_EMAILS=your@email.com,another@email.com
```

Generate a NextAuth secret:
```bash
openssl rand -base64 32
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_INSTANTDB_APP_ID`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your production URL, e.g., `https://your-app.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_ID`
   - `GITHUB_SECRET`
   - `ADMIN_EMAILS`

5. Click "Deploy"

### 3. Update OAuth Redirect URIs

After deployment, update your OAuth providers with the production callback URLs:

- Google: `https://your-app.vercel.app/api/auth/callback/google`
- GitHub: `https://your-app.vercel.app/api/auth/callback/github`

## Project Structure

```
music_quiz/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Public quiz list
│   ├── quiz/[id]/page.tsx      # Public quiz taking
│   ├── admin/
│   │   ├── layout.tsx          # Admin layout with auth
│   │   ├── page.tsx            # Dashboard home
│   │   ├── login/page.tsx      # OAuth login
│   │   └── quizzes/
│   │       ├── page.tsx        # Quiz management
│   │       ├── new/page.tsx    # Create quiz
│   │       └── [id]/
│   │           ├── page.tsx    # Edit quiz
│   │           └── analytics/page.tsx
│   └── api/auth/[...nextauth]/ # NextAuth API routes
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── quiz/                   # Quiz-related components
│   └── admin/                  # Admin-related components
└── lib/
    ├── instant.ts              # InstantDB setup
    ├── auth.ts                 # NextAuth config
    └── utils.ts                # Utility functions
```

## Usage

### Creating a Survey

1. Log in to the admin dashboard at `/admin`
2. Click "New Survey" 
3. Fill in the survey details (title, description, instructions)
4. Configure the rating scale (1-5 by default)
5. Add questions using the quiz builder
6. Toggle "Active" to make the survey visible
7. Share the survey link with respondents

### Question Types

- **Scale**: 1-5 rating scale with customizable labels
- **Text**: Free-form text input
- **Choice**: Multiple choice with custom options

### Viewing Analytics

1. Go to any survey's analytics page
2. View average scores per question
3. See score distributions
4. Browse individual responses

## License

MIT
