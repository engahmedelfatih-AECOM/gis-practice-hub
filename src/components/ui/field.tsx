"use client";

import type { ReactNode } from "react";
import { Label } from "./input";
import { FieldError, useFieldInvalid } from "./form";

/** Label + control + hint + server-side error, wired for accessibility. */
export function Field({
  name,
  label,
  hint,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
  className?: string;
}) {
  const invalid = useFieldInvalid(name);
  const id = `f-${name}`;
  const describedBy =
    [hint ? `${id}-hint` : null, invalid ? `${name}-error` : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1">
        {label}
        {required ? <span className="text-status-danger"> *</span> : null}
      </Label>
      {children({ id, name, "aria-invalid": invalid, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
      <FieldError name={name} />
    </div>
  );
}
