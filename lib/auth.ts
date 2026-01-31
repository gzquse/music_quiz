import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";

// Get admin emails from environment variable
const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
const devPassword = process.env.ADMIN_DEV_PASSWORD;

const providers: NextAuthOptions["providers"] = [];

// Credentials login (no OAuth needed) - use when ADMIN_DEV_PASSWORD is set
if (devPassword) {
  providers.push(
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || credentials.password !== devPassword) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!adminEmails.length || adminEmails.includes(email)) return { id: "1", email, name: email };
        return null;
      },
    })
  );
}

// OAuth providers
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers: providers.length ? providers : [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const pw = process.env.ADMIN_DEV_PASSWORD;
        if (!pw || !credentials?.email || credentials.password !== pw) return null;
        const email = credentials.email.trim().toLowerCase();
        if (adminEmails.length && !adminEmails.includes(email)) return null;
        return { id: "1", email, name: email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      // If no admin list set, allow any email (dev mode)
      if (!adminEmails.length) return true;
      return adminEmails.includes(email);
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
};

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

