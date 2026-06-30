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

console.log("\nAll board-engine tests passed.");
