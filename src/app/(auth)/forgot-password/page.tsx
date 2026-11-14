import type { Metadata } from "next";
import { ForgotPasswordForm } from "../AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl uppercase tracking-tight">Reset password</h1>
      <p className="mb-8 mt-2 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
