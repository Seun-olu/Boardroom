"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

interface MenuPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

function useDismissOnOutside(
  open: boolean,
  onDismiss: () => void,
  refs: Array<React.RefObject<HTMLElement | null>>
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss, refs]);
}

function computeMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 6;
  const pad = 12;
  const preferredMax = Math.min(280, window.innerHeight * 0.55);

  const spaceBelow = window.innerHeight - rect.bottom - pad;
  const spaceAbove = rect.top - pad;

  const openBelow = spaceBelow >= spaceAbove || spaceBelow >= 140;
  const maxHeight = Math.min(preferredMax, openBelow ? spaceBelow - gap : spaceAbove - gap);

  const left = Math.max(pad, Math.min(rect.left, window.innerWidth - rect.width - pad));

  if (openBelow) {
    return {
      left,
      width: rect.width,
      top: rect.bottom + gap,
      maxHeight: Math.max(120, maxHeight),
    };
  }

  return {
    left,
    width: rect.width,
    bottom: window.innerHeight - rect.top + gap,
    maxHeight: Math.max(120, maxHeight),
  };
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
  const listboxId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  useDismissOnOutside(open, close, [rootRef, menuRef]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPosition(computeMenuPosition(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length, updatePosition]);

  const menu =
    open && menuPosition && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            style={{
              position: "fixed",
              left: menuPosition.left,
              width: menuPosition.width,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              maxHeight: menuPosition.maxHeight,
              zIndex: 100,
            }}
            className="overflow-auto rounded-xl border border-subtle bg-elevated py-1 shadow-xl shadow-black/50"
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
                      "flex min-h-[44px] w-full touch-manipulation items-start gap-2 px-4 py-3 text-left text-base sm:py-2.5 sm:text-sm",
                      isSelected
                        ? "bg-accent/15 text-white"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1 whitespace-normal leading-snug">
                      {option.label}
                    </span>
                    {isSelected && (
                      <svg
                        className="ml-1 mt-0.5 h-4 w-4 shrink-0 text-accent"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={clsx("relative flex flex-col gap-2", className)}>
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex min-h-[44px] w-full touch-manipulation items-center justify-between gap-2 rounded-xl border border-subtle bg-surface px-4 py-3 text-left text-base text-white sm:text-sm",
          "transition-colors hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30",
          open && "border-accent/50 ring-1 ring-accent/30",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon}
          <span className="line-clamp-2 leading-snug">{selected?.label ?? placeholder}</span>
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
      {menu}
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

  useDismissOnOutside(open, () => setOpen(false), [rootRef]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={LANE.menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-white sm:h-7 sm:w-7"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
        </svg>
      </button>
      {open && (
        <ul
          className={clsx(
            "absolute top-full z-[70] mt-1 min-w-[10rem] rounded-xl border border-subtle bg-elevated py-1 shadow-xl shadow-black/40",
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
                  "min-h-[44px] w-full touch-manipulation px-4 py-3 text-left text-sm sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs",
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
