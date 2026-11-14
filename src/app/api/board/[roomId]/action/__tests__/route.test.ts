import { beforeEach, describe, expect, test, vi } from "vitest";
import { defaultBoardState } from "@/lib/board-engine";

const db = vi.hoisted(() => ({
  loadBoardState: vi.fn(),
  saveBoardState: vi.fn(),
  broadcastBoardMessages: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => db);

const { POST } = await import("../route");

function call(roomId: string, body: unknown) {
  const request = new Request(`http://localhost/api/board/${roomId}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ roomId }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.loadBoardState.mockResolvedValue(defaultBoardState());
  db.saveBoardState.mockResolvedValue(undefined);
  db.broadcastBoardMessages.mockResolvedValue(undefined);
});

describe("POST /api/board/[roomId]/action", () => {
  test("rejects an invalid room id without touching the database", async () => {
    const res = await call("../../etc", { type: "init_board", name: "x", template: "blank" });
    expect(res.status).toBe(400);
    expect(db.loadBoardState).not.toHaveBeenCalled();
  });

  test("rejects malformed bodies without touching the database", async () => {
    const res = await call("board-abc123", { type: "move_card", cardId: 1 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid action");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(db.loadBoardState).not.toHaveBeenCalled();
  });

  test("applies a valid action, persists, and broadcasts", async () => {
    const res = await call("board-abc123", {
      type: "init_board",
      name: "Sprint",
      template: "empty",
    });
    expect(res.status).toBe(200);
    expect(db.saveBoardState).toHaveBeenCalledOnce();
    const [, saved] = db.saveBoardState.mock.calls[0]!;
    expect(saved.board.name).toBe("Sprint");
    expect(db.broadcastBoardMessages).toHaveBeenCalledOnce();
  });

  test("does not persist when an action fails (unknown card)", async () => {
    const res = await call("board-abc123", {
      type: "delete_card",
      cardId: "missing",
      expectedVersion: 1,
      userName: "U",
      clientActionId: "a",
    });
    expect(res.status).toBe(200);
    expect(db.saveBoardState).not.toHaveBeenCalled();
  });

  test("hides internal database errors from the client", async () => {
    db.loadBoardState.mockRejectedValue(Object.assign(new Error("relation boards secret"), { code: "42501" }));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call("board-abc123", { type: "init_board", name: "x", template: "blank" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to apply action" });
    spy.mockRestore();
  });
});
