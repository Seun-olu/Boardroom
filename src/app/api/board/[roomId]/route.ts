import { NextResponse } from "next/server";
import { BoardEngine } from "@/lib/board-engine";
import { loadBoardState } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const state = await loadBoardState(params.roomId);
    const engine = new BoardEngine(state);
    return NextResponse.json(engine.syncMessage(), { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("GET /api/board", err);
    return NextResponse.json(
      { error: "Failed to load board. Check Supabase env vars and schema." },
      { status: 500 }
    );
  }
}
