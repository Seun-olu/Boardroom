"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { LANE } from "@/lib/labels";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function Dropdown({
  label,
  value,
  onChange,
  options,
  id,
  disabled,
  placeholder = "Select…",
  className,
}: DropdownProps) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative flex flex-col gap-2", className)}>
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {label}
        </span>
      )}
      <button
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-subtle bg-surface px-4 py-3 text-left text-sm text-white",
          "transition-colors hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <svg
          className={clsx("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-subtle bg-elevated py-1 shadow-xl shadow-black/40"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-accent/15 text-white"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg className="ml-auto h-4 w-4 text-accent" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ActionMenuItem {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: "left" | "right";
}

export function ActionMenu({ items, align = "right" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={LANE.menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
        </svg>
      </button>
      {open && (
        <ul
          className={clsx(
            "absolute top-full z-50 mt-1 min-w-[140px] rounded-lg border border-subtle bg-elevated py-1 shadow-xl shadow-black/40",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={clsx(
                  "w-full px-3 py-2 text-left text-xs transition-colors",
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
