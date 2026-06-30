"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { BoardColumn, Card, Priority } from "@/lib/types";
import { cardsForColumn, sortedColumns } from "@/lib/board-utils";
import { Column } from "./Column";
import { KanbanCardOverlay } from "./KanbanCard";
import { CreateColumnModal } from "./modals/CreateColumnModal";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { Button } from "./ui/Button";

interface BoardProps {
  columns: BoardColumn[];
  cards: Card[];
  onMoveCard: (
    cardId: string,
    column: string,
    order: number,
    expectedVersion: number
  ) => void;
  onAddCard: (data: {
    title: string;
    description?: string;
    priority?: Priority;
    column: string;
  }) => void;
  onUpdateCard: (data: {
    cardId: string;
    title?: string;
    description?: string;
    priority?: Priority;
    expectedVersion: number;
  }) => void;
  onAddColumn: (title: string, color: string) => void;
}

export function Board({
  columns,
  cards,
  onMoveCard,
  onAddCard,
  onUpdateCard,
  onAddColumn,
}: BoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);

  const orderedColumns = sortedColumns(columns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const draggedCard = cards.find((c) => c.id === active.id);
    if (!draggedCard) return;

    const overColumn = orderedColumns.find((c) => c.id === over.id);
    const overCard = cards.find((c) => c.id === over.id);

    const targetColumn = overColumn?.id ?? overCard?.column ?? draggedCard.column;
    const columnCards = cardsForColumn(cards, targetColumn).filter(
      (c) => c.id !== draggedCard.id
    );

    let targetOrder = columnCards.length;
    if (overCard && overCard.id !== draggedCard.id) {
      const overIndex = columnCards.findIndex((c) => c.id === overCard.id);
      targetOrder = overIndex >= 0 ? overIndex : columnCards.length;
    }

    if (draggedCard.column === targetColumn && draggedCard.order === targetOrder) {
      return;
    }

    onMoveCard(draggedCard.id, targetColumn, targetOrder, draggedCard.version);
  };

  const selectedColumnColor =
    orderedColumns.find((c) => c.id === selectedCard?.column)?.color ?? "#6366F1";

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {orderedColumns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={cardsForColumn(cards, col.id)}
              onAddCard={(data) => onAddCard({ ...data, column: col.id })}
              onCardClick={setSelectedCard}
            />
          ))}

          <div className="flex w-72 shrink-0 flex-col">
            <Button
              variant="secondary"
              className="h-full min-h-[120px] w-full border-dashed"
              onClick={() => setColumnModalOpen(true)}
            >
              + Add column
            </Button>
          </div>
        </div>

        <DragOverlay
          dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {activeCard ? (
            <KanbanCardOverlay
              card={activeCard}
              color={orderedColumns.find((c) => c.id === activeCard.column)?.color}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateColumnModal
        open={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        onSubmit={onAddColumn}
      />

      <CardDetailDrawer
        card={selectedCard}
        columnColor={selectedColumnColor}
        onClose={() => setSelectedCard(null)}
        onSave={onUpdateCard}
      />
    </>
  );
}
