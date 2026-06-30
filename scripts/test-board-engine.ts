import assert from "node:assert/strict";
import { BoardEngine } from "../src/lib/board-engine";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

test("init_board sets template once", () => {
  const engine = new BoardEngine();
  const msgs = engine.apply({
    type: "init_board",
    name: "Sprint 1",
    template: "empty",
  });
  assert.equal(engine.board.initialized, true);
  assert.equal(engine.board.name, "Sprint 1");
  assert.equal(engine.cards.length, 0);
  assert.ok(msgs.some((m) => m.type === "action_ack" && m.success));
});

test("move_card updates order", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "init_board", name: "Test", template: "default" });
  const cardId = engine.cards[0]!.id;
  const version = engine.cards[0]!.version;
  const msgs = engine.apply({
    type: "move_card",
    cardId,
    column: "done",
    order: 0,
    expectedVersion: version,
    timestamp: Date.now(),
    userName: "Tester",
    clientActionId: "a1",
  });
  const moved = engine.cards.find((c) => c.id === cardId);
  assert.equal(moved?.column, "done");
  assert.ok(msgs.some((m) => m.type === "action_ack" && m.success));
});

test("conflict when version stale", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "init_board", name: "Test", template: "default" });
  const card = engine.cards[0]!;
  engine.apply({
    type: "update_card",
    cardId: card.id,
    title: "Updated by someone else",
    expectedVersion: card.version,
    userName: "Other",
    clientActionId: "x",
  });
  const msgs = engine.apply({
    type: "move_card",
    cardId: card.id,
    column: "doing",
    order: 0,
    expectedVersion: card.version,
    timestamp: Date.now(),
    userName: "Late",
    clientActionId: "late",
  });
  assert.ok(msgs.some((m) => m.type === "conflict"));
});

test("move_column reorders lanes", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "init_board", name: "Test", template: "default" });
  const first = engine.columns[0]!;
  const msgs = engine.apply({
    type: "move_column",
    columnId: first.id,
    order: engine.columns.length - 1,
    expectedVersion: first.version,
    userName: "Tester",
    clientActionId: "m1",
  });
  const sorted = [...engine.columns].sort((a, b) => a.order - b.order);
  assert.equal(sorted[sorted.length - 1]?.id, first.id);
  assert.ok(msgs.some((m) => m.type === "columns_reordered"));
});

test("init_board does not wipe existing lanes or cards", () => {
  const engine = new BoardEngine();
  engine.apply({
    type: "add_column",
    title: "Backlog",
    color: "#6366F1",
    clientActionId: "col-1",
    userName: "Creator",
  });
  engine.apply({
    type: "add_card",
    title: "Ship feature",
    column: engine.columns[0]!.id,
    clientActionId: "card-1",
    userName: "Creator",
  });

  const beforeColumns = engine.columns.length;
  const beforeCards = engine.cards.length;

  engine.apply({
    type: "init_board",
    name: "Sprint 555",
    template: "blank",
  });

  assert.equal(engine.columns.length, beforeColumns);
  assert.equal(engine.cards.length, beforeCards);
  assert.equal(engine.board.initialized, true);
  assert.equal(engine.board.name, "Sprint 555");
});

console.log("\nAll board-engine tests passed.");
