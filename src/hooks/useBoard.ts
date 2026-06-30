"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { QUEUE_STORAGE_KEY } from "@/lib/constants";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  BoardColumn,
  BoardMeta,
  BoardTemplate,
  Card,
  ClientMessage,
  ConnectionState,
  PresenceUser,
  Priority,
  QueuedAction,
  ServerMessage,
} from "@/lib/types";
import type { UserIdentity } from "@/lib/username";
import { pickColumnColor } from "@/lib/board-utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseBoardOptions {
  roomId: string;
  identity: UserIdentity;
  initConfig?: {
    name: string;
    template: BoardTemplate;
  } | null;
}

interface UseBoardReturn {
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;
  users: PresenceUser[];
  connectionState: ConnectionState;
  isLoading: boolean;
  moveCard: (cardId: string, column: string, order: number, expectedVersion: number) => void;
  addCard: (data: {
    title: string;
    description?: string;
    priority?: Priority;
    column: string;
  }) => void;
  updateCard: (data: {
    cardId: string;
    title?: string;
    description?: string;
    priority?: Priority;
    expectedVersion: number;
  }) => void;
  addColumn: (title: string, color?: string) => void;
  pendingCount: number;
}

function loadQueue(roomId: string): QueuedAction[] {
  try {
    const raw = localStorage.getItem(`${QUEUE_STORAGE_KEY}:${roomId}`);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(roomId: string, queue: QueuedAction[]) {
  if (queue.length === 0) {
    localStorage.removeItem(`${QUEUE_STORAGE_KEY}:${roomId}`);
  } else {
    localStorage.setItem(`${QUEUE_STORAGE_KEY}:${roomId}`, JSON.stringify(queue));
  }
}

function presenceFromState(
  state: Record<string, { id: string; name: string; color: string }[]>
): PresenceUser[] {
  const users: PresenceUser[] = [];
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      users.push(entry);
    }
  }
  return users;
}

