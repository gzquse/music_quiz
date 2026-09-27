import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "@/lib/auth";
import { FREE_ANALYSES, adminDb, errorResponse, HttpError } from "@/lib/coach/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Form Coach spend and accounts for the admin dashboard. Admins only (ADMIN_EMAILS).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session?.user?.email)) throw new HttpError(403, "Admins only.");

    const db = adminDb();
    const [usage, accounts, sessions, users] = await Promise.all([
      db
        .from("coach_usage")
        .select("created_at, user_id, session_id, model, status, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd")
        .order("created_at", { ascending: false })
        .limit(10000),
      db.from("coach_accounts").select("*"),
      db.from("coach_sessions").select("id, user_id, created_at"),
      listEmails(),
    ]);

    // The spend table arrives with the 20260926 migration.
    if (usage.error?.code === "PGRST205") return Response.json({ setupNeeded: true });
    if (usage.error) throw usage.error;
    if (accounts.error) throw accounts.error;
    if (sessions.error) throw sessions.error;

    return Response.json({
      freeAnalyses: FREE_ANALYSES,
      usage: usage.data.map((u) => ({ ...u, cost_usd: Number(u.cost_usd) })),
      accounts: accounts.data.map((a) => ({
        user_id: a.user_id,
        email: users.get(a.user_id) ?? a.email,
        trial_used: a.trial_used ?? 0,
        bonus_analyses: a.bonus_analyses ?? 0,
        subscription_status: a.subscription_status,
        created_at: a.created_at,
      })),
      sessions: sessions.data,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

async function listEmails() {
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await adminDb().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => emails.set(u.id, u.email ?? ""));
    if (data.users.length < 1000) break;
  }
  return emails;
}
