import { NextResponse } from "next/server";
import { BoardEngine } from "@/lib/board-engine";
import { loadBoardState } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const state = await loadBoardState(params.roomId);
    const engine = new BoardEngine(state);
    return NextResponse.json(engine.syncMessage());
  } catch (err) {
    console.error("GET /api/board", err);
    return NextResponse.json(
      { error: "Failed to load board. Check Supabase env vars and schema." },
      { status: 500 }
    );
  }
}
