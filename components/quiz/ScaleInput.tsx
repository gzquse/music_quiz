"use client";

import { cn } from "@/lib/utils";
import { DEFAULT_SCALE_LABELS } from "@/lib/survey";

interface ScaleInputProps {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labels?: string[];
  required?: boolean;
}

export function ScaleInput({
  name,
  value,
  onChange,
  min = 1,
  max = 5,
  labels = [...DEFAULT_SCALE_LABELS],
  required = false,
}: ScaleInputProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-[72px] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3",
              "border transition-all duration-150",
              value === option
                ? "border-[var(--primary)] bg-[var(--accent-light)]"
                : "border-[var(--border)] bg-[var(--surface)] active:bg-[var(--surface-hover)]"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              required={required}
              className="sr-only"
            />
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                value === option
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-hover)] text-[var(--foreground)]"
              )}
            >
              {option}
            </span>
            <span className="text-center text-[10px] leading-tight text-[var(--muted)] sm:text-xs">
              {labels[option - min]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
