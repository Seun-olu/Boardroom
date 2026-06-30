"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { PARTYKIT_HOST, QUEUE_STORAGE_KEY } from "@/lib/constants";
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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

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

  const sendMessage = useCallback(
    (socket: { readyState: number; send: (data: string) => void } | null, msg: ClientMessage) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
        return true;
      }
      return false;
    },
    []
  );

  const flushQueue = useCallback(
    (socket: { send: (data: string) => void }) => {
      if (queueRef.current.length === 0) return;
      const actions = queueRef.current.map((q) => q.message);
      socket.send(JSON.stringify({ type: "flush_queue", actions }));
      queueRef.current = [];
      saveQueue(roomId, []);
      updatePendingCount();
    },
    [roomId, updatePendingCount]
  );

  const initConfigRef = useRef(initConfig);
  initConfigRef.current = initConfig;
  const socketRef = useRef<{ send: (data: string) => void } | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      if (!hasSyncedRef.current) {
        setIsLoading(false);
        toast.error("Cannot reach realtime server", {
          description: "Run npm run dev (needs both Next.js and PartyKit on port 1999).",
          duration: 8000,
        });
      }
    }, 6000);
    return () => clearTimeout(timeout);
  }, [isLoading, roomId]);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    query: { name: identity.name, color: identity.color },
    onOpen() {
      clearTimeout(reconnectTimerRef.current);
      setConnectionState("live");
    },
    onClose() {
      reconnectTimerRef.current = setTimeout(() => {
        setConnectionState((prev) => (prev === "live" ? "reconnecting" : prev));
      }, 300);
    },
    onError() {
      setConnectionState("offline");
    },
    onMessage(event) {
      const msg = JSON.parse(event.data as string) as ServerMessage;

      switch (msg.type) {
        case "sync":
          setColumns(msg.columns);
          setCards(msg.cards);
          setBoard(msg.board);
          setUsers(msg.users);
          if (!hasSyncedRef.current) {
            setIsLoading(false);
            hasSyncedRef.current = true;
            const cfg = initConfigRef.current;
            if (cfg && !msg.board.initialized && !initSentRef.current && socketRef.current) {
              initSentRef.current = true;
              socketRef.current.send(
                JSON.stringify({
                  type: "init_board",
                  name: cfg.name,
                  template: cfg.template,
                })
              );
            }
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
  });

  socketRef.current = socket;

  useEffect(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      flushQueue(socket);
    }
  }, [socket, connectionState, flushQueue]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!socket) return;
      switch (socket.readyState) {
        case WebSocket.CONNECTING:
          setConnectionState("reconnecting");
          break;
        case WebSocket.OPEN:
          setConnectionState("live");
          break;
        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          setConnectionState((prev) => (prev === "offline" ? "offline" : "reconnecting"));
          break;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [socket]);

  useEffect(() => {
    const goOffline = () => setConnectionState("offline");
    const goOnline = () => {
      if (socket?.readyState !== WebSocket.OPEN) setConnectionState("reconnecting");
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [socket]);

  const enqueue = useCallback(
    (
      message: QueuedAction["message"],
      action: Omit<QueuedAction, "message">,
      activeSocket: { readyState: number; send: (data: string) => void } | null
    ) => {
      const full: QueuedAction = { ...action, message };
      const sent = sendMessage(activeSocket, message);
      if (sent) {
        pendingActionsRef.current.set(action.id, full);
      } else {
        queueRef.current.push(full);
        saveQueue(roomId, queueRef.current);
        toast.info("Saved offline", { description: "Will sync when you reconnect." });
      }
      updatePendingCount();
    },
    [roomId, sendMessage, updatePendingCount]
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

      enqueue(
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
        { id: clientActionId, previousCard, createdAt: Date.now() },
        socket
      );
    },
    [identity.name, enqueue, socket]
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

      enqueue(
        {
          type: "add_card",
          title: data.title,
          description: data.description,
          priority: data.priority,
          column: data.column,
          clientActionId,
          userName: identity.name,
        },
        { id: clientActionId, optimisticCard: optimistic, createdAt: Date.now() },
        socket
      );
    },
    [identity.name, enqueue, socket]
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

      enqueue(
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
        { id: clientActionId, previousCard, createdAt: Date.now() },
        socket
      );
    },
    [identity.name, applyCardUpdate, enqueue, socket]
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

      enqueue(
        {
          type: "add_column",
          title,
          color: colColor,
          clientActionId,
          userName: identity.name,
        },
        { id: clientActionId, optimisticColumn: optimistic, createdAt: Date.now() },
        socket
      );
    },
    [identity.name, enqueue, socket]
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
