"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/app/Form";
import { idle } from "@/lib/forms";
import { requestPasswordReset, signIn, signUp } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, idle);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required error={errors?.email} />
      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={errors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <div className="flex justify-between text-sm text-muted">
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="hover:text-white">
          Create an account
        </Link>
        <Link href="/forgot-password" className="hover:text-white">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, idle);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="name" name="name" label="Your name" autoComplete="name" required maxLength={60} error={errors?.name} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required error={errors?.email} />
      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        error={errors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idle);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required error={errors?.email} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      <Link href="/sign-in" className="text-sm text-muted hover:text-white">
        Back to sign in
      </Link>
    </form>
  );
}
