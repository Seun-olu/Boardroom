"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import clsx from "clsx";
import type { BoardColumn, Card, Priority } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { CreateCardModal } from "./modals/CreateCardModal";

interface ColumnProps {
  column: BoardColumn;
  cards: Card[];
  onAddCard: (data: {
    title: string;
    description: string;
    priority: Priority;
  }) => void;
  onCardClick: (card: Card) => void;
}

export function Column({ column, cards, onAddCard, onCardClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex w-72 shrink-0 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-white/80">
            {column.title}
          </h2>
          <span className="ml-auto font-mono text-[10px] text-muted">{cards.length}</span>
        </div>

        <div
          ref={setNodeRef}
          className={clsx(
            "flex min-h-[420px] flex-1 flex-col gap-2.5 rounded-xl border p-3 transition-colors",
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
                Drop cards here
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-1 w-full rounded-lg border border-dashed border-subtle py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            + Add card
          </button>
        </div>
      </div>

      <CreateCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        columnTitle={column.title}
        onSubmit={onAddCard}
      />
    </>
  );
}
