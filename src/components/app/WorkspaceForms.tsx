"use client";

import Link from "next/link";
import { useState } from "react";
import { createBoard, createWorkspace, deleteBoard, renameBoard } from "@/app/(app)/w/actions";
import { Button } from "@/components/ui/Button";
import { ActionForm } from "./ActionForm";
import { Field, SubmitButton } from "./Form";

export function CreateWorkspaceForm() {
  return (
    <ActionForm action={createWorkspace} className="flex flex-col gap-3 sm:flex-row sm:items-end" aria-label="Create workspace">
      {(errors) => (
        <>
          <div className="flex-1">
            <Field id="ws-name" name="name" label="Workspace name" placeholder="e.g. Platform team" maxLength={80} required error={errors?.name} />
          </div>
          <SubmitButton pendingLabel="Creating…">Create workspace</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CreateBoardForm({ workspaceId }: { workspaceId: string }) {
  return (
    <ActionForm
      action={createBoard}
      hidden={{ workspaceId }}
      resetOnSuccess
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      aria-label="Create board"
    >
      {(errors) => (
        <>
          <div className="flex-1">
            <Field id="board-name" name="name" label="New board" placeholder="e.g. Sprint 24" maxLength={120} required error={errors?.name} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="board-template" className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Start with
            </label>
            <select
              id="board-template"
              name="template"
              defaultValue="starter"
              className="min-h-[44px] rounded-xl border border-subtle bg-surface px-3 text-sm"
            >
              <option value="starter">Todo · Doing · Done</option>
              <option value="blank">Blank board</option>
            </select>
          </div>
          <SubmitButton pendingLabel="Creating…">Create board</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function BoardTile({
  workspaceId,
  board,
  canEdit,
  canDelete,
}: {
  workspaceId: string;
  board: { id: string; name: string; version: number; updatedAt: string; lanes: number; cards: number };
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const updated = new Date(board.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <li className="relative flex flex-col rounded-2xl border border-subtle bg-surface p-5 transition-colors hover:border-accent/50">
      {mode === "rename" ? (
        <ActionForm action={renameBoard} hidden={{ workspaceId, boardId: board.id, version: board.version }} aria-label={`Rename ${board.name}`}>
          {(errors) => (
            <div className="flex flex-col gap-3">
              <Field id={`rename-${board.id}`} name="name" label="Board name" defaultValue={board.name} maxLength={120} autoFocus error={errors?.name} />
              <div className="flex gap-2">
                <SubmitButton size="sm">Save</SubmitButton>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </ActionForm>
      ) : (
        <>
          <h3 className="truncate text-lg font-semibold">
            <Link href={`/w/${workspaceId}/b/${board.id}`} className="hover:text-accent after:absolute after:inset-0">
              {board.name}
            </Link>
          </h3>
          <p className="mt-1 font-mono text-xs text-muted">
            {board.lanes} {board.lanes === 1 ? "lane" : "lanes"} · {board.cards} {board.cards === 1 ? "card" : "cards"} · updated {updated}
          </p>
        </>
      )}

      {mode === "delete" && (
        <ActionForm action={deleteBoard} hidden={{ workspaceId, boardId: board.id }} toastOnSuccess className="relative z-10 mt-4" aria-label={`Delete ${board.name}`}>
          <p className="mb-3 text-sm text-red-200">Delete this board and all its cards? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…">
              Delete board
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
              Keep it
            </Button>
          </div>
        </ActionForm>
      )}

      {mode === "view" && (canEdit || canDelete) && (
        <div className="relative z-10 mt-4 flex gap-2">
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setMode("rename")}>
              Rename
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setMode("delete")} className="hover:text-red-300">
              Delete
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
