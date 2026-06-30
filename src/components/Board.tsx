"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { BoardColumn, Card, Priority, Subtask } from "@/lib/types";
import {
  cardsForColumn,
  laneSortableId,
  parseLaneSortableId,
  sortedColumns,
} from "@/lib/board-utils";
import { LANE } from "@/lib/labels";
import { Column, LaneOverlay } from "./Column";
import { KanbanCardOverlay } from "./KanbanCard";
import { CreateColumnModal } from "./modals/CreateColumnModal";
import { CardDetailDrawer } from "./CardDetailDrawer";

interface BoardProps {
  columns: BoardColumn[];
  cards: Card[];
  onMoveCard: (
    cardId: string,
    column: string,
    order: number,
    expectedVersion: number
  ) => void;
  onMoveColumn: (columnId: string, order: number, expectedVersion: number) => void;
  onAddCard: (data: {
    title: string;
    description?: string;
    priority?: Priority;
    storyPoints?: number | null;
    column: string;
  }) => void;
  onUpdateCard: (data: {
    cardId: string;
    title?: string;
    description?: string;
    priority?: Priority;
    storyPoints?: number | null;
    subtasks?: Subtask[];
    expectedVersion: number;
  }) => void;
  onDeleteCard: (cardId: string, expectedVersion: number) => void;
  onAddColumn: (title: string, color: string) => void;
  onUpdateColumn: (data: {
    columnId: string;
    title?: string;
    expectedVersion: number;
  }) => void;
  onDeleteColumn: (columnId: string, expectedVersion: number) => void;
}

export function Board({
  columns,
  cards,
  onMoveCard,
  onMoveColumn,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}: BoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeLane, setActiveLane] = useState<BoardColumn | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [laneModalOpen, setLaneModalOpen] = useState(false);

  const orderedColumns = sortedColumns(columns);
  const laneIds = orderedColumns.map((c) => laneSortableId(c.id));

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const resolveColumnId = (overId: string | number): string | undefined => {
    const laneId = parseLaneSortableId(overId);
    if (laneId) return laneId;
    const col = orderedColumns.find((c) => c.id === String(overId));
    if (col) return col.id;
    return cards.find((c) => c.id === String(overId))?.column;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === "lane") {
      const columnId = event.active.data.current?.columnId as string;
      setActiveLane(orderedColumns.find((c) => c.id === columnId) ?? null);
      return;
    }
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const type = active.data.current?.type;

    if (type === "lane") {
      setActiveLane(null);
      if (!over) return;

      const activeColumnId = parseLaneSortableId(active.id);
      const overColumnId =
        parseLaneSortableId(over.id) ?? resolveColumnId(over.id) ?? null;
      let targetId = overColumnId;
      if (!activeColumnId || !targetId) return;

      const oldIndex = orderedColumns.findIndex((c) => c.id === activeColumnId);
      const newIndex = orderedColumns.findIndex((c) => c.id === targetId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const column = orderedColumns[oldIndex]!;
      onMoveColumn(column.id, newIndex, column.version);
      return;
    }

    setActiveCard(null);
    if (!over) return;

    const draggedCard = cards.find((c) => c.id === active.id);
    if (!draggedCard) return;

    const targetColumn = resolveColumnId(over.id);
    if (!targetColumn) return;

    const columnCards = cardsForColumn(cards, targetColumn).filter(
      (c) => c.id !== draggedCard.id
    );

    let targetOrder = columnCards.length;
    const overCard = cards.find((c) => c.id === over.id);
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
        <div className="scroll-touch -mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:thin] sm:mx-0 sm:gap-4 sm:px-0 sm:pb-4">
          <SortableContext items={laneIds} strategy={horizontalListSortingStrategy}>
            {orderedColumns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={cardsForColumn(cards, col.id)}
                canDelete={orderedColumns.length > 1}
                onAddCard={(data) => onAddCard({ ...data, column: col.id })}
                onCardClick={setSelectedCard}
                onRenameColumn={(columnId, title, expectedVersion) =>
                  onUpdateColumn({ columnId, title, expectedVersion })
                }
                onDeleteColumn={onDeleteColumn}
              />
            ))}
          </SortableContext>

          <button
            type="button"
            onClick={() => setLaneModalOpen(true)}
            className="mt-6 flex h-9 w-[min(72vw,12rem)] shrink-0 snap-center items-center justify-center gap-1.5 rounded-lg border border-dashed border-subtle px-3 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent/50 hover:text-accent sm:mt-8 sm:w-auto"
            title={LANE.add}
          >
            <span className="text-sm leading-none">+</span>
            {LANE.singular}
          </button>
        </div>

        <DragOverlay
          dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {activeLane ? (
            <LaneOverlay
              column={activeLane}
              cardCount={cardsForColumn(cards, activeLane.id).length}
            />
          ) : activeCard ? (
            <KanbanCardOverlay
              card={activeCard}
              color={orderedColumns.find((c) => c.id === activeCard.column)?.color}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateColumnModal
        open={laneModalOpen}
        onClose={() => setLaneModalOpen(false)}
        onSubmit={onAddColumn}
      />

      <CardDetailDrawer
        card={selectedCard}
        columnColor={selectedColumnColor}
        onClose={() => setSelectedCard(null)}
        onSave={onUpdateCard}
        onDelete={(cardId, expectedVersion) => {
          onDeleteCard(cardId, expectedVersion);
          setSelectedCard(null);
        }}
      />
    </>
  );
}
