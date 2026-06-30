import type * as Party from "partykit/server";
import { getTemplateData } from "../src/lib/templates";
import type {
  BoardColumn,
  BoardMeta,
  Card,
  ClientMessage,
  MoveCardMessage,
  PresenceUser,
  BoardTemplate,
} from "../src/lib/types";

export default class BoardServer implements Party.Server {
  columns: BoardColumn[] = [];
  cards: Card[] = [];
  board: BoardMeta = { name: "Untitled Board", initialized: false };
  users = new Map<string, PresenceUser>();

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<{
      columns: BoardColumn[];
      cards: Card[];
      board: BoardMeta;
    }>("state");

    if (stored) {
      this.columns = stored.columns;
      this.cards = stored.cards;
      this.board = stored.board;
    } else {
      const { columns, cards } = getTemplateData("default");
      this.columns = columns;
      this.cards = cards;
      this.board = { name: "Untitled Board", initialized: false };
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const name = url.searchParams.get("name") ?? "Anonymous";
    const color = url.searchParams.get("color") ?? "#6366F1";

    this.users.set(conn.id, { id: conn.id, name, color });
    this.sendSync(conn);
    this.broadcastPresence();
  }

  onClose(conn: Party.Connection) {
    this.users.delete(conn.id);
    this.broadcastPresence();
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "init_board":
        await this.handleInit(msg, sender);
        break;
      case "move_card":
        await this.handleMove(msg, sender);
        break;
      case "add_card":
        await this.handleAdd(msg, sender);
        break;
      case "update_card":
        await this.handleUpdate(msg, sender);
        break;
      case "add_column":
        await this.handleAddColumn(msg, sender);
        break;
      case "flush_queue":
        for (const action of msg.actions) {
          if (action.type === "init_board" || action.type === "flush_queue") continue;
          await this.dispatch(action, sender);
        }
        break;
    }
  }

  private async dispatch(
    msg: Exclude<ClientMessage, { type: "flush_queue" } | { type: "init_board" }>,
    sender: Party.Connection
  ) {
    switch (msg.type) {
      case "move_card":
        await this.handleMove(msg, sender);
        break;
      case "add_card":
        await this.handleAdd(msg, sender);
        break;
      case "update_card":
        await this.handleUpdate(msg, sender);
        break;
      case "add_column":
        await this.handleAddColumn(msg, sender);
        break;
    }
  }

  private sendSync(conn: Party.Connection) {
    conn.send(
      JSON.stringify({
        type: "sync",
        columns: this.columns,
        cards: this.cards,
        board: this.board,
        users: Array.from(this.users.values()),
      })
    );
  }

  private broadcastPresence() {
    this.room.broadcast(
      JSON.stringify({
        type: "presence",
        users: Array.from(this.users.values()),
      })
    );
  }

  private async persist() {
    await this.room.storage.put("state", {
      columns: this.columns,
      cards: this.cards,
      board: this.board,
    });
  }

  private async handleInit(
    msg: Extract<ClientMessage, { type: "init_board" }>,
    sender: Party.Connection
  ) {
    if (this.board.initialized) return;

    const { columns, cards } = getTemplateData(msg.template as BoardTemplate);
    this.columns = columns;
    this.cards = cards;
    this.board = { name: msg.name || "Untitled Board", initialized: true };
    await this.persist();

    this.room.broadcast(
      JSON.stringify({ type: "board_updated", board: this.board })
    );
    this.room.broadcast(JSON.stringify({ type: "sync", columns: this.columns, cards: this.cards, board: this.board, users: Array.from(this.users.values()) }));
    sender.send(JSON.stringify({ type: "action_ack", clientActionId: "init", success: true }));
  }

  private nextCardOrder(columnId: string): number {
    const inColumn = this.cards.filter((c) => c.column === columnId);
    if (inColumn.length === 0) return 0;
    return Math.max(...inColumn.map((c) => c.order)) + 1;
  }

  private async handleMove(msg: MoveCardMessage, sender: Party.Connection) {
    const card = this.cards.find((c) => c.id === msg.cardId);
    if (!card) {
      sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: false }));
      return;
    }

    if (card.version > msg.expectedVersion) {
      sender.send(
        JSON.stringify({
          type: "conflict",
          cardId: msg.cardId,
          card,
          clientActionId: msg.clientActionId,
          overwrittenBy: card.updatedBy,
        })
      );
      this.room.broadcast(JSON.stringify({ type: "card_updated", card }));
      return;
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
    await this.persist();

    this.room.broadcast(
      JSON.stringify({ type: "card_updated", card: updated, clientActionId: msg.clientActionId })
    );
    sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: true }));
  }

  private async handleAdd(
    msg: Extract<ClientMessage, { type: "add_card" }>,
    sender: Party.Connection
  ) {
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
    await this.persist();

    this.room.broadcast(
      JSON.stringify({ type: "card_added", card, clientActionId: msg.clientActionId })
    );
    sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: true }));
  }

  private async handleUpdate(
    msg: Extract<ClientMessage, { type: "update_card" }>,
    sender: Party.Connection
  ) {
    const card = this.cards.find((c) => c.id === msg.cardId);
    if (!card) {
      sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: false }));
      return;
    }

    if (card.version > msg.expectedVersion) {
      sender.send(
        JSON.stringify({
          type: "conflict",
          cardId: msg.cardId,
          card,
          clientActionId: msg.clientActionId,
          overwrittenBy: card.updatedBy,
        })
      );
      return;
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
    await this.persist();

    this.room.broadcast(
      JSON.stringify({ type: "card_updated", card: updated, clientActionId: msg.clientActionId })
    );
    sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: true }));
  }

  private async handleAddColumn(
    msg: Extract<ClientMessage, { type: "add_column" }>,
    sender: Party.Connection
  ) {
    const column: BoardColumn = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: msg.title,
      color: msg.color,
      order: this.columns.length,
      version: 1,
    };

    this.columns = [...this.columns, column];
    await this.persist();

    this.room.broadcast(
      JSON.stringify({ type: "column_added", column, clientActionId: msg.clientActionId })
    );
    sender.send(JSON.stringify({ type: "action_ack", clientActionId: msg.clientActionId, success: true }));
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

BoardServer satisfies Party.Worker;
