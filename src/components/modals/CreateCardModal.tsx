"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import type { Priority } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
  columnTitle: string;
  onSubmit: (data: {
    title: string;
    description: string;
    priority: Priority;
  }) => void;
}

export function CreateCardModal({
  open,
  onClose,
  columnTitle,
  onSubmit,
}: CreateCardModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), priority });
    setTitle("");
    setDescription("");
    setPriority("medium");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New card"
      description={`Adding to ${columnTitle}`}
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
        <Select
          id="priority"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          options={Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => ({
            value,
            label: cfg.label,
          }))}
        />
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
