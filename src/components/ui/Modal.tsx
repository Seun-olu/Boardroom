"use client";

import { useEffect } from "react";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (dismissible) onClose();
        }}
      />
      <div
        className={clsx(
          "relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col",
          "rounded-t-2xl border border-subtle bg-elevated shadow-glow",
          "pb-[max(0px,env(safe-area-inset-bottom))]",
          "sm:max-h-[90vh] sm:rounded-2xl",
          widths[size]
        )}
      >
        <div className="shrink-0 border-b border-subtle px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-subtle sm:hidden" aria-hidden />
          <h2
            id="modal-title"
            className="font-display text-base uppercase tracking-tight text-white sm:text-lg"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
