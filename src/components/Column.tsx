"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import clsx from "clsx";
import type { BoardColumn, Card, Priority } from "@/lib/types";
import { laneSortableId } from "@/lib/board-utils";
import { LANE } from "@/lib/labels";
import { KanbanCard } from "./KanbanCard";
import { CreateCardModal } from "./modals/CreateCardModal";
import { ConfirmModal } from "./modals/ConfirmModal";
import { ActionMenu } from "./ui/Dropdown";

interface ColumnProps {
  column: BoardColumn;
  cards: Card[];
  canDelete: boolean;
  onAddCard: (data: {
    title: string;
    description: string;
    priority: Priority;
    storyPoints?: number | null;
  }) => void;
  onCardClick: (card: Card) => void;
  onRenameColumn: (columnId: string, title: string, expectedVersion: number) => void;
  onDeleteColumn: (columnId: string, expectedVersion: number) => void;
}

export function Column({
  column,
  cards,
  canDelete,
  onAddCard,
  onCardClick,
  onRenameColumn,
  onDeleteColumn,
}: ColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isLaneDragging,
  } = useSortable({
    id: laneSortableId(column.id),
    data: { type: "lane", columnId: column.id },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });
  const [modalOpen, setModalOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRenameValue(column.title);
  }, [column.title]);

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    setIsRenaming(false);
    if (!trimmed || trimmed === column.title) {
      setRenameValue(column.title);
      return;
    }
    onRenameColumn(column.id, trimmed, column.version);
  };

  const laneStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setSortableRef}
        style={laneStyle}
        className={clsx(
          "flex w-[min(88vw,18rem)] shrink-0 snap-center flex-col sm:w-72",
          isLaneDragging && "z-50 opacity-60"
        )}
      >
        <div className="mb-3 flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted/60 transition-colors hover:text-muted active:cursor-grabbing"
            aria-label={LANE.dragHint}
            {...attributes}
            {...listeners}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M7 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM7 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM7 13a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
            </svg>
          </button>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setRenameValue(column.title);
                  setIsRenaming(false);
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-accent/40 bg-surface px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-white outline-none"
            />
          ) : (
            <h2 className="min-w-0 flex-1 truncate font-mono text-xs font-bold uppercase tracking-[0.15em] text-white/80">
              {column.title}
            </h2>
          )}
          <span className="font-mono text-[10px] text-muted">{cards.length}</span>
          <ActionMenu
            items={[
              {
                id: "rename",
                label: LANE.rename,
                onSelect: () => setIsRenaming(true),
              },
              ...(canDelete
                ? [
                    {
                      id: "delete",
                      label: LANE.delete,
                      danger: true,
                      onSelect: () => setDeleteOpen(true),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div
          ref={setDropRef}
          className={clsx(
            "flex min-h-[min(52vh,420px)] flex-1 flex-col gap-2.5 rounded-xl border p-3 transition-colors sm:min-h-[420px]",
            isOver ? "border-accent/40 bg-accent/5" : "border-subtle bg-surface"
          )}
          style={{
            boxShadow: isOver ? `inset 0 0 0 1px ${column.color}33` : undefined,
          }}
        >
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                accentColor={column.color}
                onClick={() => onCardClick(card)}
              />
            ))}
          </SortableContext>

          {cards.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted/50">
                {LANE.dropCards}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-1 w-full rounded-lg border border-dashed border-subtle py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            + Add card
          </button>
        </div>
      </div>

      <CreateCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        laneTitle={column.title}
        onSubmit={onAddCard}
      />

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={LANE.deleteTitle}
        description={LANE.deleteDescription(column.title)}
        confirmLabel="Delete"
        danger
        onConfirm={() => onDeleteColumn(column.id, column.version)}
      />
    </>
  );
}

export function LaneOverlay({ column, cardCount }: { column: BoardColumn; cardCount: number }) {
  return (
    <div className="w-72 rounded-xl border border-accent/40 bg-surface p-3 shadow-glow">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-white">
          {column.title}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted">{cardCount}</span>
      </div>
      <div className="h-24 rounded-lg border border-dashed border-subtle/60" />
    </div>
  );
}
