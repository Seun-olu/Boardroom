"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { generateRoomId } from "@/lib/board-utils";
import { TEMPLATE_OPTIONS } from "@/lib/templates";
import type { BoardTemplate } from "@/lib/types";

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBoardModal({ open, onClose }: CreateBoardModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<BoardTemplate>("blank");
  const [loading, setLoading] = useState(false);

  const previewSlug = name.trim() ? generateRoomId(name) : "my-board-xxxxxx";

  const handleCreate = () => {
    if (!name.trim()) return;
    setLoading(true);
    const roomId = generateRoomId(name);
    const params = new URLSearchParams({
      fresh: "1",
      name: name.trim(),
      template,
    });
    router.push(`/board/${roomId}?${params.toString()}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create board"
      description="Name your board and pick a template. Share the link to collaborate."
    >
      <div className="space-y-5">
        <Input
          id="board-name"
          label="Board name"
          placeholder="Sprint 12, Q1 Roadmap..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />

        <Dropdown
          id="template"
          label="Template"
          value={template}
          onChange={(v) => setTemplate(v as BoardTemplate)}
          options={TEMPLATE_OPTIONS.map((t) => ({
            value: t.id,
            label: `${t.label} — ${t.desc}`,
          }))}
        />

        <div className="rounded-xl border border-subtle bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Room URL</p>
          <p className="mt-1 truncate font-mono text-xs text-accent">
            /board/{previewSlug}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="ghost" onClick={onClose} type="button" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            type="button"
            className="w-full sm:w-auto"
          >
            {loading ? "Creating..." : "Create board"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
