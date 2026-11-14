"use client";

import { useState } from "react";
import { changeRole, deleteWorkspace, inviteMember, removeMember, renameWorkspace, revokeInvite } from "@/app/(app)/w/actions";
import { Button } from "@/components/ui/Button";
import { getInitials } from "@/lib/username";
import { ActionForm } from "./ActionForm";
import { Field, SubmitButton } from "./Form";

type Role = "owner" | "admin" | "member" | "viewer";
const ROLE_HELP: Record<Exclude<Role, "owner">, string> = {
  admin: "Admin — manage members, invites and boards",
  member: "Member — create and edit boards and cards",
  viewer: "Viewer — read only",
};

function RoleSelect({ id, name = "role", defaultValue }: { id: string; name?: string; defaultValue: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className="min-h-[40px] rounded-lg border border-subtle bg-base px-2 text-sm">
      {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
        <option key={r} value={r}>
          {r[0]!.toUpperCase() + r.slice(1)}
        </option>
      ))}
    </select>
  );
}

export function MemberRow({
  workspaceId,
  member,
  isSelf,
  canManage,
}: {
  workspaceId: string;
  member: { userId: string; role: Role; name: string; color: string };
  isSelf: boolean;
  canManage: boolean;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editable = canManage && member.role !== "owner" && !isSelf;

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
          style={{ background: member.color }}
        >
          {getInitials(member.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {member.name} {isSelf && <span className="text-muted">(you)</span>}
          </p>
          {!editable && <p className="font-mono text-xs uppercase tracking-widest text-muted">{member.role}</p>}
        </div>
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <ActionForm action={changeRole} hidden={{ workspaceId, userId: member.userId }} className="flex items-center gap-2" aria-label={`Role for ${member.name}`}>
            <label htmlFor={`role-${member.userId}`} className="sr-only">
              Role for {member.name}
            </label>
            <RoleSelect id={`role-${member.userId}`} defaultValue={member.role} />
            <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </ActionForm>
          {confirmRemove ? (
            <ActionForm action={removeMember} hidden={{ workspaceId, userId: member.userId }} toastOnSuccess className="flex items-center gap-2" aria-label={`Remove ${member.name}`}>
              <SubmitButton variant="danger" size="sm" pendingLabel="Removing…">
                Confirm remove
              </SubmitButton>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                Cancel
              </Button>
            </ActionForm>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} className="hover:text-red-300">
              Remove
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  return (
    <ActionForm action={inviteMember} hidden={{ workspaceId }} resetOnSuccess className="flex flex-col gap-3" aria-label="Invite member">
      {(errors) => (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field id="invite-email" name="email" type="email" label="Email" placeholder="teammate@company.com" required error={errors?.email} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-role" className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Role
            </label>
            <RoleSelect id="invite-role" defaultValue="member" />
          </div>
          <SubmitButton pendingLabel="Inviting…">Create invite</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

export function InviteRow({
  workspaceId,
  invite,
  origin,
}: {
  workspaceId: string;
  invite: { id: string; email: string; role: Role; token: string; expiresAt: string };
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${origin}/invite/${invite.token}`;
  const expired = new Date(invite.expiresAt) < new Date();
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{invite.email}</p>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {invite.role} · {expired ? "expired" : `expires ${new Date(invite.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={expired}
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <ActionForm action={revokeInvite} hidden={{ workspaceId, inviteId: invite.id }} toastOnSuccess aria-label={`Revoke invite for ${invite.email}`}>
          <SubmitButton variant="ghost" size="sm" pendingLabel="Revoking…">
            Revoke
          </SubmitButton>
        </ActionForm>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Invite link copied to clipboard" : ""}
      </span>
    </li>
  );
}

export function WorkspaceSettings({
  workspaceId,
  name,
  role,
  selfId,
}: {
  workspaceId: string;
  name: string;
  role: Role;
  selfId: string;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  return (
    <div className="space-y-6">
      {(role === "admin" || role === "owner") && (
        <ActionForm action={renameWorkspace} hidden={{ workspaceId }} className="flex flex-col gap-3 sm:flex-row sm:items-end" aria-label="Rename workspace">
          {(errors) => (
            <>
              <div className="flex-1">
                <Field id="ws-rename" name="name" label="Workspace name" defaultValue={name} maxLength={80} error={errors?.name} />
              </div>
              <SubmitButton variant="secondary">Rename</SubmitButton>
            </>
          )}
        </ActionForm>
      )}

      {role !== "owner" && (
        <div>
          {confirmLeave ? (
            <ActionForm action={removeMember} hidden={{ workspaceId, userId: selfId }} className="flex flex-wrap items-center gap-2" aria-label="Leave workspace">
              <p className="w-full text-sm text-red-200">You&apos;ll lose access until someone invites you again.</p>
              <SubmitButton variant="danger" size="sm" pendingLabel="Leaving…">
                Leave workspace
              </SubmitButton>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmLeave(false)}>
                Stay
              </Button>
            </ActionForm>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmLeave(true)}>
              Leave workspace
            </Button>
          )}
        </div>
      )}

      {role === "owner" && (
        <ActionForm action={deleteWorkspace} hidden={{ workspaceId, name }} className="flex flex-col gap-3" aria-label="Delete workspace">
          {(errors) => (
            <>
              <p className="text-sm text-muted">
                Deleting removes every board, card and membership in this workspace. It can&apos;t be undone.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field id="ws-delete-confirm" name="confirm" label={`Type “${name}” to confirm`} autoComplete="off" error={errors?.confirm} />
                </div>
                <SubmitButton variant="danger" pendingLabel="Deleting…">
                  Delete workspace
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </div>
  );
}
