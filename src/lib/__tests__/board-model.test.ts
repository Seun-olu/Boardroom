import { expect, test } from "vitest";
import { newer, positionAt, toCards, toColumns, type CardRow, type ColumnRow } from "../board-model";

const card = (id: string, column: string, position: number, version = 1): CardRow => ({
  id, board_id: "b", column_id: column, title: id, description: "", priority: "medium", story_points: null,
  subtasks: [], assignee_id: null, position, version, created_by: null, updated_by: "u1",
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
});

test("positionAt places items between neighbours without touching them", () => {
  const sib = [{ position: 1 }, { position: 2 }, { position: 4 }];
  expect(positionAt(sib, 0)).toBe(0);
  expect(positionAt(sib, 1)).toBe(1.5);
  expect(positionAt(sib, 2)).toBe(3);
  expect(positionAt(sib, 3)).toBe(5);
  expect(positionAt([], 0)).toBe(1);
});

test("toCards orders by position within each lane and maps names", () => {
  const cards = toCards([card("c", "x", 3), card("a", "x", 1), card("b", "y", 9)], { u1: "Ada" });
  const x = cards.filter((c) => c.column === "x").sort((p, q) => p.order - q.order);
  expect(x.map((c) => [c.id, c.order])).toEqual([["a", 0], ["c", 1]]);
  expect(cards.find((c) => c.id === "b")!.order).toBe(0);
  expect(cards[0]!.updatedBy).toBe("Ada");
});

test("toColumns orders lanes by position", () => {
  const col = (id: string, position: number): ColumnRow => ({
    id, board_id: "b", title: id, color: "#000000", position, version: 1,
    created_by: null, updated_by: null, created_at: "", updated_at: "",
  });
  expect(toColumns([col("b", 2), col("a", 0.5)]).map((c) => [c.id, c.order])).toEqual([["a", 0], ["b", 1]]);
});

test("newer keeps the higher version (late realtime events can't roll back)", () => {
  expect(newer(card("a", "x", 1, 3), card("a", "x", 9, 2)).version).toBe(3);
  expect(newer(card("a", "x", 1, 3), card("a", "x", 9, 4)).position).toBe(9);
});
