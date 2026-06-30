"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface JoinNameModalProps {
  open: boolean;
  boardName?: string;
  initialName?: string;
  onSubmit: (name: string) => void;
}

export function JoinNameModal({ open, boardName, initialName, onSubmit }: JoinNameModalProps) {
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setName("");
  };

  const isRename = Boolean(initialName?.trim());

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title={isRename ? "Change your name" : "Join the board"}
      description={
        isRename
          ? "This is how others will see you in the room."
          : boardName
            ? `Enter your name to collaborate on "${boardName}".`
            : "Enter your name so others know who you are in the room."
      }
      size="sm"
      dismissible={false}
    >
      <div className="space-y-4">
        <Input
          id="join-name"
          label="Your name"
          placeholder="Alex, Sam, Jordan..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={!name.trim()} type="button">
            {isRename ? "Save name" : "Join board"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
