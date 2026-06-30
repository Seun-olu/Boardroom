"use client";

import clsx from "clsx";
import type { ConnectionState } from "@/lib/types";

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; dotClass: string; textClass: string }
> = {
  live: {
    label: "Live",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    textClass: "text-emerald-400",
  },
  reconnecting: {
    label: "Reconnecting",
    dotClass: "bg-amber-400 animate-pulse",
    textClass: "text-amber-400",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-red-500",
    textClass: "text-red-400",
  },
};

interface ConnectionStatusProps {
  state: ConnectionState;
  pendingCount?: number;
}

export function ConnectionStatus({ state, pendingCount = 0 }: ConnectionStatusProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-subtle bg-surface px-3 py-1.5">
      {pendingCount > 0 && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
          {pendingCount} queued
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className={clsx("h-2 w-2 rounded-full", config.dotClass)} />
        <span
          className={clsx(
            "font-mono text-[9px] font-semibold uppercase tracking-widest",
            config.textClass
          )}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}
