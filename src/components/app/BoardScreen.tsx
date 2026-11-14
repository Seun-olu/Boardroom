"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { PresenceBar } from "@/components/PresenceBar";
import { CreateColumnModal } from "@/components/modals/CreateColumnModal";
import { Button } from "@/components/ui/Button";
import { useLiveBoard, type LiveBoardInit } from "@/hooks/useLiveBoard";

export function BoardScreen({ init, workspace }: { init: LiveBoardInit; workspace: { id: string; name: string } }) {
  const live = useLiveBoard(init);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(init.board.name);
  const [laneModal, setLaneModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = () => {
    setRenaming(false);
    const name = draft.trim();
    if (name && name !== live.board.name && name.length <= 120) live.renameBoard(name);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href={`/w/${workspace.id}`} className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-white">
            ← {workspace.name}
          </Link>
          {renaming ? (
            <input
              ref={inputRef}
              aria-label="Board name"
              value={draft}
              maxLength={120}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="mt-2 block w-full max-w-md rounded-xl border border-accent/40 bg-surface px-3 py-1.5 text-2xl font-semibold outline-none"
            />
          ) : (
            <h1 className="mt-2 truncate font-display text-3xl uppercase tracking-tight">
              {init.canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(live.board.name);
                    setRenaming(true);
                  }}
                  className="text-left hover:text-accent"
                  title="Rename board"
                >
                  {live.board.name}
                </button>
              ) : (
                live.board.name
              )}
            </h1>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PresenceBar users={live.users} currentUserName={init.me.name} />
          <ConnectionStatus state={live.connection} pendingCount={live.pending} />
        </div>
      </div>

      {!init.canEdit && (
        <p role="status" className="mb-4 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-muted">
          You have view-only access to this board.
        </p>
      )}

      {live.columns.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-subtle py-20 text-center">
          <h2 className="text-lg font-semibold">No lanes yet</h2>
          <p className="text-sm text-muted">{init.canEdit ? "Add a lane to start organising cards." : "Nothing here yet."}</p>
          {init.canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setLaneModal(true)}>
              Add lane
            </Button>
          )}
        </section>
      ) : (
        <Board
          columns={live.columns}
          cards={live.cards}
          onMoveCard={live.moveCard}
          onMoveColumn={live.moveColumn}
          onAddCard={live.addCard}
          onUpdateCard={live.updateCard}
          onDeleteCard={live.deleteCard}
          onAddColumn={live.addColumn}
          onUpdateColumn={live.updateColumn}
          onDeleteColumn={live.deleteColumn}
        />
      )}

      <CreateColumnModal
        open={laneModal}
        onClose={() => setLaneModal(false)}
        onSubmit={(title, color) => {
          live.addColumn(title, color);
          setLaneModal(false);
        }}
      />
    </div>
  );
}
