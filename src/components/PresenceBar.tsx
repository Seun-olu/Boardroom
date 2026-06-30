"use client";

import type { PresenceUser } from "@/lib/types";
import { getInitials } from "@/lib/username";

interface PresenceBarProps {
  users: PresenceUser[];
  currentUserName: string;
}

export function PresenceBar({ users, currentUserName }: PresenceBarProps) {
  if (users.length === 0) return null;

  return (
    <div className="relative z-30 flex items-center gap-3 overflow-visible">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        In room
      </span>
      <div className="flex overflow-visible -space-x-2">
        {users.map((user) => {
          const label =
            user.name + (user.name === currentUserName ? " (you)" : "");

          return (
            <div
              key={user.id}
              className="group/avatar relative z-30 overflow-visible"
            >
              <div
                aria-label={label}
                className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-black font-mono text-[10px] font-bold text-black transition-transform hover:z-20 hover:scale-110"
                style={{ backgroundColor: user.color }}
              >
                {getInitials(user.name)}
              </div>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-subtle bg-elevated px-2.5 py-1.5 font-mono text-[10px] text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/avatar:opacity-100"
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <span className="hidden font-mono text-[10px] text-white/50 sm:inline">
        {users.length} {users.length === 1 ? "person" : "people"}
      </span>
    </div>
  );
}
