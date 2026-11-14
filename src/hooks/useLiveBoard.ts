"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Json, Tables } from "@/lib/database.types";
import { newer, positionAt, toCards, toColumns, type CardRow, type ColumnRow } from "@/lib/board-model";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ConnectionState, Priority, PresenceUser, Subtask } from "@/lib/types";

type BoardRow = Tables<"boards">;

export interface LiveBoardInit {
  board: BoardRow;
  columns: ColumnRow[];
  cards: CardRow[];
  /** userId → display name, for "updated by". */
  names: Record<string, string>;
  me: { id: string; name: string; color: string };
  canEdit: boolean;
}

type Action = Record<string, unknown> & { type: string };
interface Outbox {
  id: string;
  action: Action;
}

type RpcResult =
  | { status: "ok"; entity: string; row?: Record<string, unknown>; deleted?: string; replayed?: boolean }
  | { status: "conflict"; entity: string; current: Record<string, unknown> | null }
  | { status: "rejected"; reason: string };

const outboxKey = (boardId: string, userId: string) => `boardroom:outbox:${userId}:${boardId}`;

function readOutbox(key: string): Outbox[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Outbox[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(key: string, items: Outbox[]) {
  try {
    if (items.length) localStorage.setItem(key, JSON.stringify(items));
    else localStorage.removeItem(key);
  } catch {
    // Storage full or blocked: actions still sync while online.
  }
}

/** Errors that will never succeed on retry (permission, validation, missing rows). */
function isPermanent(code: string | undefined) {
  return !!code && (code.startsWith("PT4") || code.startsWith("22") || code.startsWith("23") || code === "42501");
}

/**
 * Live board state on the relational schema.
 *
 * - Edits apply optimistically, then go through `apply_board_action` (one
 *   transaction, version-checked, idempotent per action id).
 * - A conflict replaces the local copy with the server's and says who won.
 * - Network failures keep the optimistic change and queue the action in
 *   localStorage; the queue is replayed in order when connectivity returns.
 *   Replays are safe because the RPC is idempotent and new rows use
 *   client-generated ids.
 * - Postgres Changes (filtered by RLS) stream other people's edits in.
 */
export function useLiveBoard(init: LiveBoardInit) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const boardId = init.board.id;
  const key = outboxKey(boardId, init.me.id);

  const [board, setBoard] = useState(init.board);
  const [columnRows, setColumnRows] = useState(init.columns);
  const [cardRows, setCardRows] = useState(init.cards);
  const [names, setNames] = useState(init.names);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("reconnecting");
  const [pending, setPending] = useState(0);

  const colsRef = useRef(columnRows);
  const cardsRef = useRef(cardRows);
  const boardRef = useRef(board);
  useEffect(() => {
    colsRef.current = columnRows;
    cardsRef.current = cardRows;
    boardRef.current = board;
  });
  const flushing = useRef(false);

  // ── Apply server rows ──────────────────────────────────────────────────
  const upsertCard = useCallback((row: CardRow) => {
    setCardRows((prev) => {
      const i = prev.findIndex((c) => c.id === row.id);
      if (i < 0) return [...prev, row];
      const next = [...prev];
      next[i] = newer(prev[i], row);
      return next;
    });
  }, []);
  const upsertColumn = useCallback((row: ColumnRow) => {
    setColumnRows((prev) => {
      const i = prev.findIndex((c) => c.id === row.id);
      if (i < 0) return [...prev, row];
      const next = [...prev];
      next[i] = newer(prev[i], row);
      return next;
    });
  }, []);

  const applyResult = useCallback(
    (action: Action, result: RpcResult) => {
      if (result.status === "ok") {
        if (result.row && result.entity === "card") upsertCard(result.row as unknown as CardRow);
        if (result.row && result.entity === "column") upsertColumn(result.row as unknown as ColumnRow);
        if (result.row && result.entity === "board") setBoard((b) => newer(b, result.row as unknown as BoardRow));
        return;
      }
      if (result.status === "conflict") {
        const current = result.current;
        if (result.entity === "card") {
          if (current) upsertCard(current as unknown as CardRow);
          else setCardRows((p) => p.filter((c) => c.id !== action.id));
        } else if (result.entity === "column") {
          if (current) upsertColumn(current as unknown as ColumnRow);
          else setColumnRows((p) => p.filter((c) => c.id !== action.id));
        } else if (result.entity === "board" && current) {
          setBoard(current as unknown as BoardRow);
        }
        const by = current?.updated_by ? names[current.updated_by as string] : null;
        toast.error("Change not saved", {
          description: current
            ? `${by ?? "Someone"} changed this first. You're now seeing their version.`
            : "It was deleted by someone else.",
        });
        return;
      }
      toast.error("Change not saved", {
        description: result.reason === "last_column" ? "A board needs at least one lane." : "The server refused it.",
      });
    },
    [names, upsertCard, upsertColumn]
  );

  const reload = useCallback(async () => {
    const [b, c, k] = await Promise.all([
      supabase.from("boards").select("*").eq("id", boardId).maybeSingle(),
      supabase.from("board_columns").select("*").eq("board_id", boardId),
      supabase.from("cards").select("*").eq("board_id", boardId),
    ]);
    if (b.data) setBoard(b.data);
    if (c.data) setColumnRows(c.data);
    if (k.data) setCardRows(k.data);
  }, [supabase, boardId]);

  // ── Sending actions ────────────────────────────────────────────────────
  const call = useCallback(
    (id: string, action: Action) =>
      supabase.rpc("apply_board_action", { p_board: boardId, p_client_action_id: id, p_action: action as Json }),
    [supabase, boardId]
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let queue = readOutbox(key);
      setPending(queue.length);
      while (queue.length && navigator.onLine) {
        const item = queue[0]!;
        const { data, error } = await call(item.id, item.action);
        if (error && !isPermanent(error.code)) break; // still offline / server down
        if (error) {
          toast.error("An offline change couldn't be applied", { description: "The board was reloaded." });
          await reload();
        } else {
          applyResult(item.action, data as unknown as RpcResult);
        }
        queue = queue.slice(1);
        writeOutbox(key, queue);
        setPending(queue.length);
      }
    } finally {
      flushing.current = false;
    }
  }, [key, call, applyResult, reload]);

  const send = useCallback(
    async (action: Action, rollback: () => void) => {
      if (!init.canEdit) {
        rollback();
        toast.error("View only", { description: "Ask an admin for member access to edit." });
        return;
      }
      const id = crypto.randomUUID();
      const queued = readOutbox(key);
      // Preserve ordering: if anything is already queued, queue behind it.
      if (queued.length || !navigator.onLine) {
        writeOutbox(key, [...queued, { id, action }]);
        setPending(queued.length + 1);
        void flush();
        return;
      }
      const { data, error } = await call(id, action);
      if (error) {
        if (isPermanent(error.code)) {
          rollback();
          toast.error("Change not saved", {
            description: error.code === "PT403" ? "You don't have edit access." : "The server refused it.",
          });
        } else {
          writeOutbox(key, [...readOutbox(key), { id, action }]);
          setPending(readOutbox(key).length);
          toast.info("Saved offline", { description: "It will sync when you reconnect." });
        }
        return;
      }
      const result = data as unknown as RpcResult;
      if (result.status === "rejected") rollback();
      applyResult(action, result);
    },
    [init.canEdit, key, call, flush, applyResult]
  );

  // Latest callbacks for the subscription below. The subscription must not
  // depend on them directly: they change whenever presence updates `names`,
  // and re-running the effect would tear the channel down in a loop.
  const latest = useRef({ reload, flush, upsertCard, upsertColumn });
  useEffect(() => {
    latest.current = { reload, flush, upsertCard, upsertColumn };
  });
  const me = init.me;

  // ── Realtime, presence, connectivity ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const channel = supabase.channel(`board:${boardId}`, { config: { presence: { key: me.id } } });
    const filter = `board_id=eq.${boardId}`;

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "cards", filter }, (p) => {
        if (p.eventType === "DELETE") setCardRows((prev) => prev.filter((c) => c.id !== (p.old as { id: string }).id));
        else latest.current.upsertCard(p.new as CardRow);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns", filter }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as { id: string }).id;
          setColumnRows((prev) => prev.filter((c) => c.id !== id));
          setCardRows((prev) => prev.filter((c) => c.column_id !== id));
        } else latest.current.upsertColumn(p.new as ColumnRow);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "boards", filter: `id=eq.${boardId}` }, (p) =>
        setBoard((b) => newer(b, p.new as BoardRow))
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const seen = new Map<string, PresenceUser>();
        for (const entries of Object.values(state)) for (const u of entries) seen.set(u.id, u);
        setUsers([...seen.values()]);
        setNames((n) => {
          const next = { ...n };
          for (const u of seen.values()) next[u.id] = u.name;
          return next;
        });
      })
    ;

    // Postgres Changes are filtered by RLS using the subscriber's JWT, so make
    // sure Realtime has the signed-in user's token before subscribing.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnection("live");
          await channel.track(me);
          // Catch up on anything missed while disconnected, then replay the outbox.
          await latest.current.reload();
          void latest.current.flush();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("offline");
        else if (status === "CLOSED" && !cancelled) setConnection("reconnecting");
      });
    })();

    const online = () => {
      setConnection("reconnecting");
      void latest.current.flush();
    };
    const offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      void supabase.removeChannel(channel);
    };
  }, [supabase, boardId, me]);

  // ── UI-facing operations (same shape the Board component expects) ───────
  const sortedCards = (columnId: string, excluding?: string) =>
    cardsRef.current.filter((c) => c.column_id === columnId && c.id !== excluding).sort((a, b) => a.position - b.position);
  const sortedCols = (excluding?: string) =>
    colsRef.current.filter((c) => c.id !== excluding).sort((a, b) => a.position - b.position);
  const now = () => new Date().toISOString();

  const moveCard = (cardId: string, columnId: string, order: number, expectedVersion: number) => {
    const prev = cardsRef.current.find((c) => c.id === cardId);
    if (!prev) return;
    const position = positionAt(sortedCards(columnId, cardId), order);
    upsertCard({ ...prev, column_id: columnId, position, version: expectedVersion + 1, updated_by: init.me.id, updated_at: now() });
    void send({ type: "move_card", id: cardId, expectedVersion, columnId, position }, () =>
      setCardRows((p) => p.map((c) => (c.id === cardId ? prev : c)))
    );
  };

  const addCard = (data: { title: string; description?: string; priority?: Priority; storyPoints?: number | null; column: string }) => {
    const id = crypto.randomUUID();
    const siblings = sortedCards(data.column);
    const position = (siblings.at(-1)?.position ?? 0) + 1;
    const row: CardRow = {
      id,
      board_id: boardId,
      column_id: data.column,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      story_points: data.storyPoints ?? null,
      subtasks: [],
      assignee_id: null,
      position,
      version: 1,
      created_by: init.me.id,
      updated_by: init.me.id,
      created_at: now(),
      updated_at: now(),
    };
    setCardRows((p) => [...p, row]);
    void send(
      {
        type: "add_card",
        id,
        columnId: data.column,
        title: data.title,
        description: data.description ?? "",
        priority: data.priority ?? "medium",
        storyPoints: data.storyPoints ?? null,
        position,
      },
      () => setCardRows((p) => p.filter((c) => c.id !== id))
    );
  };

  const updateCard = (data: {
    cardId: string;
    title?: string;
    description?: string;
    priority?: Priority;
    storyPoints?: number | null;
    subtasks?: Subtask[];
    expectedVersion: number;
  }) => {
    const prev = cardsRef.current.find((c) => c.id === data.cardId);
    if (!prev) return;
    const patch: Action = { type: "update_card", id: data.cardId, expectedVersion: data.expectedVersion };
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.storyPoints !== undefined) patch.storyPoints = data.storyPoints;
    if (data.subtasks !== undefined) patch.subtasks = data.subtasks;
    upsertCard({
      ...prev,
      title: data.title ?? prev.title,
      description: data.description ?? prev.description,
      priority: data.priority ?? prev.priority,
      story_points: data.storyPoints !== undefined ? data.storyPoints : prev.story_points,
      subtasks: (data.subtasks as unknown as Json) ?? prev.subtasks,
      version: data.expectedVersion + 1,
      updated_by: init.me.id,
      updated_at: now(),
    });
    void send(patch, () => setCardRows((p) => p.map((c) => (c.id === prev.id ? prev : c))));
  };

  const deleteCard = (cardId: string, expectedVersion: number) => {
    const prev = cardsRef.current.find((c) => c.id === cardId);
    if (!prev) return;
    setCardRows((p) => p.filter((c) => c.id !== cardId));
    void send({ type: "delete_card", id: cardId, expectedVersion }, () => setCardRows((p) => [...p, prev]));
  };

  const addColumn = (title: string, color: string) => {
    const id = crypto.randomUUID();
    const position = (sortedCols().at(-1)?.position ?? 0) + 1;
    const row: ColumnRow = {
      id,
      board_id: boardId,
      title,
      color,
      position,
      version: 1,
      created_by: init.me.id,
      updated_by: init.me.id,
      created_at: now(),
      updated_at: now(),
    };
    setColumnRows((p) => [...p, row]);
    void send({ type: "add_column", id, title, color, position }, () => setColumnRows((p) => p.filter((c) => c.id !== id)));
  };

  const updateColumn = (data: { columnId: string; title?: string; color?: string; expectedVersion: number }) => {
    const prev = colsRef.current.find((c) => c.id === data.columnId);
    if (!prev) return;
    upsertColumn({ ...prev, title: data.title ?? prev.title, color: data.color ?? prev.color, version: data.expectedVersion + 1 });
    const patch: Action = { type: "update_column", id: data.columnId, expectedVersion: data.expectedVersion };
    if (data.title !== undefined) patch.title = data.title;
    if (data.color !== undefined) patch.color = data.color;
    void send(patch, () => setColumnRows((p) => p.map((c) => (c.id === prev.id ? prev : c))));
  };

  const moveColumn = (columnId: string, order: number, expectedVersion: number) => {
    const prev = colsRef.current.find((c) => c.id === columnId);
    if (!prev) return;
    const position = positionAt(sortedCols(columnId), order);
    upsertColumn({ ...prev, position, version: expectedVersion + 1 });
    void send({ type: "move_column", id: columnId, expectedVersion, position }, () =>
      setColumnRows((p) => p.map((c) => (c.id === prev.id ? prev : c)))
    );
  };

  const deleteColumn = (columnId: string, expectedVersion: number) => {
    const prevCols = colsRef.current;
    const prevCards = cardsRef.current;
    if (prevCols.length <= 1) {
      toast.error("Can't delete", { description: "A board needs at least one lane." });
      return;
    }
    setColumnRows((p) => p.filter((c) => c.id !== columnId));
    setCardRows((p) => p.filter((c) => c.column_id !== columnId));
    void send({ type: "delete_column", id: columnId, expectedVersion }, () => {
      setColumnRows(prevCols);
      setCardRows(prevCards);
    });
  };

  const renameBoard = (name: string) => {
    const prev = boardRef.current;
    setBoard({ ...prev, name, version: prev.version + 1 });
    void send({ type: "rename_board", name, expectedVersion: prev.version }, () => setBoard(prev));
  };

  return {
    board,
    columns: useMemo(() => toColumns(columnRows), [columnRows]),
    cards: useMemo(() => toCards(cardRows, names), [cardRows, names]),
    users,
    connection,
    pending,
    moveCard,
    addCard,
    updateCard,
    deleteCard,
    addColumn,
    updateColumn,
    moveColumn,
    deleteColumn,
    renameBoard,
  };
}
