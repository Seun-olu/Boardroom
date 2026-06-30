import type { BoardColumn, BoardTemplate, Card } from "./types";

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "todo", title: "Todo", order: 0, color: "#3B82F6", version: 1 },
  { id: "doing", title: "Doing", order: 1, color: "#F59E0B", version: 1 },
  { id: "done", title: "Done", order: 2, color: "#10B981", version: 1 },
];

const SEED_CARDS: Card[] = [
  {
    id: "seed-1",
    title: "Define API contracts",
    description: "Document REST endpoints and WebSocket message shapes.",
    column: "todo",
    order: 0,
    priority: "high",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
  {
    id: "seed-2",
    title: "Build optimistic UI layer",
    description: "Cards move instantly, roll back on conflict.",
    column: "todo",
    order: 1,
    priority: "medium",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
  {
    id: "seed-3",
    title: "Wire up realtime sync",
    description: "Supabase Realtime with presence and conflict handling.",
    column: "doing",
    order: 0,
    priority: "urgent",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
  {
    id: "seed-4",
    title: "Ship the demo",
    description: "Deploy to Netlify + Supabase, write case study.",
    column: "done",
    order: 0,
    priority: "low",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
];

const SOFTWARE_COLUMNS: BoardColumn[] = [
  { id: "backlog", title: "Backlog", order: 0, color: "#6366F1", version: 1 },
  { id: "todo", title: "Todo", order: 1, color: "#3B82F6", version: 1 },
  { id: "doing", title: "In Progress", order: 2, color: "#F59E0B", version: 1 },
  { id: "review", title: "Review", order: 3, color: "#A855F7", version: 1 },
  { id: "done", title: "Done", order: 4, color: "#10B981", version: 1 },
];

const SOFTWARE_CARDS: Card[] = [
  {
    id: "sw-1",
    title: "User authentication flow",
    description: "OAuth + session management",
    column: "backlog",
    order: 0,
    priority: "high",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
  {
    id: "sw-2",
    title: "Dashboard widgets",
    description: "Charts and KPI cards",
    column: "todo",
    order: 0,
    priority: "medium",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
  {
    id: "sw-3",
    title: "API rate limiting",
    description: "Token bucket per user",
    column: "doing",
    order: 0,
    priority: "urgent",
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "system",
  },
];

export function getTemplateData(template: BoardTemplate): {
  columns: BoardColumn[];
  cards: Card[];
} {
  switch (template) {
    case "empty":
      return { columns: [...DEFAULT_COLUMNS], cards: [] };
    case "software":
      return { columns: [...SOFTWARE_COLUMNS], cards: [...SOFTWARE_CARDS] };
    default:
      return { columns: [...DEFAULT_COLUMNS], cards: [...SEED_CARDS] };
  }
}

export const TEMPLATE_OPTIONS: { id: BoardTemplate; label: string; desc: string }[] = [
  { id: "default", label: "Standard", desc: "Todo, Doing, Done with sample cards" },
  { id: "software", label: "Software", desc: "Backlog → Done workflow" },
  { id: "empty", label: "Empty", desc: "Columns only, no cards" },
];
