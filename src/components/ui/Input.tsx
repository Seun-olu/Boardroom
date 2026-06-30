import clsx from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-white placeholder:text-muted/50 sm:text-sm",
            "min-h-[44px] touch-manipulation",
            "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={clsx(
            "w-full resize-none rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-white placeholder:text-muted/50 sm:text-sm",
            "touch-manipulation",
            "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
