import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BoardState } from "@/lib/board-engine";
import { defaultBoardState } from "@/lib/board-engine";
import type { BoardMeta, BoardColumn, Card } from "@/lib/types";
import {
  getPublishableKey,
  getSecretKey,
  getSupabaseUrl,
  validateSecretKey,
} from "./env";

export interface BoardRow {
  id: string;
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;
  updated_at: string;
}

function getAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSecretKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  validateSecretKey(key, getPublishableKey());

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadBoardState(roomId: string): Promise<BoardState> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("boards")
    .select("columns, cards, board")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return defaultBoardState();

  return {
    columns: data.columns as BoardColumn[],
    cards: data.cards as Card[],
    board: data.board as BoardMeta,
  };
}

export async function saveBoardState(roomId: string, state: BoardState): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("boards").upsert({
    id: roomId,
    columns: state.columns,
    cards: state.cards,
    board: state.board,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function broadcastBoardMessages(
  roomId: string,
  messages: unknown[]
): Promise<void> {
  if (messages.length === 0) return;

  const supabase = getAdminClient();
  const channel = supabase.channel(`board:${roomId}`, {
    config: { broadcast: { self: false } },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime subscribe timeout")), 8000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`Realtime channel ${status}`));
      }
    });
  });

  for (const payload of messages) {
    await channel.send({
      type: "broadcast",
      event: "server_message",
      payload,
    });
  }

  await supabase.removeChannel(channel);
}
