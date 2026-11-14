"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceTabs({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/w/${workspaceId}`, label: "Boards" },
    { href: `/w/${workspaceId}/members`, label: "Members" },
  ];
  return (
    <nav aria-label="Workspace" className="mt-6 flex gap-1 border-b border-subtle">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-widest",
              active ? "border-accent text-white" : "border-transparent text-muted hover:text-white"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
