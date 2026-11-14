import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspaces";
import { WorkspaceTabs } from "./WorkspaceTabs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ workspaceId: string }> }): Promise<Metadata> {
  const { workspaceId } = await params;
  if (!UUID.test(workspaceId)) return {};
  const user = await getCurrentUser();
  const workspace = user ? await getWorkspace(workspaceId, user.id) : null;
  return workspace ? { title: workspace.name } : {};
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await requireUser(`/w/${workspaceId}`);
  // Non-members get a 404, not a 403, so workspace ids can't be probed.
  if (!UUID.test(workspaceId)) notFound();
  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/w" className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-white">
          ← All workspaces
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">{workspace.name}</h1>
          <span className="font-mono text-xs uppercase tracking-widest text-muted">You are {workspace.role}</span>
        </div>
        <WorkspaceTabs workspaceId={workspaceId} />
      </div>
      {children}
    </div>
  );
}
