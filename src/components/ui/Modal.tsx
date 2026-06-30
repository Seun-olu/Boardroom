"use client";

import { useEffect, useRef } from "react";
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
  const overlayRef = useRef<HTMLDivElement>(null);

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

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (dismissible && e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={clsx(
          "relative w-full animate-in fade-in zoom-in-95 rounded-xl border border-subtle bg-elevated shadow-glow",
          widths[size]
        )}
      >
        <div className="border-b border-subtle px-6 py-5">
          <h2 id="modal-title" className="font-display text-lg uppercase tracking-tight text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
