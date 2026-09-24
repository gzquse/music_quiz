"use client";

import { formatClock, scoreColor, type CoachFeedback } from "@/lib/coach/rubric";

// The take at a glance: loudness across the minute, with numbered markers where
// each priority is clearest. Tapping a marker scrolls to that note.
export function Timeline({
  loudness,
  durationSec,
  frameTimes,
  priorities,
  metrics,
}: {
  loudness: number[];
  durationSec: number;
  frameTimes: number[];
  priorities: CoachFeedback["priorities"];
  metrics: CoachFeedback["metrics"];
}) {
  const bars = loudness.length ? loudness : Array.from({ length: 60 }, () => 0.15);
  const markers = priorities.map((p, i) => ({
    n: i + 1,
    t: frameTimes[p.frame - 1] ?? 0,
    color: scoreColor(metrics[p.area]?.score ?? null),
  }));
  return (
    <div>
      <div className="relative h-[92px]">
        <div className="absolute inset-x-0 bottom-5 top-7 flex items-end gap-[2px]">
          {bars.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-full bg-[var(--primary-light)]"
              style={{ height: `${Math.max(8, v * 100)}%`, opacity: loudness.length ? 0.55 + v * 0.45 : 0.3 }}
            />
          ))}
        </div>
        {markers.map((m) => (
          <a
            key={m.n}
            href={`#priority-${m.n}`}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${Math.min(96, Math.max(4, (m.t / durationSec) * 100))}%` }}
            aria-label={`Priority ${m.n} at ${formatClock(m.t)}`}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white shadow"
              style={{ background: m.color }}
            >
              {m.n}
            </span>
            <span className="h-[60px] w-[2px] rounded-full" style={{ background: m.color, opacity: 0.6 }} />
          </a>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] tabular-nums text-[var(--muted)]">
          <span>0:00</span>
          <span>{formatClock(durationSec / 2)}</span>
          <span>{formatClock(durationSec)}</span>
        </div>
      </div>
      {!loudness.length && (
        <p className="mt-2 text-[12px] text-[var(--muted)]">No audio in this recording, so rhythm and dynamics weren&apos;t scored.</p>
      )}
    </div>
  );
}
