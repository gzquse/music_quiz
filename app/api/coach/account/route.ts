import { accountSummary, errorResponse, getOrCreateAccount, requireUser } from "@/lib/coach/server";

export const runtime = "nodejs";

// Creates the account (with its free analyses) on first visit and reports what's left.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getOrCreateAccount(user);
    return Response.json({ account: accountSummary(account) });
  } catch (err) {
    return errorResponse(err);
  }
}
