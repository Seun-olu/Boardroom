"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBoard } from "@/hooks/useBoard";
import { getStoredIdentity, saveIdentity, type UserIdentity } from "@/lib/username";
import { Board } from "@/components/Board";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { PresenceBar } from "@/components/PresenceBar";
import { Button } from "@/components/ui/Button";
import { JoinNameModal } from "@/components/modals/JoinNameModal";
import { CreateColumnModal } from "@/components/modals/CreateColumnModal";
import { roomIdToDisplayName } from "@/lib/board-utils";
import type { BoardTemplate } from "@/lib/types";
import { LANE } from "@/lib/labels";

interface BoardroomProps {
  roomId: string;
}

function BoardroomView({
  roomId,
  identity,
  initConfig,
  onChangeName,
}: {
  roomId: string;
  identity: UserIdentity;
  initConfig: { name: string; template: BoardTemplate } | null;
  onChangeName: () => void;
}) {
  const [isRenamingBoard, setIsRenamingBoard] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    columns,
    cards,
    board,
    users,
    connectionState,
    isLoading,
    moveCard,
    addCard,
    updateCard,
    addColumn,
    deleteCard,
    deleteColumn,
    updateColumn,
    moveColumn,
    updateBoard,
    pendingCount,
  } = useBoard({ roomId, identity, initConfig });

  useEffect(() => {
    if (isRenamingBoard) renameRef.current?.focus();
  }, [isRenamingBoard]);

  // Remove ?fresh=1 from the URL so copied links don't re-trigger board setup.
  useEffect(() => {
    if (searchParams.get("fresh") !== "1") return;
    if (!board.initialized) return;
    router.replace(`/board/${roomId}`, { scroll: false });
  }, [board.initialized, roomId, router, searchParams]);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href.split("?")[0] : `/board/${roomId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied", { description: "Anyone with the link can join and collaborate." });
  };

  const commitBoardRename = () => {
    const trimmed = boardNameDraft.trim();
    setIsRenamingBoard(false);
    if (!trimmed || trimmed === displayBoardName) return;
    updateBoard(trimmed, board.version);
  };

  const displayBoardName = useMemo(() => {
    if (board.name && board.name !== "Untitled Board") return board.name;
    if (initConfig?.name && initConfig.name !== "Untitled Board") return initConfig.name;
    return roomIdToDisplayName(roomId) ?? board.name;
  }, [board.name, initConfig?.name, roomId]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-base text-white">
      <header className="relative z-20 shrink-0 overflow-visible border-b border-subtle px-4 py-3 sm:px-6 sm:py-4 md:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 overflow-visible sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link
              href="/"
              className="shrink-0 font-display text-base uppercase tracking-tight text-white sm:text-lg"
            >
              Boardroom
            </Link>
            <div className="hidden h-4 w-px bg-subtle sm:block" />
            <div className="min-w-0 flex-1">
              {isRenamingBoard ? (
                <input
                  ref={renameRef}
                  value={boardNameDraft}
                  onChange={(e) => setBoardNameDraft(e.target.value)}
                  onBlur={commitBoardRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitBoardRename();
                    if (e.key === "Escape") setIsRenamingBoard(false);
                  }}
                  className="w-full max-w-[240px] rounded-md border border-accent/40 bg-surface px-2 py-1 text-sm font-semibold text-white outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBoardNameDraft(displayBoardName);
                    setIsRenamingBoard(true);
                  }}
                  className="group flex w-full max-w-full items-center gap-2 text-left sm:max-w-[280px]"
                  title="Rename board"
                >
                  <h1 className="truncate text-base font-semibold text-white group-hover:text-accent sm:text-sm">
                    {displayBoardName}
                  </h1>
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.25 8.25a1 1 0 01-.414.263l-3 1a1 1 0 01-1.263-1.263l1-3a1 1 0 01.263-.414l8.25-8.25z" />
                  </svg>
                </button>
              )}
              <p className="font-mono text-[10px] text-muted">/{roomId}</p>
            </div>
          </div>

          <div className="relative z-30 flex flex-wrap items-center gap-2 overflow-visible sm:gap-4">
            <PresenceBar users={users} currentUserName={identity.name} />
            <ConnectionStatus state={connectionState} pendingCount={pendingCount} />
            <Button variant="secondary" size="sm" onClick={copyLink} className="shrink-0">
              Copy link
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-2 max-w-[1600px] truncate font-mono text-[10px] text-muted">
          You&apos;re{" "}
          <span style={{ color: identity.color }}>{identity.name}</span>
          <button
            type="button"
            onClick={onChangeName}
            className="ml-2 text-accent/80 underline-offset-2 hover:text-accent hover:underline"
          >
            Change
          </button>
        </p>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 md:px-10">
        {isLoading ? (
          <BoardSkeleton />
        ) : columns.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
            <h2 className="font-display text-3xl uppercase tracking-tight text-muted">
              {connectionState === "live" ? LANE.emptyBoard : "Waiting for server"}
            </h2>
            <p className="max-w-sm text-center font-mono text-xs text-muted">
              {connectionState === "live"
                ? LANE.emptyHint
                : "Check your connection and Supabase setup."}
            </p>
            {connectionState === "live" && (
              <Button variant="secondary" size="sm" onClick={() => setLaneModalOpen(true)}>
                {LANE.add}
              </Button>
            )}
          </div>
        ) : (
          <Board
            columns={columns}
            cards={cards}
            onMoveCard={moveCard}
            onMoveColumn={moveColumn}
            onAddCard={addCard}
            onUpdateCard={updateCard}
            onDeleteCard={deleteCard}
            onAddColumn={addColumn}
            onUpdateColumn={updateColumn}
            onDeleteColumn={deleteColumn}
          />
        )}
      </main>

      <footer className="shrink-0 border-t border-subtle px-4 py-3 sm:px-6 md:px-10">
        <p className="mx-auto max-w-[1600px] font-mono text-[10px] text-muted/60">
          Built by Oluwaseun Olugbewesa — real-time collaboration demo
        </p>
      </footer>

      <CreateColumnModal
        open={laneModalOpen}
        onClose={() => setLaneModalOpen(false)}
        onSubmit={(title, color) => {
          addColumn(title, color);
          setLaneModalOpen(false);
        }}
      />
    </div>
  );
}

export function Boardroom({ roomId }: BoardroomProps) {
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(true);

  const initConfig = useMemo(() => {
    if (searchParams.get("fresh") !== "1") return null;
    return {
      name: searchParams.get("name") ?? "Untitled Board",
      template: (searchParams.get("template") ?? "blank") as BoardTemplate,
    };
  }, [searchParams]);

  useEffect(() => {
    const stored = getStoredIdentity();
    if (stored) {
      setIdentity(stored);
      setNamePromptOpen(false);
    }
    setIdentityReady(true);
  }, []);

  const pendingBoardName = initConfig?.name;

  const handleNameSubmit = (name: string) => {
    setIdentity(saveIdentity(name, identity));
    setNamePromptOpen(false);
  };

  const handleChangeName = () => {
    setNamePromptOpen(true);
  };

  if (!identityReady) {
    return (
      <div className="flex min-h-screen flex-col bg-base text-white">
        <header className="border-b border-subtle px-6 py-4">
          <span className="font-display text-lg uppercase tracking-tight">Boardroom</span>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <BoardSkeleton />
        </main>
      </div>
    );
  }

  if (!identity || namePromptOpen) {
    return (
      <div className="flex min-h-screen flex-col bg-base text-white">
        <header className="border-b border-subtle px-6 py-4">
          <span className="font-display text-lg uppercase tracking-tight">Boardroom</span>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <BoardSkeleton />
        </main>
        <JoinNameModal
          open={namePromptOpen}
          boardName={pendingBoardName ?? undefined}
          initialName={identity?.name}
          onSubmit={handleNameSubmit}
        />
      </div>
    );
  }

  return (
    <BoardroomView
      roomId={roomId}
      identity={identity}
      initConfig={initConfig}
      onChangeName={handleChangeName}
    />
  );
}
