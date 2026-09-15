"use client";

import { cn } from "@/lib/utils";
import { SURVEY_INSTRUCTOR, SURVEY_SUPERVISOR } from "@/lib/survey";

const CARD_TONES = [
  "from-[#c45c6a] to-[#8e3d4a]",
  "from-[#e07a3c] to-[#b85a22]",
  "from-[#c4785b] to-[#8a4a34]",
  "from-[#b8860b] to-[#8a6410]",
  "from-[#8a5a78] to-[#5c3d52]",
  "from-[#7a5640] to-[#4f3729]",
];

const NAMED_TONES: Record<string, string> = {
  maria: CARD_TONES[0],
  xinlin: CARD_TONES[1],
  jacob: CARD_TONES[2],
  ana: CARD_TONES[3],
  heriberto: CARD_TONES[4],
  david: CARD_TONES[5],
};

export function personTone(name: string, index = 0) {
  return NAMED_TONES[name.toLowerCase()] ?? CARD_TONES[index % CARD_TONES.length];
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
