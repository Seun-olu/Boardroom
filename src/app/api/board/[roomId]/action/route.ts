import { NextResponse } from "next/server";
import { BoardEngine } from "@/lib/board-engine";
import {
  broadcastBoardMessages,
  loadBoardState,
  saveBoardState,
} from "@/lib/supabase/server";
import type { ClientMessage, ServerMessage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  let msg: ClientMessage;
  try {
    msg = (await request.json()) as ClientMessage;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const state = await loadBoardState(params.roomId);
    const engine = new BoardEngine(state);
    const messages = engine.apply(msg);

    if (messages.length === 0 && msg.type !== "flush_queue") {
      return NextResponse.json({ messages: [] satisfies ServerMessage[] });
    }

    const mutatesState = messages.some(
      (m) =>
        m.type === "card_updated" ||
        m.type === "card_added" ||
        m.type === "card_deleted" ||
        m.type === "column_added" ||
        m.type === "column_updated" ||
        m.type === "column_deleted" ||
        m.type === "columns_reordered" ||
        m.type === "board_updated" ||
        (m.type === "sync" && msg.type === "init_board")
    );

    if (mutatesState) {
      await saveBoardState(params.roomId, engine.toState());
    }

    const broadcast = messages.filter(
      (m) => m.type !== "action_ack" && m.type !== "conflict"
    );

    if (broadcast.length > 0) {
      await broadcastBoardMessages(params.roomId, broadcast);
    }

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("POST /api/board/action", err);
    const message =
      err && typeof err === "object" && "code" in err && err.code === "42501"
        ? "Database blocked the write (RLS). Run supabase/fix-rls.sql in Supabase SQL Editor, and use the service_role key (not anon) in .env.local."
        : "Failed to apply action. Check Supabase env vars and schema.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
