import { NextResponse } from "next/server";
import { BoardEngine } from "@/lib/board-engine";
import {
  broadcastBoardMessages,
  loadBoardState,
  saveBoardState,
} from "@/lib/supabase/server";
import { parseClientMessage, parseRoomId } from "@/lib/validation";
import type { ServerMessage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_MUTATING: ReadonlySet<ServerMessage["type"]> = new Set([
  "card_updated",
  "card_added",
  "card_deleted",
  "column_added",
  "column_updated",
  "column_deleted",
  "columns_reordered",
  "board_updated",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  // Validate everything before touching the database.
  const room = parseRoomId((await params).roomId);
  if (!room.ok) {
    return NextResponse.json({ error: room.error }, { status: room.status });
  }

  const parsed = await parseClientMessage(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, issues: parsed.issues },
      { status: parsed.status }
    );
  }
  const msg = parsed.data;
  const roomId = room.data;

  try {
    const state = await loadBoardState(roomId);
    const engine = new BoardEngine(state);
    const messages = engine.apply(msg);

    if (messages.length === 0) {
      return NextResponse.json({ messages: [] satisfies ServerMessage[] });
    }

    const mutatesState = messages.some(
      (m) => STATE_MUTATING.has(m.type) || (m.type === "sync" && msg.type === "init_board")
    );

    if (mutatesState) {
      await saveBoardState(roomId, engine.toState());
    }

    const broadcast = messages.filter(
      (m) => m.type !== "action_ack" && m.type !== "conflict"
    );

    if (broadcast.length > 0) {
      await broadcastBoardMessages(roomId, broadcast);
    }

    return NextResponse.json({ messages });
  } catch (err) {
    // Log server-side only; never echo database errors to the client.
    console.error("POST /api/board/action", err);
    return NextResponse.json({ error: "Failed to apply action" }, { status: 500 });
  }
}
