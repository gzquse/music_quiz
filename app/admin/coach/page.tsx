"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type UsageRow = {
  created_at: string;
  user_id: string | null;
  session_id: string | null;
  model: string;
  status: "ok" | "refusal" | "max_tokens" | "error";
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
};

type AccountRow = {
  user_id: string;
  email: string | null;
  trial_used: number;
  bonus_analyses: number;
  subscription_status: string | null;
  created_at: string;
};

type Payload =
  | { setupNeeded: true }
  | { setupNeeded?: false; freeAnalyses: number; usage: UsageRow[]; accounts: AccountRow[]; sessions: { id: string; user_id: string; created_at: string }[] };

const DAY = 24 * 60 * 60 * 1000;
const usd2 = (v: number) => `$${v.toFixed(2)}`;
const usd3 = (v: number) => `$${v.toFixed(3)}`;
const compact = (v: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// Clean axis ticks (0, 0.05, 0.10 …) with at most 4 steps above zero.
function niceTicks(max: number) {
  const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
}

export default function CoachAdminPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/coach-usage")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load spend.");
        setData(json);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = useMemo(() => (data && !data.setupNeeded ? summarize(data) : null), [data]);

  if (error) return <Shell><p className="text-[var(--error)]">{error}</p></Shell>;
  if (!data) {
    return (
      <Shell>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </Shell>
    );
  }
  if (data.setupNeeded || !stats) {
    return (
      <Shell>
        <Card className="max-w-xl">
          <p className="font-semibold">Spend tracking isn&apos;t set up yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            In Supabase, open the SQL Editor, paste{" "}
            <code>supabase/migrations/20260926000000_coach_spend_and_bonus.sql</code>, and run it. Analyses are
            logged from then on.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <section>
        <p className="text-sm text-[var(--muted)]">Claude spend, all time</p>
        <p className="mt-1 font-sans text-[56px] font-semibold leading-none">{usd2(stats.total)}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {stats.since ? `Tracked since ${stats.since}. ` : "Nothing tracked yet. "}Estimated from token counts at
          list prices; your Anthropic invoice is the source of truth.
        </p>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Last 30 days" value={usd2(stats.last30)} />
        <StatTile label="Today" value={usd2(stats.today)} />
        <StatTile
          label="Analyses"
          value={String(stats.analyses)}
          note={stats.failed ? `${stats.failed} failed ${stats.failed === 1 ? "call" : "calls"} also billed` : undefined}
        />
        <StatTile
          label="Average per analysis"
          value={stats.analyses ? usd3(stats.total / stats.analyses) : "–"}
          note={`${compact(stats.inputTokens)} in · ${compact(stats.outputTokens)} out tokens`}
        />
      </div>

      <Card className="mt-6">
        <p className="font-semibold">Daily spend, last 30 days</p>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval={4}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                domain={[0, stats.yTicks.at(-1) ?? 1]}
                ticks={stats.yTicks}
                tickFormatter={(v: number) => usd2(v)}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={<DayTooltip />} />
              <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {stats.untracked > 0 && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {stats.untracked} {stats.untracked === 1 ? "analysis" : "analyses"} ran before tracking started (about{" "}
          {usd2(stats.untracked * stats.estimatePerAnalysis)} at the average cost). The Anthropic Console shows exact
          historical spend.
        </p>
      )}

      <Card className="mt-6 overflow-x-auto">
        <p className="font-semibold">Students</p>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 text-right font-medium">Analyses</th>
              <th className="py-2 pr-4 text-right font-medium">Spend</th>
              <th className="py-2 pr-4 text-right font-medium">Free used</th>
              <th className="py-2 font-medium">Plan</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {stats.students.map((s) => (
              <tr key={s.userId} className="border-t border-[var(--border)]">
                <td className="py-2 pr-4">{s.email || "(deleted)"}</td>
                <td className="py-2 pr-4 text-right">{s.analyses}</td>
                <td className="py-2 pr-4 text-right">{usd3(s.spend)}</td>
                <td className="py-2 pr-4 text-right">
                  {s.trialUsed} of {s.allowance}
                  {s.bonus > 0 && <span className="text-[var(--muted)]"> (+{s.bonus} bonus)</span>}
                </td>
                <td className="py-2">{s.plan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <p className="font-semibold">Recent Claude calls</p>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-[var(--muted)]">
            <tr>
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Model</th>
              <th className="py-2 pr-4 font-medium">Result</th>
              <th className="py-2 pr-4 text-right font-medium">Tokens in / out</th>
              <th className="py-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {stats.recent.map((r, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="py-2 pr-4">{formatDateTime(Date.parse(r.created_at))}</td>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.model}</td>
                <td className="py-2 pr-4">{r.status === "ok" ? "Analysis saved" : STATUS_LABEL[r.status]}</td>
                <td className="py-2 pr-4 text-right">
                  {compact(r.input_tokens + r.cache_write_tokens + r.cache_read_tokens)} / {compact(r.output_tokens)}
                </td>
                <td className="py-2 text-right">{usd3(r.cost_usd)}</td>
              </tr>
            ))}
            {stats.recent.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-[var(--muted)]">
                  No calls logged yet. The next analysis will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

const STATUS_LABEL = { refusal: "Declined (safety)", max_tokens: "Cut short", error: "Failed" } as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Form Coach</h1>
      {children}
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-sans text-[28px] font-semibold leading-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-[var(--muted)]">{note}</p>}
    </Card>
  );
}

function DayTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; cost: number; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-[var(--shadow)]">
      <p className="font-medium">{d.date}</p>
      <p className="tabular-nums">
        {usd3(d.cost)} · {d.count} {d.count === 1 ? "call" : "calls"}
      </p>
    </div>
  );
}

