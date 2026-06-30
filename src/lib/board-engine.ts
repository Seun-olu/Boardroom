import { getTemplateData } from "./templates";
import { normalizeCard, normalizeCards } from "./story-points";
import type {
  BoardColumn,
  BoardMeta,
  BoardTemplate,
  Card,
  ClientMessage,
  MoveCardMessage,
  ServerMessage,
} from "./types";

export interface BoardState {
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;
}

export function defaultBoardState(): BoardState {
  const { columns, cards } = getTemplateData("blank");
  return {
    columns,
    cards,
    board: { name: "Untitled Board", initialized: false, version: 1 },
  };
}

export class BoardEngine {
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;

  constructor(state?: BoardState) {
    const initial = state ?? defaultBoardState();
    this.columns = initial.columns;
    this.cards = normalizeCards(initial.cards);
    this.board = initial.board;
  }

  toState(): BoardState {
    return {
      columns: this.columns,
      cards: this.cards,
      board: this.board,
    };
  }

  syncMessage(users: { id: string; name: string; color: string }[] = []): ServerMessage {
    return {
      type: "sync",
      columns: this.columns,
      cards: this.cards,
      board: this.board,
      users,
    };
  }

  apply(msg: ClientMessage): ServerMessage[] {
    switch (msg.type) {
      case "init_board":
        return this.handleInit(msg);
      case "update_board":
        return this.handleUpdateBoard(msg);
      case "move_card":
        return this.handleMove(msg);
      case "add_card":
        return this.handleAdd(msg);
      case "update_card":
        return this.handleUpdate(msg);
      case "add_column":
        return this.handleAddColumn(msg);
      case "delete_card":
        return this.handleDeleteCard(msg);
      case "delete_column":
        return this.handleDeleteColumn(msg);
      case "update_column":
        return this.handleUpdateColumn(msg);
      case "move_column":
        return this.handleMoveColumn(msg);
      case "flush_queue": {
        const out: ServerMessage[] = [];
        for (const action of msg.actions) {
          if (action.type === "init_board" || action.type === "flush_queue") continue;
          out.push(...this.apply(action));
        }
        return out;
      }
      default:
        return [];
    }
  }

  private ensureInitialized(): void {
    if (!this.board.initialized) {
      this.board = { ...this.board, initialized: true };
    }
  }

  private handleInit(msg: Extract<ClientMessage, { type: "init_board" }>): ServerMessage[] {
    const requestedName = msg.name?.trim();

    if (this.board.initialized) {
      if (
        requestedName &&
        requestedName !== "Untitled Board" &&
        this.board.name === "Untitled Board"
      ) {
        this.board = { ...this.board, name: requestedName };
        return [
          { type: "board_updated", board: this.board },
          this.syncMessage(),
          { type: "action_ack", clientActionId: "init", success: true },
        ];
      }
      return [];
    }

    // Board already has lanes/cards (e.g. creator added them before init completed).
    // Never wipe existing work when another tab joins with ?fresh=1.
    if (this.columns.length > 0 || this.cards.length > 0) {
      const name = requestedName || this.board.name;
      this.board = { ...this.board, name, initialized: true };
      return [
        { type: "board_updated", board: this.board },
        this.syncMessage(),
        { type: "action_ack", clientActionId: "init", success: true },
      ];
    }

    const { columns, cards } = getTemplateData(msg.template as BoardTemplate);
    this.columns = columns;
    this.cards = cards;
    this.board = { name: requestedName || "Untitled Board", initialized: true, version: 1 };

    return [
      { type: "board_updated", board: this.board },
      this.syncMessage(),
      { type: "action_ack", clientActionId: "init", success: true },
    ];
  }

