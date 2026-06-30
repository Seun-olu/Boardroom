"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { StoryPointsNote } from "@/components/StoryPointsNote";
import type { Card, Priority, Subtask } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import {
  STORY_POINT_DROPDOWN_OPTIONS,
  createSubtask,
  subtaskProgress,
} from "@/lib/story-points";

const PRIORITY_OPTIONS = (Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(
  ([value, cfg]) => ({
    value,
    label: cfg.label,
    icon: <span className={clsx("h-2 w-2 rounded-full", cfg.dot)} />,
  })
);

function storyPointsToDropdownValue(points: number | null): string {
  if (points === null) return "unset";
  return String(points);
}

function dropdownValueToStoryPoints(value: string): number | null {
  if (value === "unset") return null;
  return Number(value);
}

interface CardDetailDrawerProps {
  card: Card | null;
  columnColor: string;
  onClose: () => void;
  onSave: (data: {
    cardId: string;
    title: string;
    description: string;
    priority: Priority;
    storyPoints: number | null;
    subtasks: Subtask[];
    expectedVersion: number;
  }) => void;
  onDelete: (cardId: string, expectedVersion: number) => void;
}

export function CardDetailDrawer({
  card,
  columnColor,
  onClose,
  onSave,
  onDelete,
}: CardDetailDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [storyPoints, setStoryPoints] = useState<string>("unset");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
      setStoryPoints(storyPointsToDropdownValue(card.storyPoints));
      setSubtasks(card.subtasks ?? []);
      setNewSubtask("");
    }
  }, [card]);

  if (!card) return null;

  const handleSave = () => {
    onSave({
      cardId: card.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      storyPoints: dropdownValueToStoryPoints(storyPoints),
      subtasks,
      expectedVersion: card.version,
    });
    onClose();
  };

  const addSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [...prev, createSubtask(trimmed)]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const progress = subtaskProgress(subtasks);
  const priorityCfg = PRIORITY_CONFIG[priority];

  return (
    <>
      <Drawer open={!!card} onClose={onClose} title="Card details">
        <div className="space-y-5">
          <div
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: columnColor }}
          />

          <Input
            id="edit-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            id="edit-desc"
            label="Description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
          />

          <Dropdown
            id="edit-priority"
            label="Priority"
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
            options={PRIORITY_OPTIONS}
          />

          <div className="flex items-center gap-2">
            <span className={clsx("h-2 w-2 rounded-full", priorityCfg.dot)} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {priorityCfg.label} priority
            </span>
          </div>

          <Dropdown
            id="edit-story-points"
            label="Story points"
            value={storyPoints}
            onChange={setStoryPoints}
            options={STORY_POINT_DROPDOWN_OPTIONS}
          />

          <StoryPointsNote />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Subtasks
              </span>
              {progress.total > 0 && (
                <span className="font-mono text-[10px] text-muted">
                  {progress.done}/{progress.total} done
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <ul className="mb-3 space-y-2">
                {subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center gap-2 rounded-xl border border-subtle bg-surface px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtask(sub.id)}
                      className={clsx(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        sub.done
                          ? "border-accent bg-accent text-white"
                          : "border-muted/50 hover:border-accent/50"
                      )}
                      aria-label={sub.done ? "Mark incomplete" : "Mark complete"}
                    >
                      {sub.done && (
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={clsx(
                        "min-w-0 flex-1 text-sm",
                        sub.done ? "text-muted line-through" : "text-white/90"
                      )}
                    >
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(sub.id)}
                      className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-white/5 hover:text-red-400"
                      aria-label="Remove subtask"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="new-subtask"
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addSubtask}
                disabled={!newSubtask.trim()}
                className="w-full shrink-0 sm:w-auto sm:self-end"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-subtle bg-surface px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Last updated
            </p>
            <p className="mt-1 text-sm text-white/70">
              {card.updatedBy} · {new Date(card.updatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
            <Button
              variant="danger"
              onClick={() => setDeleteOpen(true)}
              type="button"
              className="w-full sm:shrink-0 sm:w-auto"
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={onClose} type="button" className="w-full sm:flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()} type="button" className="w-full sm:flex-1">
              Save
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete card?"
        description={`"${card.title}" will be removed for everyone on this board.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => onDelete(card.id, card.version)}
      />
    </>
  );
}