async function postAction(roomId: string, msg: ClientMessage): Promise<ServerMessage[]> {
  const res = await fetch(`/api/board/${roomId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });

  if (!res.ok) {
    throw new Error(`Action failed (${res.status})`);
  }

  const data = (await res.json()) as { messages: ServerMessage[] };
  return data.messages ?? [];
}

export function useBoard({ roomId, identity, initConfig }: UseBoardOptions): UseBoardReturn {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [board, setBoard] = useState<BoardMeta>({ name: "Untitled Board", initialized: false });
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("reconnecting");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const cardsRef = useRef(cards);
  const columnsRef = useRef(columns);
  cardsRef.current = cards;
  columnsRef.current = columns;

  const queueRef = useRef<QueuedAction[]>(loadQueue(roomId));
  const pendingActionsRef = useRef<Map<string, QueuedAction>>(new Map());
  const hasSyncedRef = useRef(false);
  const initSentRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onlineRef = useRef(true);

  const initConfigRef = useRef(initConfig);
  initConfigRef.current = initConfig;

  const updatePendingCount = useCallback(() => {
    setPendingCount(queueRef.current.length + pendingActionsRef.current.size);
  }, []);

  const applyCardUpdate = useCallback((updated: Card) => {
    setCards((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (!exists) return [...prev, updated];
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });
  }, []);

  const rollbackAction = useCallback(
    (action: QueuedAction) => {
      if (action.previousCard) {
        applyCardUpdate(action.previousCard);
      } else if (action.optimisticCard) {
        setCards((prev) => prev.filter((c) => c.id !== action.optimisticCard!.id));
      } else if (action.optimisticColumn) {
        setColumns((prev) => prev.filter((c) => c.id !== action.optimisticColumn!.id));
      }
    },
    [applyCardUpdate]
  );

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "sync":
          setColumns(msg.columns);
          setCards(msg.cards);
          setBoard(msg.board);
          if (msg.users.length > 0) setUsers(msg.users);
          if (!hasSyncedRef.current) {
            setIsLoading(false);
            hasSyncedRef.current = true;
          }
          break;

        case "card_updated":
          applyCardUpdate(msg.card);
          if (msg.clientActionId) {
            pendingActionsRef.current.delete(msg.clientActionId);
            updatePendingCount();
          }
          break;

        case "card_added":
          applyCardUpdate(msg.card);
          if (msg.clientActionId) {
            pendingActionsRef.current.delete(msg.clientActionId);
            updatePendingCount();
          }
          break;

        case "column_added":
          setColumns((prev) => {
            if (prev.some((c) => c.id === msg.column.id)) return prev;
            return [...prev, msg.column];
          });
          if (msg.clientActionId) {
            pendingActionsRef.current.delete(msg.clientActionId);
            updatePendingCount();
          }
          break;

        case "board_updated":
          setBoard(msg.board);
          break;

        case "conflict": {
          const pending = pendingActionsRef.current.get(msg.clientActionId);
          if (pending) {
            rollbackAction(pending);
            pendingActionsRef.current.delete(msg.clientActionId);
            updatePendingCount();
          }
          applyCardUpdate(msg.card);
          toast.error("Change overwritten", {
            description: `${msg.overwrittenBy} updated this card while you were editing.`,
          });
          break;
        }

        case "presence":
          setUsers(msg.users);
          break;

        case "action_ack":
          if (!msg.success && msg.clientActionId !== "init") {
            const pending = pendingActionsRef.current.get(msg.clientActionId);
            if (pending) {
              rollbackAction(pending);
              pendingActionsRef.current.delete(msg.clientActionId);
              updatePendingCount();
            }
          }
          break;
      }
    },
    [applyCardUpdate, rollbackAction, updatePendingCount]
  );

  const maybeInitBoard = useCallback(async () => {
    const cfg = initConfigRef.current;
    if (!cfg || initSentRef.current) return;

    initSentRef.current = true;
    const messages = await postAction(roomId, {
      type: "init_board",
      name: cfg.name,
      template: cfg.template,
    });
    for (const msg of messages) handleServerMessage(msg);
  }, [roomId, handleServerMessage]);

  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || !onlineRef.current) return;

    const actions = queueRef.current.map((q) => q.message);
    queueRef.current = [];
    saveQueue(roomId, []);
    updatePendingCount();

    try {
      const messages = await postAction(roomId, { type: "flush_queue", actions });
      for (const msg of messages) handleServerMessage(msg);
    } catch {
      queueRef.current = actions.map((message, i) => ({
        id: `recovered-${i}`,
        message: message as QueuedAction["message"],
        createdAt: Date.now(),
      }));
      saveQueue(roomId, queueRef.current);
      updatePendingCount();
      toast.error("Sync failed", { description: "Some offline changes could not be sent." });
    }
  }, [roomId, handleServerMessage, updatePendingCount]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      setConnectionState("offline");
      toast.error("Supabase not configured", {
        description: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local",
        duration: 10000,
      });
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    const presenceKey = identity.id;

    const channel = supabase.channel(`board:${roomId}`, {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on("broadcast", { event: "server_message" }, ({ payload }) => {
        handleServerMessage(payload as ServerMessage);
      })
      .on("presence", { event: "sync" }, () => {
        setUsers(presenceFromState(channel.presenceState()));
      })
      .on("presence", { event: "join" }, () => {
        setUsers(presenceFromState(channel.presenceState()));
      })
      .on("presence", { event: "leave" }, () => {
        setUsers(presenceFromState(channel.presenceState()));
      });

    channel.subscribe(async (status) => {
      if (cancelled) return;

      if (status === "SUBSCRIBED") {
        setConnectionState("live");
        await channel.track({
          id: identity.id,
          name: identity.name,
          color: identity.color,
        });

        try {
          const res = await fetch(`/api/board/${roomId}`);
          if (!res.ok) throw new Error("sync failed");
          const sync = (await res.json()) as ServerMessage;
          if (sync.type === "sync") {
            handleServerMessage(sync);
            if (!sync.board.initialized) {
              await maybeInitBoard();
            }
          }
          await flushQueue();
        } catch (err) {
          setConnectionState("offline");
          const isRls =
            err instanceof Error && err.message.includes("42501");
          toast.error("Cannot reach board API", {
            description: isRls
              ? "Run supabase/fix-rls.sql in Supabase SQL Editor."
              : "Check Supabase keys in .env.local and restart npm run dev.",
            duration: 10000,
          });
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionState("offline");
      } else if (status === "CLOSED") {
        setConnectionState("reconnecting");
      }
    });

    channelRef.current = channel;

    const loadTimeout = setTimeout(() => {
      if (!hasSyncedRef.current && !cancelled) {
        setIsLoading(false);
        toast.error("Board load timed out", {
          description: "Check your Supabase setup and network connection.",
          duration: 8000,
        });
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, identity, handleServerMessage, maybeInitBoard, flushQueue]);

  useEffect(() => {
    const goOffline = () => {
      onlineRef.current = false;
      setConnectionState("offline");
    };
    const goOnline = () => {
      onlineRef.current = true;
      setConnectionState("reconnecting");
      void flushQueue();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [flushQueue]);

  const sendAction = useCallback(
    async (message: QueuedAction["message"], action: Omit<QueuedAction, "message">) => {
      const full: QueuedAction = { ...action, message };

      if (!onlineRef.current || connectionState === "offline") {
        queueRef.current.push(full);
        saveQueue(roomId, queueRef.current);
        updatePendingCount();
        toast.info("Saved offline", { description: "Will sync when you reconnect." });
        return;
      }

      pendingActionsRef.current.set(action.id, full);
      updatePendingCount();

      try {
        const messages = await postAction(roomId, message);
        for (const msg of messages) handleServerMessage(msg);
      } catch {
        pendingActionsRef.current.delete(action.id);
        rollbackAction(full);
        updatePendingCount();
        queueRef.current.push(full);
        saveQueue(roomId, queueRef.current);
        updatePendingCount();
        toast.error("Action failed", { description: "Saved to offline queue." });
      }
    },
    [
      roomId,
      connectionState,
      handleServerMessage,
      rollbackAction,
      updatePendingCount,
    ]
  );

  const moveCard = useCallback(
    (cardId: string, column: string, order: number, expectedVersion: number) => {
      const previousCard = cardsRef.current.find((c) => c.id === cardId);
      if (!previousCard) return;

      const clientActionId = nanoid();
      const optimistic: Card = {
        ...previousCard,
        column,
        order,
        version: expectedVersion + 1,
        updatedAt: Date.now(),
        updatedBy: identity.name,
      };

      setCards((prev) => {
        const without = prev.filter((c) => c.id !== cardId);
        const inColumn = without.filter((c) => c.column === column).sort((a, b) => a.order - b.order);
        inColumn.splice(order, 0, optimistic);
        const reindexed = inColumn.map((c, i) => ({ ...c, order: i }));
        const other = without.filter((c) => c.column !== column);
        return [...other, ...reindexed];
      });

      void sendAction(
        {
          type: "move_card",
          cardId,
          column,
          order,
          expectedVersion,
          timestamp: Date.now(),
          userName: identity.name,
          clientActionId,
        },
        { id: clientActionId, previousCard, createdAt: Date.now() }
      );
    },
    [identity.name, sendAction]
  );

  const addCard = useCallback(
    (data: { title: string; description?: string; priority?: Priority; column: string }) => {
      const clientActionId = nanoid();
      const optimistic: Card = {
        id: `temp-${clientActionId}`,
        title: data.title,
        description: data.description ?? "",
        column: data.column,
        order: cardsRef.current.filter((c) => c.column === data.column).length,
        priority: data.priority ?? "medium",
        version: 0,
        updatedAt: Date.now(),
        updatedBy: identity.name,
      };

      setCards((prev) => [...prev, optimistic]);

      void sendAction(
        {
          type: "add_card",
          title: data.title,
          description: data.description,
          priority: data.priority,
          column: data.column,
          clientActionId,
          userName: identity.name,
        },
        { id: clientActionId, optimisticCard: optimistic, createdAt: Date.now() }
      );
    },
    [identity.name, sendAction]
  );

  const updateCard = useCallback(
    (data: {
      cardId: string;
      title?: string;
      description?: string;
      priority?: Priority;
      expectedVersion: number;
    }) => {
      const previousCard = cardsRef.current.find((c) => c.id === data.cardId);
      if (!previousCard) return;

      const clientActionId = nanoid();
      const optimistic: Card = {
        ...previousCard,
        title: data.title ?? previousCard.title,
        description: data.description ?? previousCard.description,
        priority: data.priority ?? previousCard.priority,
        version: data.expectedVersion + 1,
        updatedAt: Date.now(),
        updatedBy: identity.name,
      };

      applyCardUpdate(optimistic);

      void sendAction(
        {
          type: "update_card",
          cardId: data.cardId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          expectedVersion: data.expectedVersion,
          userName: identity.name,
          clientActionId,
        },
        { id: clientActionId, previousCard, createdAt: Date.now() }
      );
    },
    [identity.name, applyCardUpdate, sendAction]
  );

  const addColumn = useCallback(
    (title: string, color?: string) => {
      const clientActionId = nanoid();
      const colColor = color ?? pickColumnColor(columnsRef.current.length);
      const optimistic: BoardColumn = {
        id: `temp-col-${clientActionId}`,
        title,
        color: colColor,
        order: columnsRef.current.length,
        version: 0,
      };

      setColumns((prev) => [...prev, optimistic]);

      void sendAction(
        {
          type: "add_column",
          title,
          color: colColor,
          clientActionId,
          userName: identity.name,
        },
        { id: clientActionId, optimisticColumn: optimistic, createdAt: Date.now() }
      );
    },
    [identity.name, sendAction]
  );

  return {
    columns,
    cards,
    board,
    users,
    connectionState,
    isLoading,
    moveCard,
    addCard,
    updateCard,
    addColumn,
    pendingCount,
  };
}