  private handleUpdateBoard(
    msg: Extract<ClientMessage, { type: "update_board" }>
  ): ServerMessage[] {
    const trimmed = msg.name.trim();
    if (!trimmed) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (this.board.version > msg.expectedVersion) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    this.board = {
      ...this.board,
      name: trimmed,
      version: this.board.version + 1,
    };

    return [
      { type: "board_updated", board: this.board, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private nextCardOrder(columnId: string): number {
    const inColumn = this.cards.filter((c) => c.column === columnId);
    if (inColumn.length === 0) return 0;
    return Math.max(...inColumn.map((c) => c.order)) + 1;
  }

  private handleMove(msg: MoveCardMessage): ServerMessage[] {
    this.ensureInitialized();
    const card = this.cards.find((c) => c.id === msg.cardId);
    if (!card) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (card.version > msg.expectedVersion) {
      return [
        {
          type: "conflict",
          cardId: msg.cardId,
          card,
          clientActionId: msg.clientActionId,
          overwrittenBy: card.updatedBy,
        },
        { type: "card_updated", card },
      ];
    }

    const updated: Card = {
      ...card,
      column: msg.column,
      order: msg.order,
      version: card.version + 1,
      updatedAt: msg.timestamp,
      updatedBy: msg.userName,
    };

    this.cards = this.reorderCards(this.cards, updated);

    return [
      { type: "card_updated", card: updated, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleAdd(msg: Extract<ClientMessage, { type: "add_card" }>): ServerMessage[] {
    this.ensureInitialized();
    const card: Card = normalizeCard({
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: msg.title,
      description: msg.description ?? "",
      column: msg.column,
      order: this.nextCardOrder(msg.column),
      priority: msg.priority ?? "medium",
      storyPoints: msg.storyPoints ?? null,
      subtasks: [],
      version: 1,
      updatedAt: Date.now(),
      updatedBy: msg.userName,
    });

    this.cards = [...this.cards, card];

    return [
      { type: "card_added", card, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleUpdate(msg: Extract<ClientMessage, { type: "update_card" }>): ServerMessage[] {
    this.ensureInitialized();
    const card = this.cards.find((c) => c.id === msg.cardId);
    if (!card) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (card.version > msg.expectedVersion) {
      return [
        {
          type: "conflict",
          cardId: msg.cardId,
          card,
          clientActionId: msg.clientActionId,
          overwrittenBy: card.updatedBy,
        },
      ];
    }

    const updated: Card = normalizeCard({
      ...card,
      title: msg.title ?? card.title,
      description: msg.description ?? card.description,
      priority: msg.priority ?? card.priority,
      storyPoints: msg.storyPoints !== undefined ? msg.storyPoints : card.storyPoints,
      subtasks: msg.subtasks !== undefined ? msg.subtasks : card.subtasks,
      version: card.version + 1,
      updatedAt: Date.now(),
      updatedBy: msg.userName,
    });

    this.cards = this.cards.map((c) => (c.id === card.id ? updated : c));

    return [
      { type: "card_updated", card: updated, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleAddColumn(msg: Extract<ClientMessage, { type: "add_column" }>): ServerMessage[] {
    this.ensureInitialized();
    const column: BoardColumn = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: msg.title,
      color: msg.color,
      order: this.columns.length,
      version: 1,
    };

    this.columns = [...this.columns, column];

    return [
      { type: "column_added", column, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleDeleteCard(
    msg: Extract<ClientMessage, { type: "delete_card" }>
  ): ServerMessage[] {
    const card = this.cards.find((c) => c.id === msg.cardId);
    if (!card) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (card.version > msg.expectedVersion) {
      return [
        {
          type: "conflict",
          cardId: msg.cardId,
          card,
          clientActionId: msg.clientActionId,
          overwrittenBy: card.updatedBy,
        },
      ];
    }

    this.cards = this.cards.filter((c) => c.id !== msg.cardId);

    return [
      { type: "card_deleted", cardId: msg.cardId, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleDeleteColumn(
    msg: Extract<ClientMessage, { type: "delete_column" }>
  ): ServerMessage[] {
    const column = this.columns.find((c) => c.id === msg.columnId);
    if (!column) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (this.columns.length <= 1) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (column.version > msg.expectedVersion) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    this.columns = this.columns
      .filter((c) => c.id !== msg.columnId)
      .map((c, i) => ({ ...c, order: i }));
    this.cards = this.cards.filter((c) => c.column !== msg.columnId);

    return [
      { type: "column_deleted", columnId: msg.columnId, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleUpdateColumn(
    msg: Extract<ClientMessage, { type: "update_column" }>
  ): ServerMessage[] {
    const column = this.columns.find((c) => c.id === msg.columnId);
    if (!column) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (column.version > msg.expectedVersion) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    const updated: BoardColumn = {
      ...column,
      title: msg.title ?? column.title,
      color: msg.color ?? column.color,
      version: column.version + 1,
    };

    this.columns = this.columns.map((c) => (c.id === column.id ? updated : c));

    return [
      { type: "column_updated", column: updated, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleMoveColumn(
    msg: Extract<ClientMessage, { type: "move_column" }>
  ): ServerMessage[] {
    const column = this.columns.find((c) => c.id === msg.columnId);
    if (!column) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    if (column.version > msg.expectedVersion) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    const sorted = [...this.columns].sort((a, b) => a.order - b.order);
    const fromIndex = sorted.findIndex((c) => c.id === msg.columnId);
    if (fromIndex < 0) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: false }];
    }

    const targetOrder = Math.max(0, Math.min(msg.order, sorted.length - 1));
    if (fromIndex === targetOrder) {
      return [{ type: "action_ack", clientActionId: msg.clientActionId, success: true }];
    }

    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(targetOrder, 0, moved!);

    this.columns = sorted.map((c, i) =>
      c.id === msg.columnId
        ? { ...c, order: i, version: column.version + 1 }
        : { ...c, order: i }
    );

    return [
      {
        type: "columns_reordered",
        columns: this.columns,
        clientActionId: msg.clientActionId,
      },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private reorderCards(cards: Card[], moved: Card): Card[] {
    const without = cards.filter((c) => c.id !== moved.id);
    const inColumn = without
      .filter((c) => c.column === moved.column)
      .sort((a, b) => a.order - b.order);

    inColumn.splice(moved.order, 0, moved);
    const reindexed = inColumn.map((c, i) => ({ ...c, order: i }));
    const other = without.filter((c) => c.column !== moved.column);
    return [...other, ...reindexed];
  }
}
