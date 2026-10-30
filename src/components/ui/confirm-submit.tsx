"use client";

import { useRef, useState, type ComponentProps } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "./button";

/**
 * A submit button that asks for confirmation first (plan §12: confirm before
 * destructive or consequential actions). Place inside a <form>.
 */
export function ConfirmSubmit({
  title,
  description,
  confirmLabel = "Confirm",
  children,
  variant = "danger",
  ...props
}: ComponentProps<typeof Button> & { title: string; description: string; confirmLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)} {...props}>
        {children}
      </Button>
      <button ref={ref} type="submit" className="hidden" aria-hidden tabIndex={-1} />
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <AlertDialog.Content className="border-border bg-surface fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-xl">
            <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-gray-600">
              {description}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant={variant}
                  onClick={() => {
                    setOpen(false);
                    ref.current?.form?.requestSubmit();
                  }}
                >
                  {confirmLabel}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
