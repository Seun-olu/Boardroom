"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { idle, type FormState } from "@/lib/forms";
import { FormMessage } from "./Form";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/**
 * A form bound to a server action with inline status. Hidden fields carry ids;
 * `children` may be a function to read field errors.
 */
export function ActionForm({
  action,
  hidden,
  children,
  className,
  resetOnSuccess,
  toastOnSuccess,
  showMessage = true,
  "aria-label": ariaLabel,
}: {
  action: Action;
  hidden?: Record<string, string | number>;
  children: React.ReactNode | ((errors: Record<string, string> | undefined) => React.ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  /** For forms whose element disappears on success (e.g. removing a row). */
  toastOnSuccess?: boolean;
  showMessage?: boolean;
  "aria-label"?: string;
}) {
  // Toast from inside the action, not an effect: a row removed by this action
  // unmounts in the same render that delivers the result, so an effect would
  // never run.
  const [state, formAction] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await action(prev, form);
    if (toastOnSuccess && result.status === "success") toast.success(result.message);
    return result;
  }, idle);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.status === "success") ref.current?.reset();
  }, [state, resetOnSuccess]);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={formAction} className={className} noValidate aria-label={ariaLabel}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {typeof children === "function" ? children(errors) : children}
      {showMessage && !(toastOnSuccess && state.status === "success") && <div className="mt-3 empty:hidden"><FormMessage state={state} /></div>}
    </form>
  );
}
