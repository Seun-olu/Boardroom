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
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        In room
      </span>
      <div className="flex -space-x-2">
        {users.map((user) => (
          <div
            key={user.id}
            title={user.name + (user.name === currentUserName ? " (you)" : "")}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black font-mono text-[10px] font-bold text-black transition-transform hover:scale-110 hover:z-10"
            style={{ backgroundColor: user.color }}
          >
            {getInitials(user.name)}
          </div>
        ))}
      </div>
      <span className="hidden font-mono text-[10px] text-white/50 sm:inline">
        {users.length} {users.length === 1 ? "person" : "people"}
      </span>
    </div>
  );
}
