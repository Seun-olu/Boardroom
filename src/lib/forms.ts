import { z } from "zod";

/** Result shape every form action returns to `useActionState`. */
export type FormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; message: string };

export const idle: FormState = { status: "idle" };

export function fromZodError(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
}

/**
 * Turns a Supabase/PostgREST error into a message safe to show users. RLS and
 * custom PTxxx errors become plain-language messages; anything else is generic
 * (details are logged server-side, never shown).
 */
export function friendlyDbError(error: { code?: string; message?: string } | null, context: string): string {
  if (!error) return "Something went wrong.";
  const code = error.code ?? "";
  if (code === "42501" || /row-level security|permission denied/i.test(error.message ?? "")) {
    return "You don't have permission to do that.";
  }
  if (code === "PT403") return error.message ?? "You don't have permission to do that.";
  if (code === "PT404") return "That link is invalid or has expired.";
  if (code === "PT409") return "Someone else changed this first. Refresh and try again.";
  if (code === "23505") return "That already exists.";
  if (code === "23514" || code === "22P02") return "Some of the values aren't valid.";
  console.error(`[db] ${context}`, code, error.message);
  return "Something went wrong. Please try again.";
}

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
export const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");
export const displayNameSchema = z.string().trim().min(1, "Enter a name.").max(60, "Use at most 60 characters.");
