export type Priority = "low" | "medium" | "high" | "urgent";
export type BoardTemplate = "default" | "empty" | "software";

export interface BoardColumn {
  id: string;
  title: string;
  order: number;
  color: string;
  version: number;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  column: string;
  order: number;
  priority: Priority;
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface BoardMeta {
  name: string;
  initialized: boolean;
}

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

export type ConnectionState = "live" | "reconnecting" | "offline";

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; dot: string }
> = {
  low: { label: "Low", color: "#71717A", dot: "bg-zinc-500" },
  medium: { label: "Medium", color: "#3B82F6", dot: "bg-blue-500" },
  high: { label: "High", color: "#F59E0B", dot: "bg-amber-500" },
  urgent: { label: "Urgent", color: "#EF4444", dot: "bg-red-500" },
};

export const COLUMN_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#22D3EE",
  "#10B981",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#A855F7",
  "#EC4899",
];

// ── Client → Server ──────────────────────────────────────────

export interface InitBoardMessage {
  type: "init_board";
  name: string;
  template: BoardTemplate;
}

export interface MoveCardMessage {
  type: "move_card";
  cardId: string;
  column: string;
  order: number;
  expectedVersion: number;
  timestamp: number;
  userName: string;
  clientActionId: string;
}

export interface AddCardMessage {
  type: "add_card";
  title: string;
  description?: string;
  priority?: Priority;
  column: string;
  clientActionId: string;
  userName: string;
}

export interface UpdateCardMessage {
  type: "update_card";
  cardId: string;
  title?: string;
  description?: string;
  priority?: Priority;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface AddColumnMessage {
  type: "add_column";
  title: string;
  color: string;
  clientActionId: string;
  userName: string;
}

export interface FlushQueueMessage {
  type: "flush_queue";
  actions: ClientMessage[];
}

export type ClientMessage =
  | InitBoardMessage
  | MoveCardMessage
  | AddCardMessage
  | UpdateCardMessage
  | AddColumnMessage
  | FlushQueueMessage;

// ── Server → Client ──────────────────────────────────────────

export interface SyncMessage {
  type: "sync";
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;
  users: PresenceUser[];
}

export interface CardUpdatedMessage {
  type: "card_updated";
  card: Card;
  clientActionId?: string;
}

export interface CardAddedMessage {
  type: "card_added";
  card: Card;
  clientActionId?: string;
}

export interface ColumnAddedMessage {
  type: "column_added";
  column: BoardColumn;
  clientActionId?: string;
}

export interface BoardUpdatedMessage {
  type: "board_updated";
  board: BoardMeta;
}

export interface ConflictMessage {
  type: "conflict";
  cardId: string;
  card: Card;
  clientActionId: string;
  overwrittenBy: string;
}

export interface PresenceMessage {
  type: "presence";
  users: PresenceUser[];
}

export interface ActionAckMessage {
  type: "action_ack";
  clientActionId: string;
  success: boolean;
}

export type ServerMessage =
  | SyncMessage
  | CardUpdatedMessage
  | CardAddedMessage
  | ColumnAddedMessage
  | BoardUpdatedMessage
  | ConflictMessage
  | PresenceMessage
  | ActionAckMessage;

export interface QueuedAction {
  id: string;
  message: Exclude<ClientMessage, InitBoardMessage | FlushQueueMessage>;
  optimisticCard?: Card;
  optimisticColumn?: BoardColumn;
  previousCard?: Card;
  createdAt: number;
}
