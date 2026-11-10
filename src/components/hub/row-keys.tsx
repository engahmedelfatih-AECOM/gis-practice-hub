"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * Keyboard travel for a long register table. The rows carry `data-row` and, when they can be
 * opened, `data-href`. One row is in the tab order at a time; Arrow Up and Down, Page Up and
 * Down, Home and End move between rows, Enter opens the row. Links inside a row keep working.
 */
export function RowKeys({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const row = e.target as HTMLElement;
    // Only when the row itself has the focus: a link or a field inside it keeps its own keys.
    if (!row.matches("tr[data-row]")) return;
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("tr[data-row]"));
    const at = rows.indexOf(row);
    let to = at;
    if (e.key === "ArrowDown") to = at + 1;
    else if (e.key === "ArrowUp") to = at - 1;
    else if (e.key === "PageDown") to = at + 10;
    else if (e.key === "PageUp") to = at - 10;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = rows.length - 1;
    else if (e.key === "Enter" && row.dataset.href) {
      e.preventDefault();
      router.push(row.dataset.href);
      return;
    } else return;
    e.preventDefault();
    const next = rows[Math.max(0, Math.min(rows.length - 1, to))];
    if (!next || next === row) return;
    row.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }

  return (
    <div className={className} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

/** One line under a register table, so the keys are not a secret. */
export function RowKeysHint() {
  return <p className="mt-2 text-xs text-gray-600">Keyboard: Tab to the table, Arrow keys or Page Up and Down to move between rows, Enter to open the row.</p>;
}
