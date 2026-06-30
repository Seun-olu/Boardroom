"use client";

import { useState } from "react";
import clsx from "clsx";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { StoryPointsNote } from "@/components/StoryPointsNote";
import type { Priority } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { STORY_POINT_DROPDOWN_OPTIONS } from "@/lib/story-points";

const PRIORITY_OPTIONS = (Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(
  ([value, cfg]) => ({
    value,
    label: cfg.label,
    icon: <span className={clsx("h-2 w-2 rounded-full", cfg.dot)} />,
  })
);

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
  laneTitle: string;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: Priority;
    storyPoints?: number | null;
  }) => void;
}

export function CreateCardModal({
  open,
  onClose,
  laneTitle,
  onSubmit,
}: CreateCardModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [storyPoints, setStoryPoints] = useState("unset");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      storyPoints: storyPoints === "unset" ? null : Number(storyPoints),
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStoryPoints("unset");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New card"
      description={`Adding to ${laneTitle}`}
      size="md"
    >
      <div className="space-y-4">
        <Input
          id="card-title"
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Textarea
          id="card-desc"
          label="Description"
          placeholder="Add context, acceptance criteria..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Dropdown
          id="priority"
          label="Priority"
          value={priority}
          onChange={(v) => setPriority(v as Priority)}
          options={PRIORITY_OPTIONS}
        />
        <Dropdown
          id="story-points"
          label="Story points"
          value={storyPoints}
          onChange={setStoryPoints}
          options={STORY_POINT_DROPDOWN_OPTIONS}
        />
        <StoryPointsNote />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} type="button">
            Create card
          </Button>
        </div>
      </div>
    </Modal>
  );
}
