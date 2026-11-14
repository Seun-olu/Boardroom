import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/(app)/w/actions";
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/Form";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const metadata: Metadata = { title: "Workspace invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser(`/invite/${token}`);
  const supabase = await createSupabaseServerClient();
  const { data } = /^[0-9a-f]{64}$/.test(token)
    ? await supabase.rpc("get_workspace_invite", { p_token: token })
    : { data: null };
  const invite = data?.[0];

  const panel = "mx-auto max-w-md rounded-2xl border border-subtle bg-surface p-6 sm:p-8";

  if (!invite || invite.expired || invite.accepted) {
    return (
      <div className={panel}>
        <h1 className="text-xl font-semibold">This invite can&apos;t be used</h1>
        <p className="mt-2 text-sm text-muted">
          {invite?.accepted ? "It has already been accepted." : invite?.expired ? "It has expired." : "The link is invalid."} Ask a
          workspace admin for a new one.
        </p>
        <Link href="/w" className="mt-6 inline-block text-sm text-accent hover:underline">
          Go to your workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className={panel}>
      <p className="font-mono text-xs uppercase tracking-widest text-muted">You&apos;re invited</p>
      <h1 className="mt-2 text-2xl font-semibold">Join {invite.workspace_name}</h1>
      <p className="mt-2 text-sm text-muted">as {invite.role}</p>
      {invite.email_matches ? (
        <ActionForm action={acceptInvite} hidden={{ token }} className="mt-6">
          <SubmitButton pendingLabel="Joining…">Accept invite</SubmitButton>
        </ActionForm>
      ) : (
        <p role="alert" className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          This invite was sent to a different email than the one you&apos;re signed in with
          {user.email ? ` (${user.email})` : ""}. Sign in with the invited address to accept it.
        </p>
      )}
    </div>
  );
}
