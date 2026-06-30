import clsx from "clsx";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center font-mono font-semibold uppercase tracking-widest transition-all disabled:opacity-40",
          size === "sm" ? "px-4 py-2 text-[10px]" : "px-6 py-3 text-xs",
          variant === "primary" && "bg-accent text-white hover:brightness-110",
          variant === "secondary" && "border border-subtle bg-surface text-white hover:border-accent/50",
          variant === "ghost" && "text-muted hover:bg-surface hover:text-white",
          variant === "danger" && "border border-red-500/30 text-red-400 hover:bg-red-500/10",
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
