"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card as CardType } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { formatStoryPointShort, subtaskProgress } from "@/lib/story-points";

interface KanbanCardProps {
  card: CardType;
  accentColor?: string;
  isDragging?: boolean;
  onClick?: () => void;
}

export function KanbanCard({ card, accentColor = "#6366F1", isDragging, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

  const priority = PRIORITY_CONFIG[card.priority];
  const subtasks = subtaskProgress(card.subtasks ?? []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: accentColor,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isSortDragging) {
          e.stopPropagation();
          onClick?.();
        }
      }}
      className={clsx(
        "group touch-manipulation select-none rounded-xl border border-subtle border-l-[3px] bg-elevated p-3 transition-all active:cursor-grabbing sm:p-3.5",
        "hover:border-accent/30 hover:bg-[#222226]",
        (isDragging || isSortDragging) && "z-50 shadow-glow opacity-90"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={clsx("h-1.5 w-1.5 rounded-full", priority.dot)} />
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
          {priority.label}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {subtasks.total > 0 && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-muted">
              {subtasks.done}/{subtasks.total}
            </span>
          )}
          {card.storyPoints !== null && card.storyPoints !== undefined && (
            <span
              className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent"
              title={`${card.storyPoints} story points`}
            >
              {formatStoryPointShort(card.storyPoints)} SP
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-medium leading-snug text-white">{card.title}</p>
      {card.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted">{card.description}</p>
      )}
      <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-muted/60">
        {card.updatedBy}
      </p>
    </div>
  );
}

export function KanbanCardOverlay({
  card,
  color = "#6366F1",
}: {
  card: CardType;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl border border-accent/40 border-l-[3px] bg-elevated p-3.5 shadow-glow"
      style={{ borderLeftColor: color }}
    >
      <p className="text-sm font-medium text-white">{card.title}</p>
    </div>
  );
}
