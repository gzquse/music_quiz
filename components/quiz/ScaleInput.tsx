"use client";

import { cn } from "@/lib/utils";

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
  labels = ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
  required = false,
}: ScaleInputProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center gap-2 sm:gap-4">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer",
              "border-2 transition-all duration-150",
              value === option
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--primary-light)]"
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
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                "transition-colors duration-150",
                value === option
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-hover)] text-[var(--foreground)]"
              )}
            >
              {option}
            </span>
            <span className="text-xs text-center text-[var(--muted)] hidden sm:block">
              {labels[option - min]}
            </span>
          </label>
        ))}
      </div>
      {/* Mobile labels */}
      <div className="flex justify-between mt-2 sm:hidden">
        <span className="text-xs text-[var(--muted)]">{labels[0]}</span>
        <span className="text-xs text-[var(--muted)]">{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

