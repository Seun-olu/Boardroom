import type { Card, Subtask } from "./types";

const CARD_DEFAULTS = {
  storyPoints: null as number | null,
  subtasks: [] as Subtask[],
};

export function templateCard(
  card: Omit<Card, "storyPoints" | "subtasks"> & {
    storyPoints?: number | null;
    subtasks?: Subtask[];
  }
): Card {
  return { ...CARD_DEFAULTS, ...card };
}
