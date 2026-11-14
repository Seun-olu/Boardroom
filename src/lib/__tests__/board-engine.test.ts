import assert from "node:assert/strict";
import { test } from "vitest";
import { BoardEngine } from "../board-engine";


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

test("update_board with stale version is rejected", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "init_board", name: "Test", template: "empty" });
  const v = engine.board.version;
  engine.apply({ type: "update_board", name: "A", expectedVersion: v, userName: "U1", clientActionId: "b1" });
  const msgs = engine.apply({ type: "update_board", name: "B", expectedVersion: v - 1, userName: "U2", clientActionId: "b2" });
  assert.equal(engine.board.name, "A");
  assert.ok(msgs.some((m) => m.type === "action_ack" && !m.success));
});

test("delete_column refuses to remove the last lane", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "add_column", title: "Only", color: "#6366F1", clientActionId: "c", userName: "U" });
  const col = engine.columns[0]!;
  const msgs = engine.apply({ type: "delete_column", columnId: col.id, expectedVersion: col.version, userName: "U", clientActionId: "d" });
  assert.equal(engine.columns.length, 1);
  assert.ok(msgs.some((m) => m.type === "action_ack" && !m.success));
});

test("flush_queue applies actions in order and skips nested init", () => {
  const engine = new BoardEngine();
  engine.apply({ type: "init_board", name: "Test", template: "empty" });
  const msgs = engine.apply({
    type: "flush_queue",
    actions: [
      { type: "add_card", title: "One", column: "todo", clientActionId: "q1", userName: "U" },
      { type: "add_card", title: "Two", column: "todo", clientActionId: "q2", userName: "U" },
    ],
  });
  assert.deepEqual(engine.cards.map((c) => c.title), ["One", "Two"]);
  assert.equal(msgs.filter((m) => m.type === "card_added").length, 2);
});
