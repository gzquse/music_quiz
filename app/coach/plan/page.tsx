"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CoachApiError, coachPost, useCoach } from "@/lib/coach/client";
import { formatDate } from "@/lib/utils";
import { Card, CoachPage, PrimaryButton, SecondaryButton, Spinner, TopBar } from "@/components/coach/ui";

export default function PlanPage() {
  return (
    <Suspense>
      <Plan />
    </Suspense>
  );
}

function Plan() {
  const { user, account, refreshAccount } = useCoach();
  const checkout = useSearchParams().get("checkout");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe's webhook can land a few seconds after the redirect; poll briefly.
  useEffect(() => {
    if (checkout !== "success") return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      void refreshAccount();
      if (tries >= 5) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [checkout, refreshAccount]);

  const go = async (path: "/api/billing/checkout" | "/api/billing/portal") => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await coachPost<{ url: string }>(path, user);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof CoachApiError ? err.message : "Couldn't open billing. Please try again.");
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <CoachPage className="items-center justify-center">
        <Spinner />
      </CoachPage>
    );
  }

  const pro = account.plan === "pro";
  const trial = account.subscriptionStatus === "trialing";

  return (
    <CoachPage>
      <TopBar back="/coach" title="Plans" />

      {checkout === "success" && (
        <p className="mt-2 rounded-[20px] bg-[var(--accent-light)] px-4 py-3 text-[14px]">
          {pro ? "You're on Pro. Enjoy your practice." : "Payment received. Activating Pro…"}
        </p>
      )}
      {checkout === "cancel" && (
        <p className="mt-2 rounded-[20px] bg-[var(--separator)] px-4 py-3 text-[14px] text-[var(--muted)]">
          Checkout canceled. Nothing was charged.
        </p>
      )}

      <Card className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Free</p>
        <p className="font-display mt-1 text-[26px] font-semibold">{account.freeAnalyses} analyses</p>
        <p className="mt-1 text-[14px] text-[var(--muted)]">To try the coach. No card needed.</p>
        {!pro && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--separator)]">
              <div
                className="h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${((account.freeAnalyses - account.remaining) / account.freeAnalyses) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[13px] text-[var(--muted)]">{account.remaining} left</p>
          </div>
        )}
      </Card>

      <Card className="relative mt-4 border-2 border-[var(--primary-light)]">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--primary-dark)]">Pro</p>
          {pro && (
            <span className="rounded-full bg-[var(--success)] px-2.5 py-0.5 text-[12px] font-semibold text-white">
              {trial ? "Trial" : "Active"}
            </span>
          )}
        </div>
        <p className="font-display mt-1 text-[26px] font-semibold">{account.priceLabel}</p>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[
            `${account.proMonthlyAnalyses} analyses every month`,
            "Personal instructor that learns from your professor",
            "Progress tracking across takes",
          ].map((line) => (
            <li key={line} className="flex gap-2.5">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {line}
            </li>
          ))}
        </ul>
        {pro ? (
          <p className="mt-4 text-[14px] text-[var(--muted)]">
            {account.remaining} left this period
            {account.periodEnd ? ` · ${trial ? "trial ends" : "renews"} ${formatDate(account.periodEnd)}` : ""}
          </p>
        ) : account.trialDays > 0 ? (
          <p className="mt-4 text-[14px] text-[var(--muted)]">
            {account.trialDays}-day free trial, then {account.priceLabel}. Cancel anytime.
          </p>
        ) : (
          <p className="mt-4 text-[14px] text-[var(--muted)]">Cancel anytime.</p>
        )}
      </Card>

      {error && <p className="mt-4 text-center text-[14px] text-[var(--error)]">{error}</p>}

      <div className="mt-auto space-y-3 pt-6">
        {!pro && account.paymentsEnabled && (
          <PrimaryButton onClick={() => go("/api/billing/checkout")} disabled={busy}>
            {busy ? "Opening checkout…" : account.trialDays > 0 ? `Start ${account.trialDays}-day free trial` : "Upgrade to Pro"}
          </PrimaryButton>
        )}
        {!pro && !account.paymentsEnabled && (
          <p className="text-center text-[14px] text-[var(--muted)]">Upgrades open soon.</p>
        )}
        {account.canManageBilling && (
          <SecondaryButton onClick={() => go("/api/billing/portal")} disabled={busy}>
            Manage billing
          </SecondaryButton>
        )}
        <p className="text-center text-[12px] text-[var(--muted)]">Payments are handled securely by Stripe.</p>
      </div>
    </CoachPage>
  );
}
