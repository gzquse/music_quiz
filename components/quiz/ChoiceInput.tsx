"use client";

import { cn } from "@/lib/utils";

interface ChoiceInputProps {
  name: string;
  value: string | null;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  multiple?: boolean;
}

export function ChoiceInput({
  name,
  value,
  onChange,
  options,
  required = false,
}: ChoiceInputProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option}
          className={cn(
            "px-4 py-2 rounded-lg cursor-pointer",
            "border-2 transition-all duration-150",
            value === option
              ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
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
          <span className="text-sm font-medium">{option}</span>
        </label>
      ))}
    </div>
  );
}

