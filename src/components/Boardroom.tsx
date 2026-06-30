"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBoard } from "@/hooks/useBoard";
import { getOrCreateIdentity } from "@/lib/username";
import { Board } from "@/components/Board";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { PresenceBar } from "@/components/PresenceBar";
import { Button } from "@/components/ui/Button";
import type { BoardTemplate } from "@/lib/types";

interface BoardroomProps {
  roomId: string;
}

export function Boardroom({ roomId }: BoardroomProps) {
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState<{ name: string; color: string } | null>(null);

  const initConfig = useMemo(() => {
    if (searchParams.get("fresh") !== "1") return null;
    return {
      name: searchParams.get("name") ?? "Untitled Board",
      template: (searchParams.get("template") ?? "default") as BoardTemplate,
    };
  }, [searchParams]);

  useEffect(() => {
    setIdentity(getOrCreateIdentity());
  }, []);

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
    pendingCount,
  } = useBoard({
    roomId,
    identity: identity ?? { name: "Guest", color: "#6366F1" },
    initConfig,
  });

  const shareUrl =
    typeof window !== "undefined" ? window.location.href.split("?")[0] : `/board/${roomId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied", { description: "Share it to collaborate in real time." });
  };

  return (
    <div className="flex min-h-screen flex-col bg-base text-white">
      <header className="border-b border-subtle px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-lg uppercase tracking-tight text-white">
              Boardroom
            </Link>
            <div className="hidden h-4 w-px bg-subtle sm:block" />
            <div>
              <h1 className="text-sm font-semibold text-white">{board.name}</h1>
              <p className="font-mono text-[10px] text-muted">/{roomId}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {identity && <PresenceBar users={users} currentUserName={identity.name} />}
            <ConnectionStatus state={connectionState} pendingCount={pendingCount} />
            <Button variant="secondary" size="sm" onClick={copyLink}>
              Copy link
            </Button>
          </div>
        </div>

        {identity && (
          <p className="mx-auto mt-2 max-w-[1600px] font-mono text-[10px] text-muted">
            You&apos;re <span style={{ color: identity.color }}>{identity.name}</span>
          </p>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 py-6 md:px-10">
        {isLoading ? (
          <BoardSkeleton />
        ) : columns.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
            <h2 className="font-display text-3xl uppercase tracking-tight text-muted">
              {connectionState === "live" ? "No columns yet" : "Waiting for server"}
            </h2>
            <p className="max-w-sm text-center font-mono text-xs text-muted">
              {connectionState === "live"
                ? "Add a column to get started."
                : "Run npm run dev — needs both Next.js and PartyKit."}
            </p>
          </div>
        ) : (
          <Board
            columns={columns}
            cards={cards}
            onMoveCard={moveCard}
            onAddCard={addCard}
            onUpdateCard={updateCard}
            onAddColumn={addColumn}
          />
        )}
      </main>

      <footer className="border-t border-subtle px-6 py-3 md:px-10">
        <p className="mx-auto max-w-[1600px] font-mono text-[10px] text-muted/60">
          Built by Oluwaseun Olugbewesa — real-time collaboration demo
        </p>
      </footer>
    </div>
  );
}
