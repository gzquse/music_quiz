"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
            "text-[var(--foreground)]",
            "transition-colors duration-150 cursor-pointer",
            "hover:border-[var(--primary-light)]",
            "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
            error && "border-[var(--error)]",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[var(--error)] text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

