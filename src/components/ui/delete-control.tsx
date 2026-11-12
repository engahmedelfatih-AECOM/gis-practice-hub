"use client";

import { useId } from "react";
import { Trash2 } from "lucide-react";
import { Tooltip } from "radix-ui";
import { Button } from "./button";
import { ConfirmSubmit } from "./confirm-submit";
import { cn } from "@/lib/cn";

/**
 * Delete for a record created by mistake (decision 2026-11-12). Always asks for confirmation.
 * When the record is in use the control is greyed out and says why, for example
 * "Used by 3 packages and 12 schema rows. Deactivate it instead." The server checks again.
 *
 * - `button`: the red Delete button next to Save and Cancel on an edit page.
 * - `icon`: the small bin at the end of a list or register row.
 */
export function DeleteControl({
  mode,
  name,
  usedBy,
  formId,
  description,
}: {
  mode: "button" | "icon";
  /** The record, as the user knows it ("Laheq Island", "Approved"). */
  name: string;
  /** Usage note, or null when the record may be deleted. */
  usedBy: string | null;
  /** The delete form, when the control sits inside another form. */
  formId?: string;
  /** Extra sentence for the confirmation. */
  description?: string;
}) {
  const noteId = useId();
  const confirm = `${name} will be deleted. ${description ? `${description} ` : ""}The audit log keeps a copy of what it held.`;

  if (mode === "button") {
    if (usedBy) {
      return (
        <span className="flex flex-wrap items-center gap-2">
          <Button variant="danger" disabled aria-describedby={noteId}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
          <span id={noteId} className="text-xs text-gray-600">
            {usedBy}
          </span>
        </span>
      );
    }
    return (
      <ConfirmSubmit
        formId={formId}
        title={`Delete ${name}?`}
        description={confirm}
        confirmLabel="Delete"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete
      </ConfirmSubmit>
    );
  }

  if (usedBy) {
    // Focusable but inert, so keyboard and screen reader users also learn why it cannot be deleted.
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-disabled="true"
            aria-label={`Cannot delete ${name}. ${usedBy}`}
            onClick={(e) => e.preventDefault()}
            className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-gray-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="left"
            sideOffset={6}
            className="bg-midnight-teal z-50 max-w-72 rounded-md px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            {usedBy}
            <Tooltip.Arrow className="fill-midnight-teal" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }
  return (
    <ConfirmSubmit
      formId={formId}
      variant="ghost"
      size="sm"
      aria-label={`Delete ${name}`}
      title={`Delete ${name}?`}
      description={confirm}
      confirmLabel="Delete"
      className={cn("text-brand-red-deep hover:bg-coral-orange-25 h-7 w-7 px-0")}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </ConfirmSubmit>
  );
}
