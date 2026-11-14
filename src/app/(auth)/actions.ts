"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { displayNameSchema, emailSchema, fromZodError, passwordSchema, type FormState } from "@/lib/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

async function origin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3002";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.").max(72) });

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: "Confirm your email first — check your inbox for the link." };
    }
    if (error.status === 429) return { status: "error", message: "Too many attempts. Wait a minute and try again." };
    // One message for unknown email and wrong password, so accounts can't be enumerated.
    return { status: "error", message: "Incorrect email or password." };
  }
  redirect(safeNext(form.get("next") as string | null));
}

const signUpSchema = z.object({ name: displayNameSchema, email: emailSchema, password: passwordSchema });

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const next = safeNext(form.get("next") as string | null);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.status === 429) return { status: "error", message: "Too many sign-ups from here. Try again later." };
    if (error.code === "weak_password") return { status: "error", message: "Choose a stronger password." };
    return { status: "error", message: "Couldn't create the account. Try again." };
  }
  // With email confirmation on (the default), there's no session yet.
  if (data.session) redirect(next);
  return {
    status: "success",
    message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.`,
  };
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: form.get("email") });
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent("/account?reset=1")}`,
  });
  // Same response whether or not the account exists.
  return { status: "success", message: "If that email has an account, a reset link is on its way." };
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const next = safeNext(form.get("next") as string | null);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/sign-in?error=oauth");
  redirect(data.url);
}
