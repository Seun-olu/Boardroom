"use client";

import { useState } from "react";
import { CreateBoardModal } from "@/components/modals/CreateBoardModal";
import { Button } from "@/components/ui/Button";

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-base text-white">
      <header className="border-b border-subtle px-6 py-5 md:px-10">
        <span className="font-display text-lg font-black uppercase tracking-tight">
          Boardroom
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            Real-time collaboration demo
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl">
            Ship together.
            <span className="block text-muted">In real time.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-muted">
            A shared kanban board with optimistic updates, draggable swimlanes,
            connection state handling, and conflict resolution.
          </p>

          <Button className="mt-10" onClick={() => setModalOpen(true)}>
            Create a board
          </Button>
        </div>

        <div className="mt-20 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { title: "Optimistic UI", desc: "Cards move instantly. Failed moves roll back with a toast.", color: "#6366F1" },
            { title: "Swimlanes", desc: "Add and reorder workflow lanes. Everyone sees them live.", color: "#22D3EE" },
            { title: "Conflict handling", desc: "Last-write-wins when two people edit the same card.", color: "#F59E0B" },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-subtle bg-surface p-6 text-left"
              style={{ borderTopColor: item.color, borderTopWidth: 2 }}
            >
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-subtle px-6 py-4 text-center md:px-10">
        <p className="font-mono text-[10px] text-muted/60">
          Built by Oluwaseun Olugbewesa
        </p>
      </footer>

      <CreateBoardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
