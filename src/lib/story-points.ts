import type { Card, Subtask } from "./types";

/** 1 story point = 8 hours of effort on this board. */
export const HOURS_PER_POINT = 8;

export const STORY_POINT_VALUES = [0, 0.5, 1, 2, 3, 5, 8, 13] as const;

export type StoryPointValue = (typeof STORY_POINT_VALUES)[number];

export function storyPointsToHours(points: number): number {
  return points * HOURS_PER_POINT;
}

export function formatStoryPointLabel(points: number): string {
  if (points === 0) return "0 — no effort";
  const hours = storyPointsToHours(points);
  if (hours === 4) return "0.5 — ~4 hours";
  if (hours === 8) return "1 — ~8 hours (1 day)";
  if (hours === 16) return "2 — ~16 hours (2 days)";
  if (hours === 24) return "3 — ~24 hours (3 days)";
  if (hours === 40) return "5 — ~40 hours (1 week)";
  if (hours % 8 === 0) return `${points} — ~${hours} hours (${hours / 8} days)`;
  return `${points} — ~${hours} hours`;
}

export function formatStoryPointShort(points: number): string {
  if (points === 0.5) return "½";
  return String(points);
}

export const STORY_POINT_DROPDOWN_OPTIONS = [
  { value: "unset", label: "Not estimated" },
  ...STORY_POINT_VALUES.filter((v) => v > 0).map((v) => ({
    value: String(v),
    label: formatStoryPointLabel(v),
  })),
];

export const STORY_POINTS_HELP = `Story points estimate relative effort — not hours logged. On this board, 1 point ≈ 8 hours (one work day). So 0.5 ≈ 4 hours, 1 ≈ 8 hours, 2 ≈ 16 hours, and so on. Use them to compare tasks and plan sprints.`;

export function normalizeCard(card: Card): Card {
  return {
    ...card,
    storyPoints: card.storyPoints ?? null,
    subtasks: Array.isArray(card.subtasks) ? card.subtasks : [],
  };
}

export function normalizeCards(cards: Card[]): Card[] {
  return cards.map(normalizeCard);
}

export function subtaskProgress(subtasks: Subtask[]): { done: number; total: number } {
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.done).length;
  return { done, total };
}

export function createSubtask(title: string): Subtask {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    done: false,
  };
}
