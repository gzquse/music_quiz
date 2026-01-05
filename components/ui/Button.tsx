"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Variants
            "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] active:bg-[var(--primary-dark)]":
              variant === "primary",
            "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-hover)]":
              variant === "secondary",
            "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)]":
              variant === "ghost",
            "bg-[var(--error)] text-white hover:opacity-90":
              variant === "danger",
            // Sizes
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-base": size === "md",
            "px-6 py-3 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

