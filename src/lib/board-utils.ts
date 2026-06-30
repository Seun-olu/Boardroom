import type { BoardColumn, Card } from "./types";

export function cardsForColumn(cards: Card[], columnId: string): Card[] {
  return cards
    .filter((c) => c.column === columnId)
    .sort((a, b) => a.order - b.order);
}

export function sortedColumns(columns: BoardColumn[]): BoardColumn[] {
  return [...columns].sort((a, b) => a.order - b.order);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export function generateRoomId(name?: string): string {
  const prefix = name ? slugify(name) : "board";
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `${prefix || "board"}-${suffix}`;
}

export function pickColumnColor(index: number): string {
  const colors = [
    "#6366F1",
    "#3B82F6",
    "#22D3EE",
    "#10B981",
    "#F59E0B",
    "#F97316",
    "#EF4444",
    "#A855F7",
  ];
  return colors[index % colors.length];
}

const LANE_PREFIX = "lane:";

export function laneSortableId(columnId: string): string {
  return `${LANE_PREFIX}${columnId}`;
}

export function parseLaneSortableId(id: string | number): string | null {
  const s = String(id);
  return s.startsWith(LANE_PREFIX) ? s.slice(LANE_PREFIX.length) : null;
}

export function reorderColumnsList(
  columns: BoardColumn[],
  columnId: string,
  targetOrder: number
): BoardColumn[] {
  const sorted = sortedColumns(columns);
  const fromIndex = sorted.findIndex((c) => c.id === columnId);
  if (fromIndex < 0 || fromIndex === targetOrder) return sorted;

  const next = [...sorted];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetOrder, 0, moved!);
  return next.map((c, i) => ({ ...c, order: i }));
}
