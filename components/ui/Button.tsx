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
          "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-2xl",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Variants
            "bg-gradient-to-r from-[#f4b183] to-[#e8926a] text-white shadow-[var(--shadow)] hover:opacity-95 active:opacity-90":
              variant === "primary",
            "bg-white/75 text-[var(--foreground)] backdrop-blur-md hover:bg-white":
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

