"use client";

const LANES = [
  {
    title: "Todo",
    color: "#6366F1",
    cards: ["API contracts", "Design review"],
    delay: "0s",
  },
  {
    title: "Doing",
    color: "#F59E0B",
    cards: ["Optimistic UI"],
    delay: "0.15s",
  },
  {
    title: "Done",
    color: "#10B981",
    cards: ["Realtime sync", "Presence bar"],
    delay: "0.3s",
  },
];

export function KanbanPreview() {
  return (
    <div className="landing-preview relative mx-auto w-full max-w-3xl">
      <div className="absolute -inset-4 rounded-2xl bg-accent/10 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-subtle bg-surface/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              Live
            </span>
          </div>
          <div className="flex -space-x-2">
            {["#FF6B6B", "#4ECDC4", "#BB8FCE"].map((color, i) => (
              <span
                key={color}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface font-mono text-[8px] font-bold text-black"
                style={{ backgroundColor: color, animationDelay: `${i * 0.2}s` }}
              >
                {["S", "T", "A"][i]}
              </span>
            ))}
          </div>
        </div>

        <div className="scroll-touch -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {LANES.map((lane) => (
            <div
              key={lane.title}
              className="landing-lane w-[min(72vw,11rem)] shrink-0 snap-center rounded-xl border border-subtle bg-base/60 p-2.5 sm:w-auto"
              style={{ animationDelay: lane.delay }}
            >
              <div className="mb-2.5 flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/70">
                  {lane.title}
                </span>
              </div>
              <div className="space-y-2">
                {lane.cards.map((card, i) => (
                  <div
                    key={card}
                    className="landing-card rounded-lg border border-subtle border-l-[3px] bg-elevated px-2.5 py-2"
                    style={{
                      borderLeftColor: lane.color,
                      animationDelay: `${parseFloat(lane.delay) + i * 0.1}s`,
                    }}
                  >
                    <p className="text-[11px] font-medium leading-snug text-white/90">
                      {card}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
