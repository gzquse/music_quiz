"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
            "text-[var(--foreground)] placeholder:text-[var(--muted)]",
            "transition-colors duration-150",
            "hover:border-[var(--primary-light)]",
            "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
            error && "border-[var(--error)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-[var(--error)] text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]",
            "text-[var(--foreground)] placeholder:text-[var(--muted)]",
            "transition-colors duration-150 resize-y min-h-[100px]",
            "hover:border-[var(--primary-light)]",
            "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
            error && "border-[var(--error)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-[var(--error)] text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

