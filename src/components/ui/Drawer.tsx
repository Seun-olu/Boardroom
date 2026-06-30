"use client";

import { useEffect } from "react";
import clsx from "clsx";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={clsx(
          "fixed z-[56] flex flex-col border-subtle bg-elevated shadow-2xl transition-transform duration-300 ease-out",
          "inset-x-0 bottom-0 h-[min(92dvh,820px)] w-full rounded-t-2xl border-t",
          "pb-[max(0px,env(safe-area-inset-bottom))]",
          "sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:h-full sm:max-w-md sm:rounded-l-2xl sm:border-l sm:border-t-0",
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-subtle px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-subtle sm:hidden" aria-hidden />
            <h2 className="truncate font-display text-sm uppercase tracking-tight text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-white touch-manipulation"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </aside>
    </>
  );
}
