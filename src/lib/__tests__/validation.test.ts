import { describe, expect, test } from "vitest";
import { LIMITS, clientMessageSchema, parseClientMessage, parseRoomId } from "../validation";

function req(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/board/x/action", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

const validMove = {
  type: "move_card",
  cardId: "card-1",
  column: "todo",
  order: 0,
  expectedVersion: 1,
  timestamp: 1_700_000_000_000,
  userName: "Ada",
  clientActionId: "abc123",
};

describe("parseRoomId", () => {
  test.each(["sprint-223-efb36f", "board-a1b2c3", "x"])("accepts %s", (id) => {
    expect(parseRoomId(id).ok).toBe(true);
  });
  test.each(["", "Sprint", "a/b", "../etc", "a--b", "-a", "a".repeat(65), "a b"])(
    "rejects %j",
    (id) => {
      expect(parseRoomId(id).ok).toBe(false);
    }
  );
});

describe("clientMessageSchema", () => {
  test("accepts a valid move", () => {
    expect(clientMessageSchema.safeParse(validMove).success).toBe(true);
  });

  test("rejects unknown action types", () => {
    expect(clientMessageSchema.safeParse({ type: "drop_table" }).success).toBe(false);
  });

  test("rejects unknown keys (strict objects)", () => {
    expect(clientMessageSchema.safeParse({ ...validMove, admin: true }).success).toBe(false);
  });

  test("rejects wrong types and negative numbers", () => {
    expect(clientMessageSchema.safeParse({ ...validMove, order: "0" }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ ...validMove, expectedVersion: -1 }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ ...validMove, order: 1.5 }).success).toBe(false);
  });

  test("rejects empty / whitespace titles and oversized descriptions", () => {
    const base = { type: "add_card", column: "todo", clientActionId: "a", userName: "U" };
    expect(clientMessageSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
    expect(
      clientMessageSchema.safeParse({
        ...base,
        title: "ok",
        description: "x".repeat(LIMITS.description + 1),
      }).success
    ).toBe(false);
  });

  test("rejects invalid colors (prevents CSS injection into style attributes)", () => {
    const msg = { type: "add_column", title: "Lane", clientActionId: "a", userName: "U" };
    expect(clientMessageSchema.safeParse({ ...msg, color: "#10B981" }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ ...msg, color: "red;background:url(x)" }).success).toBe(false);
  });

  test("caps subtasks and flush queue size", () => {
    const subtasks = Array.from({ length: LIMITS.subtasks + 1 }, (_, i) => ({
      id: `s${i}`,
      title: "t",
      done: false,
    }));
    expect(
      clientMessageSchema.safeParse({
        type: "update_card",
        cardId: "c1",
        subtasks,
        expectedVersion: 1,
        userName: "U",
        clientActionId: "a",
      }).success
    ).toBe(false);

    const actions = Array.from({ length: LIMITS.flushQueue + 1 }, () => validMove);
    expect(clientMessageSchema.safeParse({ type: "flush_queue", actions }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ type: "flush_queue", actions: [validMove] }).success).toBe(true);
  });

  test("forbids init_board and nested flush inside flush_queue", () => {
    const init = { type: "init_board", name: "x", template: "blank" };
    expect(clientMessageSchema.safeParse({ type: "flush_queue", actions: [init] }).success).toBe(false);
    const nested = { type: "flush_queue", actions: [validMove] };
    expect(clientMessageSchema.safeParse({ type: "flush_queue", actions: [nested] }).success).toBe(false);
  });
});

describe("parseClientMessage", () => {
  test("parses a valid body", async () => {
    const result = await parseClientMessage(req(JSON.stringify(validMove)));
    expect(result).toEqual({ ok: true, data: validMove });
  });

  test("400 on malformed JSON", async () => {
    const result = await parseClientMessage(req("{nope"));
    expect(result).toMatchObject({ ok: false, status: 400, error: "Invalid JSON" });
  });

  test("400 with issue list on schema failure", async () => {
    const result = await parseClientMessage(req(JSON.stringify({ ...validMove, order: -5 })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.issues?.[0]).toMatch(/^order:/);
    }
  });

  test("413 when declared content-length exceeds the limit", async () => {
    const result = await parseClientMessage(
      req("{}", { "content-length": String(LIMITS.bodyBytes + 1) })
    );
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  test("413 when actual body exceeds the limit", async () => {
    const big = JSON.stringify({ ...validMove, userName: "x".repeat(LIMITS.bodyBytes) });
    const result = await parseClientMessage(req(big));
    expect(result).toMatchObject({ ok: false, status: 413 });
  });
});
