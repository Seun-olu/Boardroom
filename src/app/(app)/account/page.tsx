import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/app/AccountForms";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await requireUser("/account");
  const [{ reset }, profile] = await Promise.all([searchParams, getProfile(user.id)]);

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-muted">{user.email}</p>
      </div>
      {reset === "1" && (
        <p role="status" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          You&apos;re signed in from your reset link. Choose a new password below.
        </p>
      )}
      <section aria-labelledby="profile-h" className="rounded-2xl border border-subtle bg-surface/50 p-5">
        <h2 id="profile-h" className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
          Profile
        </h2>
        <ProfileForm name={profile.name} color={profile.color} />
      </section>
      <section aria-labelledby="password-h" className="rounded-2xl border border-subtle bg-surface/50 p-5">
        <h2 id="password-h" className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
          Password
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
