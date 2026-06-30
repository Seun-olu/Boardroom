"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import type { Card, Priority } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import clsx from "clsx";

interface CardDetailDrawerProps {
  card: Card | null;
  columnColor: string;
  onClose: () => void;
  onSave: (data: {
    cardId: string;
    title: string;
    description: string;
    priority: Priority;
    expectedVersion: number;
  }) => void;
}

export function CardDetailDrawer({
  card,
  columnColor,
  onClose,
  onSave,
}: CardDetailDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
    }
  }, [card]);

  if (!card) return null;

  const handleSave = () => {
    onSave({
      cardId: card.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      expectedVersion: card.version,
    });
    onClose();
  };

  const priorityCfg = PRIORITY_CONFIG[priority];

  return (
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
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
        />

        <Select
          id="edit-priority"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          options={Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => ({
            value,
            label: cfg.label,
          }))}
        />

        <div className="flex items-center gap-2">
          <span className={clsx("h-2 w-2 rounded-full", priorityCfg.dot)} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {priorityCfg.label} priority
          </span>
        </div>

        <div className="rounded-lg border border-subtle bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Last updated
          </p>
          <p className="mt-1 text-sm text-white/70">
            {card.updatedBy} · {new Date(card.updatedAt).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()} type="button" className="flex-1">
            Save changes
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
