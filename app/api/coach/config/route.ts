import { runtimeEnv } from "@/lib/coach/env";

export const dynamic = "force-dynamic";

// The browser's Supabase settings, read when requested rather than baked in at build.
// Both values are public by design (the publishable key is limited by row-level security).
// Never return SUPABASE_SECRET_KEY here.
export function GET() {
  return Response.json({
    url: runtimeEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    key: runtimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"),
  });
}
