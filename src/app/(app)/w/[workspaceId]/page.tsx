import { notFound } from "next/navigation";
import { BoardTile, CreateBoardForm } from "@/components/app/WorkspaceForms";
import { requireUser } from "@/lib/auth";
import { atLeast, getWorkspace, listBoards } from "@/lib/workspaces";

export default async function WorkspaceBoardsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(`/w/${workspaceId}`);
  // Layouts and pages render in parallel, so the page checks membership itself.
  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();
  const boards = await listBoards(workspaceId);
  const canEdit = atLeast(workspace.role, "member");
  const canDelete = atLeast(workspace.role, "admin");

  return (
    <div className="space-y-8">
      {canEdit && (
        <section aria-label="Create board" className="rounded-2xl border border-subtle bg-surface/50 p-5">
          <CreateBoardForm workspaceId={workspaceId} />
        </section>
      )}

      {boards.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-subtle p-8 text-center">
          <h2 className="text-lg font-semibold">No boards yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {canEdit ? "Create the first board above." : "A member of this workspace needs to create one."}
          </p>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Boards">
          {boards.map((b) => (
            <BoardTile key={b.id} workspaceId={workspaceId} board={b} canEdit={canEdit} canDelete={canDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
