/** User-facing copy — workflow stages are called "lanes" in Boardroom. */
export const LANE = {
  singular: "Lane",
  plural: "Lanes",
  add: "Add lane",
  addShort: "+ Lane",
  new: "New lane",
  name: "Lane name",
  rename: "Rename lane",
  delete: "Delete lane",
  deleteTitle: "Delete lane?",
  deleteDescription: (title: string) =>
    `"${title}" and all its cards will be removed for everyone.`,
  emptyBoard: "No lanes yet",
  emptyHint: "Add a lane to get started.",
  dropCards: "Drop cards here",
  dragHint: "Drag to reorder",
  keepOne: "Keep at least one lane.",
  menuLabel: "Lane options",
} as const;
