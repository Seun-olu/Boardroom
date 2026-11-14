import type { Tables } from "@/lib/database.types";
import type { BoardColumn, Card, Subtask } from "@/lib/types";

/**
 * Pure helpers that translate between database rows (fractional `position`)
 * and the UI's Card / BoardColumn shape (integer `order` within a lane).
 */

export type CardRow = Tables<"cards">;
export type ColumnRow = Tables<"board_columns">;

export function toColumns(rows: ColumnRow[]): BoardColumn[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((c, i) => ({ id: c.id, title: c.title, color: c.color, order: i, version: c.version }));
}

export function toCards(rows: CardRow[], names: Record<string, string>): Card[] {
  const byColumn = new Map<string, CardRow[]>();
  for (const r of rows) byColumn.set(r.column_id, [...(byColumn.get(r.column_id) ?? []), r]);
  const out: Card[] = [];
  for (const list of byColumn.values()) {
    list
      .sort((a, b) => a.position - b.position)
      .forEach((r, i) =>
        out.push({
          id: r.id,
          title: r.title,
          description: r.description,
          column: r.column_id,
          order: i,
          priority: r.priority,
          storyPoints: r.story_points,
          subtasks: Array.isArray(r.subtasks) ? (r.subtasks as unknown as Subtask[]) : [],
          version: r.version,
          updatedAt: Date.parse(r.updated_at),
          updatedBy: (r.updated_by && names[r.updated_by]) || "Someone",
        })
      );
  }
  return out;
}

/**
 * Position for an item inserted at `index` among `siblings` (sorted, excluding
 * the moved item): midway between its new neighbours, so only the moved row
 * is written.
 */
export function positionAt(siblings: { position: number }[], index: number): number {
  const prev = siblings[index - 1]?.position;
  const next = siblings[index]?.position;
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

/** Keep the newer of two copies of a row (realtime events can arrive late). */
export function newer<T extends { version: number }>(current: T | undefined, incoming: T): T {
  return !current || incoming.version >= current.version ? incoming : current;
}
