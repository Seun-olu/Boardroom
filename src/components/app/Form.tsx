"use client";

import clsx from "clsx";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/forms";

/** Submit button that disables itself and shows progress while the action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending} className={className}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}

/** Form-level status message, announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm",
        state.status === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      )}
    >
      {state.message}
    </p>
  );
}

/** Labelled input with an inline, programmatically associated error. */
export function Field({
  id,
  label,
  error,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          "min-h-[44px] w-full rounded-xl border bg-surface px-4 py-3 text-base text-white placeholder:text-muted/50 sm:text-sm",
          "focus:outline-none focus:ring-1",
          error ? "border-red-500/60 focus:ring-red-500/30" : "border-subtle focus:border-accent focus:ring-accent/30"
        )}
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