function summarize(data: Extract<Payload, { freeAnalyses: number }>) {
  const now = new Date();
  const usage = data.usage;
  const emailOf = new Map(data.accounts.map((a) => [a.user_id, a.email ?? ""]));
  const total = usage.reduce((sum, u) => sum + u.cost_usd, 0);
  const analyses = usage.filter((u) => u.status === "ok").length;

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * DAY);
    return {
      key: dayKey(d),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      cost: 0,
      count: 0,
    };
  });
  const byDay = new Map(days.map((d) => [d.key, d]));
  for (const u of usage) {
    const day = byDay.get(dayKey(new Date(u.created_at)));
    if (day) {
      day.cost += u.cost_usd;
      day.count += 1;
    }
  }

  const tracked = new Set(usage.map((u) => u.session_id).filter(Boolean));
  const untracked = data.sessions.filter((s) => !tracked.has(s.id)).length;

  const students = data.accounts
    .map((a) => {
      const mine = usage.filter((u) => u.user_id === a.user_id);
      const pro = a.subscription_status === "active" || a.subscription_status === "trialing";
      return {
        userId: a.user_id,
        email: a.email ?? "",
        analyses: data.sessions.filter((s) => s.user_id === a.user_id).length,
        spend: mine.reduce((sum, u) => sum + u.cost_usd, 0),
        trialUsed: a.trial_used,
        bonus: a.bonus_analyses,
        allowance: data.freeAnalyses + a.bonus_analyses,
        plan: pro ? `Pro (${a.subscription_status})` : "Free",
      };
    })
    .sort((x, y) => y.spend - x.spend || y.analyses - x.analyses);

  const oldest = usage.at(-1);
  return {
    total,
    last30: usage.filter((u) => now.getTime() - Date.parse(u.created_at) < 30 * DAY).reduce((s, u) => s + u.cost_usd, 0),
    today: byDay.get(dayKey(now))?.cost ?? 0,
    analyses,
    failed: usage.length - analyses,
    inputTokens: usage.reduce((s, u) => s + u.input_tokens + u.cache_write_tokens + u.cache_read_tokens, 0),
    outputTokens: usage.reduce((s, u) => s + u.output_tokens, 0),
    since: oldest ? new Date(oldest.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null,
    daily: days,
    yTicks: niceTicks(Math.max(...days.map((d) => d.cost))),
    untracked,
    estimatePerAnalysis: analyses ? total / analyses : 0.2,
    students,
    recent: usage.slice(0, 15).map((u) => ({ ...u, email: (u.user_id && emailOf.get(u.user_id)) || "(deleted)" })),
  };
}
