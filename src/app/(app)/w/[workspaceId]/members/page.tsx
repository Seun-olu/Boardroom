import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { InviteForm, InviteRow, MemberRow, WorkspaceSettings } from "@/components/app/MemberForms";
import { requireUser } from "@/lib/auth";
import { atLeast, getWorkspace, listMembers, listOpenInvites } from "@/lib/workspaces";

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3002";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export default async function MembersPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(`/w/${workspaceId}/members`);
  // Layouts and pages render in parallel, so the page checks membership itself.
  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();
  const canManage = atLeast(workspace.role, "admin");
  const [members, invites, origin] = await Promise.all([
    listMembers(workspaceId),
    canManage ? listOpenInvites(workspaceId) : Promise.resolve([]),
    siteOrigin(),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="members-h">
        <h2 id="members-h" className="font-mono text-xs uppercase tracking-widest text-muted">
          Members · {members.length}
        </h2>
        <ul className="mt-2 divide-y divide-subtle">
          {members.map((m) => (
            <MemberRow key={m.userId} workspaceId={workspaceId} member={m} isSelf={m.userId === user.id} canManage={canManage} />
          ))}
        </ul>
      </section>

      <div className="space-y-10">
        {canManage && (
          <section aria-labelledby="invite-h" className="rounded-2xl border border-subtle bg-surface/50 p-5">
            <h2 id="invite-h" className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
              Invite someone
            </h2>
            <p className="mb-4 text-sm text-muted">
              They&apos;ll need to sign in with this email to accept. Links expire after 7 days.
            </p>
            <InviteForm workspaceId={workspaceId} />
            {invites.length > 0 && (
              <ul className="mt-4 divide-y divide-subtle border-t border-subtle" aria-label="Open invites">
                {invites.map((i) => (
                  <InviteRow key={i.id} workspaceId={workspaceId} invite={i} origin={origin} />
                ))}
              </ul>
            )}
          </section>
        )}

        <section aria-labelledby="settings-h">
          <h2 id="settings-h" className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
            Workspace
          </h2>
          <WorkspaceSettings workspaceId={workspaceId} name={workspace.name} role={workspace.role} selfId={user.id} />
        </section>
      </div>
    </div>
  );
}
