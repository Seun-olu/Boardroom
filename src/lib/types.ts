export type Priority = "low" | "medium" | "high" | "urgent";
export type BoardTemplate = "blank" | "default" | "empty" | "software";

export interface BoardColumn {
  id: string;
  title: string;
  order: number;
  color: string;
  version: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  column: string;
  order: number;
  priority: Priority;
  storyPoints: number | null;
  subtasks: Subtask[];
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface BoardMeta {
  name: string;
  initialized: boolean;
  version: number;
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
  storyPoints?: number | null;
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
  storyPoints?: number | null;
  subtasks?: Subtask[];
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

export interface UpdateBoardMessage {
  type: "update_board";
  name: string;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface MoveColumnMessage {
  type: "move_column";
  columnId: string;
  order: number;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface DeleteCardMessage {
  type: "delete_card";
  cardId: string;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface DeleteColumnMessage {
  type: "delete_column";
  columnId: string;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface UpdateColumnMessage {
  type: "update_column";
  columnId: string;
  title?: string;
  color?: string;
  expectedVersion: number;
  userName: string;
  clientActionId: string;
}

export interface FlushQueueMessage {
  type: "flush_queue";
  actions: ClientMessage[];
}

export type ClientMessage =
  | InitBoardMessage
  | UpdateBoardMessage
  | MoveCardMessage
  | AddCardMessage
  | UpdateCardMessage
  | AddColumnMessage
  | DeleteCardMessage
  | DeleteColumnMessage
  | UpdateColumnMessage
  | MoveColumnMessage
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
  clientActionId?: string;
}

export interface CardDeletedMessage {
  type: "card_deleted";
  cardId: string;
  clientActionId?: string;
}

export interface ColumnDeletedMessage {
  type: "column_deleted";
  columnId: string;
  clientActionId?: string;
}

export interface ColumnUpdatedMessage {
  type: "column_updated";
  column: BoardColumn;
  clientActionId?: string;
}

export interface ColumnsReorderedMessage {
  type: "columns_reordered";
  columns: BoardColumn[];
  clientActionId?: string;
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
  | ColumnUpdatedMessage
  | ColumnsReorderedMessage
  | ColumnDeletedMessage
  | CardDeletedMessage
  | BoardUpdatedMessage
  | ConflictMessage
  | PresenceMessage
  | ActionAckMessage;

export interface QueuedAction {
  id: string;
  message: Exclude<ClientMessage, InitBoardMessage | FlushQueueMessage>;
  optimisticCard?: Card;
  optimisticColumn?: BoardColumn;
  previousColumn?: BoardColumn;
  previousBoard?: BoardMeta;
  previousCard?: Card;
  previousColumns?: BoardColumn[];
  previousCards?: Card[];
  createdAt: number;
}
