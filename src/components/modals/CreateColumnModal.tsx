"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COLUMN_COLORS } from "@/lib/types";
import clsx from "clsx";

interface CreateColumnModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, color: string) => void;
}

export function CreateColumnModal({ open, onClose, onSubmit }: CreateColumnModalProps) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLUMN_COLORS[0]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), color);
    setTitle("");
    setColor(COLUMN_COLORS[0]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New column"
      description="Add a workflow stage to your board."
      size="sm"
    >
      <div className="space-y-5">
        <Input
          id="col-title"
          label="Column name"
          placeholder="Review, Testing, Blocked..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
            Color
          </p>
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={clsx(
                  "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-white scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} type="button">
            Add column
          </Button>
        </div>
      </div>
    </Modal>
  );
}
