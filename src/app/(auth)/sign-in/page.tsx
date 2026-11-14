import type { Metadata } from "next";
import { safeNext } from "@/lib/auth";
import { isGoogleEnabled } from "@/lib/auth-providers";
import { GoogleButton } from "../GoogleButton";
import { SignInForm } from "../AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl uppercase tracking-tight">Sign in</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Pick up where your team left off.</p>
      {error === "oauth" && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Google sign-in couldn&apos;t start. Try again, or use email and password.
        </p>
      )}
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          That link was invalid or has expired. Sign in, or request a new one.
        </p>
      )}
      {(await isGoogleEnabled()) && <GoogleButton next={safeNext(next)} />}
      <SignInForm next={safeNext(next)} />
    </>
  );
}
