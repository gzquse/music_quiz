"use client";

import { cn } from "@/lib/utils";
import { SURVEY_INSTRUCTOR, SURVEY_SUPERVISOR } from "@/lib/survey";

const CARD_TONES = [
  "from-[#f4c7b8] to-[#e8926a]",
  "from-[#f3b3b0] to-[#d48a86]",
  "from-[#fde0c8] to-[#f4b183]",
  "from-[#d8c3b0] to-[#b08968]",
  "from-[#e8d5c4] to-[#c4a484]",
  "from-[#f7c9c8] to-[#e8a0a4]",
];

export function personTone(name: string) {
  const index = Math.abs(
    name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  ) % CARD_TONES.length;
  return CARD_TONES[index];
}

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CreditCard() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-[#2b221c]/10 shadow-[var(--shadow)]">
      <div className="bg-white px-4 py-3.5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a5348]">
          Instructor
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-tight text-[#2b221c]">
          {SURVEY_INSTRUCTOR}
        </p>
      </div>
      <div className="bg-white px-4 py-3.5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a5348]">
          Supervisor
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-tight text-[#2b221c]">
          {SURVEY_SUPERVISOR}
        </p>
      </div>
    </div>
  );
}
