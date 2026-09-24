import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser only receives NEXT_PUBLIC_* values. Vercel may store the Supabase
  // URL and publishable key without that prefix, so pass them through under either
  // name. Both are designed to be public. Never add SUPABASE_SECRET_KEY here.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
  },
};

export default nextConfig;
