"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Aufklappbare Karte für die Parameter-Sidebar (Generator/Planer). Bündelt
 * verwandte Einstellungen visuell, damit die Leiste nicht als unstrukturierte
 * Liste von Reglern erscheint.
 */
export function CollapsibleSection({ title, badge, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-neutral-900/70"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-100">{title}</span>
          {badge !== undefined && badge !== "" && (
            <span className="shrink-0 rounded-full bg-crate-box/15 px-1.5 py-0.5 text-[10px] font-medium text-crate-box">
              {badge}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-800 px-3 pb-3 pt-3">{children}</div>}
    </section>
  );
}
