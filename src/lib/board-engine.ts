import { getTemplateData } from "./templates";
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
  const { columns, cards } = getTemplateData("default");
  return {
    columns,
    cards,
    board: { name: "Untitled Board", initialized: false },
  };
}

export class BoardEngine {
  columns: BoardColumn[];
  cards: Card[];
  board: BoardMeta;

  constructor(state?: BoardState) {
    const initial = state ?? defaultBoardState();
    this.columns = initial.columns;
    this.cards = initial.cards;
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
      case "move_card":
        return this.handleMove(msg);
      case "add_card":
        return this.handleAdd(msg);
      case "update_card":
        return this.handleUpdate(msg);
      case "add_column":
        return this.handleAddColumn(msg);
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

  private handleInit(msg: Extract<ClientMessage, { type: "init_board" }>): ServerMessage[] {
    if (this.board.initialized) return [];

    const { columns, cards } = getTemplateData(msg.template as BoardTemplate);
    this.columns = columns;
    this.cards = cards;
    this.board = { name: msg.name || "Untitled Board", initialized: true };

    return [
      { type: "board_updated", board: this.board },
      this.syncMessage(),
      { type: "action_ack", clientActionId: "init", success: true },
    ];
  }

  private nextCardOrder(columnId: string): number {
    const inColumn = this.cards.filter((c) => c.column === columnId);
    if (inColumn.length === 0) return 0;
    return Math.max(...inColumn.map((c) => c.order)) + 1;
  }

  private handleMove(msg: MoveCardMessage): ServerMessage[] {
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
    const card: Card = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: msg.title,
      description: msg.description ?? "",
      column: msg.column,
      order: this.nextCardOrder(msg.column),
      priority: msg.priority ?? "medium",
      version: 1,
      updatedAt: Date.now(),
      updatedBy: msg.userName,
    };

    this.cards = [...this.cards, card];

    return [
      { type: "card_added", card, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleUpdate(msg: Extract<ClientMessage, { type: "update_card" }>): ServerMessage[] {
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

    const updated: Card = {
      ...card,
      title: msg.title ?? card.title,
      description: msg.description ?? card.description,
      priority: msg.priority ?? card.priority,
      version: card.version + 1,
      updatedAt: Date.now(),
      updatedBy: msg.userName,
    };

    this.cards = this.cards.map((c) => (c.id === card.id ? updated : c));

    return [
      { type: "card_updated", card: updated, clientActionId: msg.clientActionId },
      { type: "action_ack", clientActionId: msg.clientActionId, success: true },
    ];
  }

  private handleAddColumn(msg: Extract<ClientMessage, { type: "add_column" }>): ServerMessage[] {
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
