"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { CreateBoardModal } from "@/components/modals/CreateBoardModal";
import { Button } from "@/components/ui/Button";
import { KanbanPreview } from "./KanbanPreview";

const FEATURES = [
  {
    title: "Optimistic UI",
    desc: "Cards move instantly. Failed moves roll back with a clear toast.",
    color: "#6366F1",
    icon: "⚡",
  },
  {
    title: "Live presence",
    desc: "See who is in the room and collaborate without stepping on each other.",
    color: "#22D3EE",
    icon: "◎",
  },
  {
    title: "Conflict handling",
    desc: "Last-write-wins with feedback when two people edit the same card.",
    color: "#F59E0B",
    icon: "⟳",
  },
  {
    title: "Offline queue",
    desc: "Actions queue locally and sync when you reconnect.",
    color: "#10B981",
    icon: "↯",
  },
];

const STEPS = [
  { n: "01", label: "Create a board", detail: "Pick a template or start blank." },
  { n: "02", label: "Share the link", detail: "Anyone with the URL can join." },
  { n: "03", label: "Ship together", detail: "Drag cards, add lanes, stay in sync." },
];

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-base text-white">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="landing-orb landing-orb-a pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" aria-hidden />
      <div className="landing-orb landing-orb-b pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" aria-hidden />

      <header className="relative z-10 border-b border-subtle/80 bg-base/60 px-4 py-4 backdrop-blur-md sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo href="/" />
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            New board
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-16 pt-12 sm:px-6 md:px-10 md:pt-16">
          <div className="mb-10 max-w-full text-center">
            <div className="mx-auto flex max-w-full items-center justify-center gap-2 rounded-full border border-subtle bg-surface/60 px-3 py-1.5 backdrop-blur-sm sm:px-4">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted sm:text-[10px] sm:tracking-[0.25em]">
                Real-time collaboration demo
              </span>
            </div>
          </div>

          <div className="max-w-3xl text-center">
            <h1 className="font-display text-[clamp(2.5rem,8vw,4.5rem)] font-black uppercase leading-[0.92] tracking-tight">
              <span className="landing-shimmer bg-gradient-to-r from-white via-white to-muted bg-clip-text text-transparent">
                Ship together.
              </span>
              <span className="mt-1 block text-muted">In real time.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              A shared kanban board built to show optimistic UI, connection states,
              live presence, and the hard edges of multiplayer — not just REST forms.
            </p>

            <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              <Button
                className="w-full shadow-[0_0_40px_rgba(99,102,241,0.35)] sm:min-w-[200px] sm:w-auto"
                onClick={() => setModalOpen(true)}
              >
                Create a board
              </Button>
              <a
                href="#how-it-works"
                className="py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-accent sm:py-0"
              >
                How it works ↓
              </a>
            </div>
          </div>

          <div className="mt-14 w-full sm:mt-16">
            <KanbanPreview />
          </div>

          <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((item, i) => (
              <div
                key={item.title}
                className="landing-feature group rounded-xl border border-subtle bg-surface/50 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface/80"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-lg opacity-80">{item.icon}</span>
                  <span
                    className="h-1 w-8 rounded-full opacity-80 transition-all group-hover:w-12"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/80">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-subtle/80 bg-surface/30 px-4 py-14 sm:px-6 md:px-10"
        >
          <div className="mx-auto max-w-4xl">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
              How it works
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="rounded-xl border border-subtle bg-base/80 p-6 transition-colors hover:border-accent/25"
                >
                  <span className="font-display text-3xl text-accent/40">{step.n}</span>
                  <h3 className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
                    {step.label}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-subtle px-4 py-5 text-center sm:px-6 md:px-10">
        <p className="font-mono text-[10px] text-muted/60">
          Built by Oluwaseun Olugbewesa
        </p>
      </footer>

      <CreateBoardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
