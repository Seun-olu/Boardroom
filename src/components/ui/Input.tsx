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
            "w-full rounded-lg border border-subtle bg-surface px-4 py-3 text-sm text-white placeholder:text-muted/50",
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
            "w-full resize-none rounded-lg border border-subtle bg-surface px-4 py-3 text-sm text-white placeholder:text-muted/50",
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

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-lg border border-subtle bg-surface px-4 py-3 text-sm text-white",
            "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-elevated">
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";
